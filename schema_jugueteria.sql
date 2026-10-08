-- ============================================================================
-- JUGUETERÍA DB  |  Análisis II - Proyecto Final (Scrum)
-- Sistema de Gestión de Pedidos, Inventario y Ventas
-- Motor: MySQL 8.0.16+ / MariaDB 10.4+
--
-- CÓMO USAR DESDE LA APLICACIÓN
--   Después del login, en CADA conexión: SET @usuario_actual = <id_usuario>;
--   Sin esa variable, las operaciones auditadas se rechazan (trazabilidad).
--
-- REGLAS DE NEGOCIO DEL PDF Y DÓNDE SE EJECUTAN
--   RN01 No vender más que el inventario ........ trg_pdet_bi/bu, trg_vdet_bi, trg_mov_bi
--   RN02 Compra recibida aumenta inventario ..... trg_compras_au -> movimientos (ENTRADA)
--   RN03 Venta completada disminuye inventario .. trg_ventas_au  -> movimientos (SALIDA)
--   RN04 Producto con movimientos no se elimina . trg_productos_bd (usar activo = 0)
--   RN05 Correo único por usuario ............... UNIQUE usuarios.email
--   RN06 Venta sin productos no se completa ..... trg_ventas_bi / trg_ventas_bu
--   RN07 Descuento > límite requiere supervisor . sp_recalcular_pedido + trg_pedidos_bu
--   RN08 Venta finalizada no se modifica ........ trg_ventas_bu / trg_vdet_bu / bd
--   RN09 Pago <= saldo pendiente ................ trg_pagos_bi
--   RN10 Alerta al llegar al mínimo ............. trg_inventario_au -> alertas_inventario
--   Inventario no editable a mano ............... trg_inventario_bu (@inv_trigger)
-- ============================================================================

CREATE DATABASE IF NOT EXISTS jugueteria_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE jugueteria_db;
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ============================================================================
-- 1. USUARIOS, ROLES Y PERMISOS
-- ============================================================================
CREATE TABLE roles (
    id_rol INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE permisos (
    id_permiso INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(60) NOT NULL UNIQUE,      -- ej. 'pedidos.autorizar_descuento'
    modulo VARCHAR(40) NOT NULL,
    descripcion VARCHAR(255) NULL
) ENGINE=InnoDB;

CREATE TABLE rol_permisos (
    id_rol INT UNSIGNED NOT NULL,
    id_permiso INT UNSIGNED NOT NULL,
    PRIMARY KEY (id_rol, id_permiso),
    CONSTRAINT fk_rp_rol FOREIGN KEY (id_rol)
        REFERENCES roles (id_rol) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_rp_permiso FOREIGN KEY (id_permiso)
        REFERENCES permisos (id_permiso) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE usuarios (
    id_usuario INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_rol INT UNSIGNED NOT NULL,
    nombre_completo VARCHAR(120) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,                       -- RN05
    password_hash VARCHAR(255) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    ultimo_login DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_usuarios_roles FOREIGN KEY (id_rol)
        REFERENCES roles (id_rol) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Parámetros del negocio (ej. descuento máximo sin autorización)
CREATE TABLE configuraciones (
    clave VARCHAR(60) PRIMARY KEY,
    valor VARCHAR(255) NOT NULL,
    descripcion VARCHAR(255) NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================================
-- 2. CLIENTES Y PROVEEDORES
-- ============================================================================
CREATE TABLE clientes (
    id_cliente INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    identificacion VARCHAR(30) NULL UNIQUE,           -- NIT/DPI; NULL = consumidor final
    nombre_razon_social VARCHAR(150) NOT NULL,
    telefono VARCHAR(25) NULL,
    email VARCHAR(120) NULL,
    direccion TEXT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE proveedores (
    id_proveedor INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    identificacion_fiscal VARCHAR(30) NOT NULL UNIQUE,
    razon_social VARCHAR(150) NOT NULL,
    contacto_nombre VARCHAR(100) NULL,
    telefono VARCHAR(25) NULL,
    email VARCHAR(120) NULL,
    direccion TEXT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================================
-- 3. PRODUCTOS Y ESCALAS DE PRECIO (MENUDEO / MAYOREO)
-- ============================================================================
CREATE TABLE categorias (
    id_categoria INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL UNIQUE,
    descripcion VARCHAR(255) NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

CREATE TABLE marcas (
    id_marca INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE
) ENGINE=InnoDB;

CREATE TABLE productos (
    id_producto INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_categoria INT UNSIGNED NOT NULL,
    id_marca INT UNSIGNED NULL,
    codigo_sku VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT NULL,
    edad_minima_meses INT UNSIGNED NULL,              -- ej. 36 = 3 años
    advertencia_seguridad VARCHAR(255) NULL,          -- ej. 'Contiene piezas pequeñas'
    stock_minimo INT UNSIGNED NOT NULL DEFAULT 5,     -- RN10
    activo BOOLEAN NOT NULL DEFAULT TRUE,             -- RN04: baja lógica
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_productos_nombre (nombre),
    CONSTRAINT fk_productos_categorias FOREIGN KEY (id_categoria)
        REFERENCES categorias (id_categoria) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_productos_marcas FOREIGN KEY (id_marca)
        REFERENCES marcas (id_marca) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Precio POR NIVEL de cantidad de un mismo producto.
-- El nivel 1 es el precio de menudeo. No existe precio_base en productos.
-- Se aplica el nivel más alto cuya cantidad_minima sea <= cantidad pedida.
CREATE TABLE escalas_precio (
    id_escala INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_producto INT UNSIGNED NOT NULL,
    cantidad_minima INT UNSIGNED NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT chk_escala_nivel CHECK (cantidad_minima IN (1,3,6,12,25,50,100,500,1000,10000)),
    CONSTRAINT chk_escala_precio CHECK (precio_unitario > 0),
    CONSTRAINT uq_producto_nivel UNIQUE (id_producto, cantidad_minima),
    CONSTRAINT fk_escalas_producto FOREIGN KEY (id_producto)
        REFERENCES productos (id_producto) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 4. INVENTARIO, KARDEX Y ALERTAS
-- ============================================================================
CREATE TABLE inventario (
    id_producto INT UNSIGNED PRIMARY KEY,
    stock_actual INT UNSIGNED NOT NULL DEFAULT 0,
    ultima_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_inventario_producto FOREIGN KEY (id_producto)
        REFERENCES productos (id_producto) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- Única vía para cambiar el inventario. stock_anterior/posterior los calcula el trigger.
CREATE TABLE movimientos_inventario (
    id_movimiento BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_producto INT UNSIGNED NOT NULL,
    id_usuario INT UNSIGNED NOT NULL,
    tipo_movimiento ENUM('ENTRADA','SALIDA','AJUSTE','DEVOLUCION') NOT NULL,
    cantidad INT NOT NULL,                       -- positiva; en AJUSTE puede ser negativa
    stock_anterior INT NOT NULL DEFAULT 0,
    stock_posterior INT NOT NULL DEFAULT 0,
    documento_tipo VARCHAR(30) NOT NULL,         -- 'COMPRA','VENTA','AJUSTE_FISICO'
    documento_id VARCHAR(50) NOT NULL,           -- numero_comprobante / numero_factura
    motivo VARCHAR(255) NOT NULL,
    fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_mov_producto (id_producto),
    INDEX idx_mov_fecha (fecha_hora),
    INDEX idx_mov_documento (documento_tipo, documento_id),
    CONSTRAINT fk_mov_producto FOREIGN KEY (id_producto)
        REFERENCES productos (id_producto) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_mov_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuarios (id_usuario) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE alertas_inventario (
    id_alerta INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_producto INT UNSIGNED NOT NULL,
    stock_al_generar INT NOT NULL,
    stock_minimo INT UNSIGNED NOT NULL,
    estado ENUM('ACTIVA','ATENDIDA') NOT NULL DEFAULT 'ACTIVA',
    fecha_generacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_atencion DATETIME NULL,
    INDEX idx_alertas_estado (estado),
    CONSTRAINT fk_alertas_producto FOREIGN KEY (id_producto)
        REFERENCES productos (id_producto) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================================================
-- 5. COMPRAS
-- ============================================================================
CREATE TABLE compras (
    id_compra INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    numero_comprobante VARCHAR(50) NOT NULL UNIQUE,
    id_proveedor INT UNSIGNED NOT NULL,
    id_usuario INT UNSIGNED NOT NULL,                 -- quien registra
    id_usuario_recepcion INT UNSIGNED NULL,           -- quien recibe la mercadería
    estado ENUM('REGISTRADA','RECIBIDA','ANULADA') NOT NULL DEFAULT 'REGISTRADA',
    total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    observaciones VARCHAR(255) NULL,
    fecha_compra DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_recepcion DATETIME NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_compras_fecha (fecha_compra),
    CONSTRAINT fk_compras_proveedor FOREIGN KEY (id_proveedor)
        REFERENCES proveedores (id_proveedor) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_compras_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuarios (id_usuario) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_compras_usuario_rec FOREIGN KEY (id_usuario_recepcion)
        REFERENCES usuarios (id_usuario) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE compras_detalle (
    id_compra_detalle BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_compra INT UNSIGNED NOT NULL,
    id_producto INT UNSIGNED NOT NULL,
    cantidad INT UNSIGNED NOT NULL,
    costo_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(12,2) GENERATED ALWAYS AS (cantidad * costo_unitario) STORED,
    CONSTRAINT chk_cd_cantidad CHECK (cantidad > 0),
    CONSTRAINT chk_cd_costo CHECK (costo_unitario > 0),
    CONSTRAINT uq_compra_producto UNIQUE (id_compra, id_producto),
    CONSTRAINT fk_cd_compra FOREIGN KEY (id_compra)
        REFERENCES compras (id_compra) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_cd_producto FOREIGN KEY (id_producto)
        REFERENCES productos (id_producto) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================================================
-- 6. PEDIDOS (estados exactos del PDF)
-- ============================================================================
CREATE TABLE pedidos (
    id_pedido INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    numero_pedido VARCHAR(50) NOT NULL UNIQUE,
    id_cliente INT UNSIGNED NOT NULL,
    id_usuario_vendedor INT UNSIGNED NOT NULL,
    id_usuario_supervisor INT UNSIGNED NULL,          -- quien autoriza el descuento
    estado ENUM('CREADO','PENDIENTE_APROBACION','APROBADO','EN_PROCESO','COMPLETADO','CANCELADO')
        NOT NULL DEFAULT 'CREADO',
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,         -- suma a precio de escala
    descuento_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,  -- solo descuentos extra
    total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    requiere_autorizacion BOOLEAN NOT NULL DEFAULT FALSE, -- RN07
    motivo_descuento_especial VARCHAR(255) NULL,
    observaciones VARCHAR(255) NULL,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_autorizacion DATETIME NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_pedidos_estado (estado),
    INDEX idx_pedidos_fecha (fecha_creacion),
    CONSTRAINT fk_pedidos_cliente FOREIGN KEY (id_cliente)
        REFERENCES clientes (id_cliente) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_pedidos_vendedor FOREIGN KEY (id_usuario_vendedor)
        REFERENCES usuarios (id_usuario) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_pedidos_supervisor FOREIGN KEY (id_usuario_supervisor)
        REFERENCES usuarios (id_usuario) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- precio_escala y subtotal los calcula el trigger a partir de escalas_precio.
CREATE TABLE pedidos_detalle (
    id_pedido_detalle BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_pedido INT UNSIGNED NOT NULL,
    id_producto INT UNSIGNED NOT NULL,
    id_escala_aplicada INT UNSIGNED NULL,
    cantidad INT UNSIGNED NOT NULL,
    precio_escala DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    porcentaje_descuento_extra DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    monto_descuento_extra DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    CONSTRAINT chk_pd_cantidad CHECK (cantidad > 0),
    CONSTRAINT chk_pd_desc CHECK (porcentaje_descuento_extra >= 0 AND porcentaje_descuento_extra <= 100),
    CONSTRAINT uq_pedido_producto UNIQUE (id_pedido, id_producto),
    CONSTRAINT fk_pdet_pedido FOREIGN KEY (id_pedido)
        REFERENCES pedidos (id_pedido) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_pdet_producto FOREIGN KEY (id_producto)
        REFERENCES productos (id_producto) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_pdet_escala FOREIGN KEY (id_escala_aplicada)
        REFERENCES escalas_precio (id_escala) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================================================
-- 7. VENTAS Y PAGOS
-- ============================================================================
CREATE TABLE ventas (
    id_venta INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    numero_factura VARCHAR(50) NOT NULL UNIQUE,
    id_pedido INT UNSIGNED NOT NULL UNIQUE,           -- 1 pedido = 1 venta
    id_usuario INT UNSIGNED NOT NULL,                 -- quien registra la venta
    estado ENUM('PENDIENTE','COMPLETADA','ANULADA') NOT NULL DEFAULT 'PENDIENTE',
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    descuento DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    saldo_pendiente DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    fecha_venta DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_ventas_fecha (fecha_venta),
    INDEX idx_ventas_estado (estado),
    CONSTRAINT fk_ventas_pedido FOREIGN KEY (id_pedido)
        REFERENCES pedidos (id_pedido) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_ventas_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuarios (id_usuario) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE ventas_detalle (
    id_venta_detalle BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_venta INT UNSIGNED NOT NULL,
    id_producto INT UNSIGNED NOT NULL,
    cantidad INT UNSIGNED NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    descuento_aplicado DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    subtotal DECIMAL(12,2) NOT NULL,
    CONSTRAINT fk_vdet_venta FOREIGN KEY (id_venta)
        REFERENCES ventas (id_venta) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_vdet_producto FOREIGN KEY (id_producto)
        REFERENCES productos (id_producto) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE pagos (
    id_pago INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    numero_recibo VARCHAR(50) NOT NULL UNIQUE,
    id_venta INT UNSIGNED NOT NULL,
    id_usuario INT UNSIGNED NOT NULL,
    monto DECIMAL(12,2) NOT NULL,
    metodo_pago ENUM('EFECTIVO','TARJETA_DEBITO','TARJETA_CREDITO','TRANSFERENCIA') NOT NULL,
    referencia_pago VARCHAR(100) NULL,
    fecha_pago DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_pago_monto CHECK (monto > 0),
    CONSTRAINT fk_pagos_venta FOREIGN KEY (id_venta)
        REFERENCES ventas (id_venta) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_pagos_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuarios (id_usuario) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================================================
-- 8. AUDITORÍA (se llena sola mediante triggers; no se edita ni se borra)
-- ============================================================================
CREATE TABLE auditoria (
    id_auditoria BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT UNSIGNED NOT NULL,
    modulo VARCHAR(50) NOT NULL,        -- 'Productos', 'Pedidos', ...
    accion VARCHAR(50) NOT NULL,        -- 'Creación', 'Modificación', 'Autorización', ...
    id_registro VARCHAR(50) NOT NULL,   -- ej. 'PROD-025'
    detalle_anterior JSON NULL,
    detalle_nuevo JSON NULL,
    ip_origen VARCHAR(45) NULL,
    fecha_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_aud_registro (modulo, id_registro),
    INDEX idx_aud_fecha (fecha_hora),
    INDEX idx_aud_usuario (id_usuario),
    CONSTRAINT fk_auditoria_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuarios (id_usuario) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ============================================================================
-- 9. FUNCIONES Y PROCEDIMIENTOS
-- ============================================================================
DELIMITER $$

CREATE FUNCTION fn_usuario_actual() RETURNS INT UNSIGNED
NOT DETERMINISTIC NO SQL
BEGIN
    IF @usuario_actual IS NULL THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Sesion sin usuario: ejecute SET @usuario_actual = id_usuario';
    END IF;
    RETURN @usuario_actual;
END$$

CREATE FUNCTION fn_tiene_permiso(p_id_usuario INT UNSIGNED, p_codigo VARCHAR(60))
RETURNS TINYINT(1)
NOT DETERMINISTIC READS SQL DATA
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM usuarios u
        JOIN rol_permisos rp ON rp.id_rol = u.id_rol
        JOIN permisos p ON p.id_permiso = rp.id_permiso
        WHERE u.id_usuario = p_id_usuario AND u.activo = 1 AND p.codigo = p_codigo
    );
END$$

CREATE FUNCTION fn_descuento_max() RETURNS DECIMAL(5,2)
NOT DETERMINISTIC READS SQL DATA
BEGIN
    DECLARE v DECIMAL(5,2) DEFAULT 0;
    SELECT CAST(valor AS DECIMAL(5,2)) INTO v
    FROM configuraciones WHERE clave = 'DESCUENTO_MAX_SIN_AUTORIZACION';
    RETURN COALESCE(v, 0);
END$$

-- Nivel de escala aplicable: el mayor cantidad_minima <= cantidad
CREATE FUNCTION fn_escala_id(p_id_producto INT UNSIGNED, p_cantidad INT UNSIGNED)
RETURNS INT UNSIGNED
NOT DETERMINISTIC READS SQL DATA
BEGIN
    DECLARE v INT UNSIGNED DEFAULT NULL;
    SELECT id_escala INTO v
    FROM escalas_precio
    WHERE id_producto = p_id_producto AND activo = 1 AND cantidad_minima <= p_cantidad
    ORDER BY cantidad_minima DESC
    LIMIT 1;
    RETURN v;
END$$

CREATE PROCEDURE sp_auditar(
    IN p_modulo VARCHAR(50), IN p_accion VARCHAR(50), IN p_registro VARCHAR(50),
    IN p_anterior JSON, IN p_nuevo JSON)
BEGIN
    INSERT INTO auditoria (id_usuario, modulo, accion, id_registro, detalle_anterior, detalle_nuevo, ip_origen)
    VALUES (fn_usuario_actual(), p_modulo, p_accion, p_registro, p_anterior, p_nuevo, @ip_origen);
END$$

CREATE PROCEDURE sp_recalcular_pedido(IN p_id_pedido INT UNSIGNED)
BEGIN
    DECLARE v_sub DECIMAL(12,2);
    DECLARE v_desc DECIMAL(12,2);
    DECLARE v_req TINYINT;
    SELECT COALESCE(SUM(cantidad * precio_escala), 0),
           COALESCE(SUM(monto_descuento_extra), 0),
           COALESCE(MAX(porcentaje_descuento_extra > fn_descuento_max()), 0)
      INTO v_sub, v_desc, v_req
    FROM pedidos_detalle WHERE id_pedido = p_id_pedido;

    UPDATE pedidos
       SET subtotal = v_sub, descuento_total = v_desc,
           total = v_sub - v_desc, requiere_autorizacion = v_req
     WHERE id_pedido = p_id_pedido;
END$$

CREATE PROCEDURE sp_recalcular_compra(IN p_id_compra INT UNSIGNED)
BEGIN
    UPDATE compras
       SET total = (SELECT COALESCE(SUM(subtotal), 0) FROM compras_detalle WHERE id_compra = p_id_compra)
     WHERE id_compra = p_id_compra;
END$$

-- CREADO -> PENDIENTE_APROBACION (si hay descuento sobre el límite) o APROBADO
CREATE PROCEDURE sp_enviar_pedido(IN p_id_pedido INT UNSIGNED)
BEGIN
    DECLARE v_req TINYINT;
    CALL sp_recalcular_pedido(p_id_pedido);
    SELECT requiere_autorizacion INTO v_req FROM pedidos WHERE id_pedido = p_id_pedido;
    UPDATE pedidos
       SET estado = IF(v_req = 1, 'PENDIENTE_APROBACION', 'APROBADO')
     WHERE id_pedido = p_id_pedido AND estado = 'CREADO';
    IF ROW_COUNT() = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Solo un pedido en estado CREADO puede enviarse';
    END IF;
END$$

-- PENDIENTE_APROBACION -> APROBADO por un supervisor con permiso
CREATE PROCEDURE sp_autorizar_pedido(
    IN p_id_pedido INT UNSIGNED, IN p_id_supervisor INT UNSIGNED, IN p_motivo VARCHAR(255))
BEGIN
    UPDATE pedidos
       SET estado = 'APROBADO', id_usuario_supervisor = p_id_supervisor,
           motivo_descuento_especial = p_motivo
     WHERE id_pedido = p_id_pedido AND estado = 'PENDIENTE_APROBACION';
    IF ROW_COUNT() = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El pedido no esta pendiente de aprobacion';
    END IF;
END$$

-- ============================================================================
-- 10. TRIGGERS: USUARIOS, CLIENTES, CONFIGURACIONES (solo auditoría)
-- ============================================================================
CREATE TRIGGER trg_usuarios_ai AFTER INSERT ON usuarios FOR EACH ROW
BEGIN
    CALL sp_auditar('Usuarios', 'Creación', CONCAT('USR-', NEW.id_usuario), NULL,
        JSON_OBJECT('email', NEW.email, 'id_rol', NEW.id_rol, 'activo', NEW.activo));
END$$

CREATE TRIGGER trg_usuarios_au AFTER UPDATE ON usuarios FOR EACH ROW
BEGIN
    IF NOT (OLD.email <=> NEW.email AND OLD.id_rol <=> NEW.id_rol AND OLD.activo <=> NEW.activo
            AND OLD.nombre_completo <=> NEW.nombre_completo) THEN
        CALL sp_auditar('Usuarios', 'Modificación', CONCAT('USR-', NEW.id_usuario),
            JSON_OBJECT('email', OLD.email, 'id_rol', OLD.id_rol, 'activo', OLD.activo),
            JSON_OBJECT('email', NEW.email, 'id_rol', NEW.id_rol, 'activo', NEW.activo));
    END IF;
END$$

CREATE TRIGGER trg_clientes_ai AFTER INSERT ON clientes FOR EACH ROW
BEGIN
    CALL sp_auditar('Clientes', 'Creación', CONCAT('CLI-', NEW.id_cliente), NULL,
        JSON_OBJECT('nombre', NEW.nombre_razon_social, 'identificacion', NEW.identificacion));
END$$

CREATE TRIGGER trg_clientes_au AFTER UPDATE ON clientes FOR EACH ROW
BEGIN
    CALL sp_auditar('Clientes', 'Modificación', CONCAT('CLI-', NEW.id_cliente),
        JSON_OBJECT('nombre', OLD.nombre_razon_social, 'identificacion', OLD.identificacion, 'activo', OLD.activo),
        JSON_OBJECT('nombre', NEW.nombre_razon_social, 'identificacion', NEW.identificacion, 'activo', NEW.activo));
END$$

CREATE TRIGGER trg_config_au AFTER UPDATE ON configuraciones FOR EACH ROW
BEGIN
    CALL sp_auditar('Configuración', 'Modificación', NEW.clave,
        JSON_OBJECT('valor', OLD.valor), JSON_OBJECT('valor', NEW.valor));
END$$

-- ============================================================================
-- 11. TRIGGERS: PRODUCTOS Y ESCALAS
-- ============================================================================
CREATE TRIGGER trg_productos_ai AFTER INSERT ON productos FOR EACH ROW
BEGIN
    INSERT INTO inventario (id_producto, stock_actual) VALUES (NEW.id_producto, 0);
    CALL sp_auditar('Productos', 'Creación', NEW.codigo_sku, NULL,
        JSON_OBJECT('nombre', NEW.nombre, 'id_categoria', NEW.id_categoria,
                    'stock_minimo', NEW.stock_minimo, 'activo', NEW.activo));
END$$

CREATE TRIGGER trg_productos_au AFTER UPDATE ON productos FOR EACH ROW
BEGIN
    CALL sp_auditar('Productos', 'Modificación', NEW.codigo_sku,
        JSON_OBJECT('nombre', OLD.nombre, 'id_categoria', OLD.id_categoria,
                    'stock_minimo', OLD.stock_minimo, 'activo', OLD.activo),
        JSON_OBJECT('nombre', NEW.nombre, 'id_categoria', NEW.id_categoria,
                    'stock_minimo', NEW.stock_minimo, 'activo', NEW.activo));
END$$

-- RN04: con movimientos o documentos no se elimina; se inactiva
CREATE TRIGGER trg_productos_bd BEFORE DELETE ON productos FOR EACH ROW
BEGIN
    IF EXISTS (SELECT 1 FROM movimientos_inventario WHERE id_producto = OLD.id_producto)
       OR EXISTS (SELECT 1 FROM compras_detalle WHERE id_producto = OLD.id_producto)
       OR EXISTS (SELECT 1 FROM pedidos_detalle WHERE id_producto = OLD.id_producto)
       OR EXISTS (SELECT 1 FROM ventas_detalle WHERE id_producto = OLD.id_producto) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Producto con movimientos: no se elimina, debe pasar a estado inactivo';
    END IF;
END$$

-- El precio no puede subir al aumentar el nivel de cantidad
CREATE TRIGGER trg_escalas_bi BEFORE INSERT ON escalas_precio FOR EACH ROW
BEGIN
    IF NEW.activo = 1 AND (
        EXISTS (SELECT 1 FROM escalas_precio WHERE id_producto = NEW.id_producto AND activo = 1
                AND cantidad_minima < NEW.cantidad_minima AND precio_unitario < NEW.precio_unitario)
        OR EXISTS (SELECT 1 FROM escalas_precio WHERE id_producto = NEW.id_producto AND activo = 1
                AND cantidad_minima > NEW.cantidad_minima AND precio_unitario > NEW.precio_unitario)) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El precio de un nivel mayor no puede superar al de un nivel menor';
    END IF;
END$$

CREATE TRIGGER trg_escalas_bu BEFORE UPDATE ON escalas_precio FOR EACH ROW
BEGIN
    IF NEW.activo = 1 AND (
        EXISTS (SELECT 1 FROM escalas_precio WHERE id_producto = NEW.id_producto AND activo = 1
                AND id_escala <> NEW.id_escala
                AND cantidad_minima < NEW.cantidad_minima AND precio_unitario < NEW.precio_unitario)
        OR EXISTS (SELECT 1 FROM escalas_precio WHERE id_producto = NEW.id_producto AND activo = 1
                AND id_escala <> NEW.id_escala
                AND cantidad_minima > NEW.cantidad_minima AND precio_unitario > NEW.precio_unitario)) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El precio de un nivel mayor no puede superar al de un nivel menor';
    END IF;
END$$

-- ============================================================================
-- 12. TRIGGERS: INVENTARIO Y MOVIMIENTOS (kardex)
-- ============================================================================
-- Único punto que modifica el inventario. RN01 / RN02 / RN03.
CREATE TRIGGER trg_mov_bi BEFORE INSERT ON movimientos_inventario FOR EACH ROW
BEGIN
    DECLARE v_stock INT DEFAULT NULL;
    DECLARE v_nuevo INT;
    DECLARE v_delta INT;

    SELECT stock_actual INTO v_stock FROM inventario
     WHERE id_producto = NEW.id_producto FOR UPDATE;

    IF v_stock IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El producto no tiene registro de inventario';
    END IF;
    IF NEW.cantidad = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La cantidad del movimiento no puede ser cero';
    END IF;
    IF NEW.tipo_movimiento <> 'AJUSTE' AND NEW.cantidad < 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La cantidad debe ser positiva (solo AJUSTE admite negativos)';
    END IF;
    IF NEW.tipo_movimiento = 'AJUSTE' AND fn_tiene_permiso(NEW.id_usuario, 'inventario.ajustar') = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El usuario no tiene permiso para ajustar inventario';
    END IF;

    SET v_delta = IF(NEW.tipo_movimiento = 'SALIDA', -NEW.cantidad, NEW.cantidad);
    SET v_nuevo = v_stock + v_delta;

    IF v_nuevo < 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Inventario insuficiente: la operacion dejaria existencias negativas';
    END IF;

    SET NEW.stock_anterior = v_stock;
    SET NEW.stock_posterior = v_nuevo;

    SET @inv_trigger = 1;
    UPDATE inventario SET stock_actual = v_nuevo WHERE id_producto = NEW.id_producto;
    SET @inv_trigger = NULL;
END$$

CREATE TRIGGER trg_mov_bu BEFORE UPDATE ON movimientos_inventario FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Los movimientos de inventario no pueden modificarse';
END$$

CREATE TRIGGER trg_mov_bd BEFORE DELETE ON movimientos_inventario FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Los movimientos de inventario no pueden eliminarse';
END$$

CREATE TRIGGER trg_inventario_bu BEFORE UPDATE ON inventario FOR EACH ROW
BEGIN
    IF @inv_trigger IS NULL OR @inv_trigger <> 1 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El inventario no puede modificarse manualmente: registre un movimiento';
    END IF;
END$$

CREATE TRIGGER trg_inventario_bd BEFORE DELETE ON inventario FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El inventario no puede eliminarse manualmente';
END$$

-- RN10: alerta al llegar al nivel mínimo; se cierra al recuperar stock
CREATE TRIGGER trg_inventario_au AFTER UPDATE ON inventario FOR EACH ROW
BEGIN
    DECLARE v_min INT UNSIGNED;
    SELECT stock_minimo INTO v_min FROM productos WHERE id_producto = NEW.id_producto;

    IF NEW.stock_actual <= v_min THEN
        IF NOT EXISTS (SELECT 1 FROM alertas_inventario
                        WHERE id_producto = NEW.id_producto AND estado = 'ACTIVA') THEN
            INSERT INTO alertas_inventario (id_producto, stock_al_generar, stock_minimo)
            VALUES (NEW.id_producto, NEW.stock_actual, v_min);
        END IF;
    ELSE
        UPDATE alertas_inventario
           SET estado = 'ATENDIDA', fecha_atencion = NOW()
         WHERE id_producto = NEW.id_producto AND estado = 'ACTIVA';
    END IF;
END$$

-- ============================================================================
-- 13. TRIGGERS: COMPRAS
-- ============================================================================
CREATE TRIGGER trg_compras_bi BEFORE INSERT ON compras FOR EACH ROW
BEGIN
    IF fn_tiene_permiso(NEW.id_usuario, 'compras.registrar') = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El usuario no tiene permiso para registrar compras';
    END IF;
    SET NEW.estado = 'REGISTRADA';
END$$

CREATE TRIGGER trg_compras_bu BEFORE UPDATE ON compras FOR EACH ROW
BEGIN
    IF OLD.estado IN ('RECIBIDA', 'ANULADA') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Una compra RECIBIDA o ANULADA no puede modificarse';
    END IF;
    IF NEW.estado = 'RECIBIDA' THEN
        IF NOT EXISTS (SELECT 1 FROM compras_detalle WHERE id_compra = OLD.id_compra) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No se puede recibir una compra sin productos';
        END IF;
        IF NEW.id_usuario_recepcion IS NULL
           OR fn_tiene_permiso(NEW.id_usuario_recepcion, 'compras.recibir') = 0 THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'La recepcion requiere un usuario con permiso compras.recibir';
        END IF;
        SET NEW.fecha_recepcion = NOW();
    END IF;
END$$

CREATE TRIGGER trg_compras_bd BEFORE DELETE ON compras FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Las compras no se eliminan; use el estado ANULADA';
END$$

CREATE TRIGGER trg_compras_ai AFTER INSERT ON compras FOR EACH ROW
BEGIN
    CALL sp_auditar('Compras', 'Creación', NEW.numero_comprobante, NULL,
        JSON_OBJECT('id_proveedor', NEW.id_proveedor, 'estado', NEW.estado));
END$$

-- RN02: al recibir la compra se generan las ENTRADAS de inventario
CREATE TRIGGER trg_compras_au AFTER UPDATE ON compras FOR EACH ROW
BEGIN
    IF OLD.estado = 'REGISTRADA' AND NEW.estado = 'RECIBIDA' THEN
        INSERT INTO movimientos_inventario
            (id_producto, id_usuario, tipo_movimiento, cantidad, documento_tipo, documento_id, motivo)
        SELECT id_producto, NEW.id_usuario_recepcion, 'ENTRADA', cantidad,
               'COMPRA', NEW.numero_comprobante, 'Recepcion de compra'
        FROM compras_detalle WHERE id_compra = NEW.id_compra;
    END IF;
    IF OLD.estado <> NEW.estado THEN
        CALL sp_auditar('Compras', IF(NEW.estado = 'RECIBIDA', 'Recepción', 'Anulación'),
            NEW.numero_comprobante,
            JSON_OBJECT('estado', OLD.estado),
            JSON_OBJECT('estado', NEW.estado, 'total', NEW.total));
    END IF;
END$$

CREATE TRIGGER trg_cdet_bi BEFORE INSERT ON compras_detalle FOR EACH ROW
BEGIN
    DECLARE v_estado VARCHAR(20);
    DECLARE v_activo TINYINT;
    SELECT estado INTO v_estado FROM compras WHERE id_compra = NEW.id_compra;
    IF v_estado <> 'REGISTRADA' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Solo se modifica el detalle de una compra REGISTRADA';
    END IF;
    SELECT activo INTO v_activo FROM productos WHERE id_producto = NEW.id_producto;
    IF v_activo = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No se puede comprar un producto inactivo';
    END IF;
END$$

CREATE TRIGGER trg_cdet_bu BEFORE UPDATE ON compras_detalle FOR EACH ROW
BEGIN
    DECLARE v_estado VARCHAR(20);
    SELECT estado INTO v_estado FROM compras WHERE id_compra = OLD.id_compra;
    IF v_estado <> 'REGISTRADA' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Solo se modifica el detalle de una compra REGISTRADA';
    END IF;
END$$

CREATE TRIGGER trg_cdet_bd BEFORE DELETE ON compras_detalle FOR EACH ROW
BEGIN
    DECLARE v_estado VARCHAR(20);
    SELECT estado INTO v_estado FROM compras WHERE id_compra = OLD.id_compra;
    IF v_estado <> 'REGISTRADA' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Solo se modifica el detalle de una compra REGISTRADA';
    END IF;
END$$

CREATE TRIGGER trg_cdet_ai AFTER INSERT ON compras_detalle FOR EACH ROW
BEGIN
    CALL sp_recalcular_compra(NEW.id_compra);
END$$

CREATE TRIGGER trg_cdet_au AFTER UPDATE ON compras_detalle FOR EACH ROW
BEGIN
    CALL sp_recalcular_compra(NEW.id_compra);
END$$

CREATE TRIGGER trg_cdet_ad AFTER DELETE ON compras_detalle FOR EACH ROW
BEGIN
    CALL sp_recalcular_compra(OLD.id_compra);
END$$

-- ============================================================================
-- 14. TRIGGERS: PEDIDOS
-- ============================================================================
CREATE TRIGGER trg_pedidos_bi BEFORE INSERT ON pedidos FOR EACH ROW
BEGIN
    IF fn_tiene_permiso(NEW.id_usuario_vendedor, 'pedidos.crear') = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El usuario no tiene permiso para crear pedidos';
    END IF;
    SET NEW.estado = 'CREADO';
END$$

-- Máquina de estados y reglas por estado
CREATE TRIGGER trg_pedidos_bu BEFORE UPDATE ON pedidos FOR EACH ROW
BEGIN
    IF OLD.estado IN ('COMPLETADO', 'CANCELADO') THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Un pedido COMPLETADO o CANCELADO no puede modificarse';
    END IF;

    IF OLD.estado <> 'CREADO'
       AND (NEW.subtotal <> OLD.subtotal OR NEW.descuento_total <> OLD.descuento_total
            OR NEW.total <> OLD.total) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Los importes solo pueden cambiar mientras el pedido esta CREADO';
    END IF;

    IF NEW.estado <> OLD.estado THEN
        IF NOT (
               (OLD.estado = 'CREADO' AND NEW.estado IN ('PENDIENTE_APROBACION', 'APROBADO', 'CANCELADO'))
            OR (OLD.estado = 'PENDIENTE_APROBACION' AND NEW.estado IN ('APROBADO', 'CANCELADO'))
            OR (OLD.estado = 'APROBADO' AND NEW.estado IN ('EN_PROCESO', 'CANCELADO'))
            OR (OLD.estado = 'EN_PROCESO' AND NEW.estado IN ('COMPLETADO', 'CANCELADO'))) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Transicion de estado no permitida';
        END IF;

        IF OLD.estado = 'CREADO' AND NEW.estado IN ('PENDIENTE_APROBACION', 'APROBADO') THEN
            IF NOT EXISTS (SELECT 1 FROM pedidos_detalle WHERE id_pedido = OLD.id_pedido) THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El pedido no contiene productos';
            END IF;
            IF NEW.estado = 'APROBADO' AND NEW.requiere_autorizacion = 1 THEN
                SIGNAL SQLSTATE '45000'
                    SET MESSAGE_TEXT = 'El descuento excede el limite: requiere autorizacion de un supervisor';
            END IF;
            IF NEW.estado = 'PENDIENTE_APROBACION' AND NEW.requiere_autorizacion = 0 THEN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El pedido no requiere autorizacion';
            END IF;
        END IF;

        IF OLD.estado = 'PENDIENTE_APROBACION' AND NEW.estado = 'APROBADO' THEN
            IF NEW.id_usuario_supervisor IS NULL
               OR fn_tiene_permiso(NEW.id_usuario_supervisor, 'pedidos.autorizar_descuento') = 0 THEN
                SIGNAL SQLSTATE '45000'
                    SET MESSAGE_TEXT = 'Solo un supervisor con permiso puede autorizar el descuento';
            END IF;
            IF NEW.motivo_descuento_especial IS NULL OR NEW.motivo_descuento_especial = '' THEN
                SIGNAL SQLSTATE '45000'
                    SET MESSAGE_TEXT = 'Debe indicarse el motivo del descuento especial';
            END IF;
            SET NEW.fecha_autorizacion = NOW();
        END IF;
    END IF;
END$$

CREATE TRIGGER trg_pedidos_bd BEFORE DELETE ON pedidos FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Los pedidos no se eliminan; use el estado CANCELADO';
END$$

CREATE TRIGGER trg_pedidos_ai AFTER INSERT ON pedidos FOR EACH ROW
BEGIN
    CALL sp_auditar('Pedidos', 'Creación', NEW.numero_pedido, NULL,
        JSON_OBJECT('id_cliente', NEW.id_cliente, 'estado', NEW.estado));
END$$

CREATE TRIGGER trg_pedidos_au AFTER UPDATE ON pedidos FOR EACH ROW
BEGIN
    IF OLD.estado <> NEW.estado THEN
        CALL sp_auditar('Pedidos',
            CASE NEW.estado
                WHEN 'APROBADO' THEN IF(OLD.estado = 'PENDIENTE_APROBACION', 'Autorización', 'Aprobación')
                WHEN 'CANCELADO' THEN 'Cancelación'
                ELSE 'Cambio de estado' END,
            NEW.numero_pedido,
            JSON_OBJECT('estado', OLD.estado),
            JSON_OBJECT('estado', NEW.estado, 'total', NEW.total,
                        'descuento_total', NEW.descuento_total,
                        'supervisor', NEW.id_usuario_supervisor));
        IF NEW.estado = 'CANCELADO' THEN
            UPDATE ventas SET estado = 'ANULADA'
             WHERE id_pedido = NEW.id_pedido AND estado = 'PENDIENTE';
        END IF;
    END IF;
END$$

-- Detalle del pedido: precio por escala, validación de existencia (RN01) y cálculo
CREATE TRIGGER trg_pdet_bi BEFORE INSERT ON pedidos_detalle FOR EACH ROW
BEGIN
    DECLARE v_estado VARCHAR(30);
    DECLARE v_activo TINYINT;
    DECLARE v_stock INT DEFAULT 0;
    DECLARE v_escala INT UNSIGNED;
    DECLARE v_precio DECIMAL(10,2);

    SELECT estado INTO v_estado FROM pedidos WHERE id_pedido = NEW.id_pedido;
    IF v_estado <> 'CREADO' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Solo se modifica el detalle de un pedido CREADO';
    END IF;

    SELECT activo INTO v_activo FROM productos WHERE id_producto = NEW.id_producto;
    IF v_activo = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El producto esta inactivo';
    END IF;

    SELECT stock_actual INTO v_stock FROM inventario WHERE id_producto = NEW.id_producto;
    IF NEW.cantidad > v_stock THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Inventario insuficiente para la cantidad solicitada';
    END IF;

    SET v_escala = fn_escala_id(NEW.id_producto, NEW.cantidad);
    IF v_escala IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El producto no tiene escala de precio configurada';
    END IF;
    SELECT precio_unitario INTO v_precio FROM escalas_precio WHERE id_escala = v_escala;

    SET NEW.id_escala_aplicada = v_escala;
    SET NEW.precio_escala = v_precio;
    SET NEW.monto_descuento_extra = ROUND(NEW.cantidad * v_precio * NEW.porcentaje_descuento_extra / 100, 2);
    SET NEW.subtotal = ROUND(NEW.cantidad * v_precio, 2) - NEW.monto_descuento_extra;
END$$

CREATE TRIGGER trg_pdet_bu BEFORE UPDATE ON pedidos_detalle FOR EACH ROW
BEGIN
    DECLARE v_estado VARCHAR(30);
    DECLARE v_stock INT DEFAULT 0;
    DECLARE v_escala INT UNSIGNED;
    DECLARE v_precio DECIMAL(10,2);

    IF NEW.id_pedido <> OLD.id_pedido OR NEW.id_producto <> OLD.id_producto THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No se puede cambiar el pedido ni el producto de una linea';
    END IF;
    SELECT estado INTO v_estado FROM pedidos WHERE id_pedido = OLD.id_pedido;
    IF v_estado <> 'CREADO' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Solo se modifica el detalle de un pedido CREADO';
    END IF;

    SELECT stock_actual INTO v_stock FROM inventario WHERE id_producto = NEW.id_producto;
    IF NEW.cantidad > v_stock THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Inventario insuficiente para la cantidad solicitada';
    END IF;

    SET v_escala = fn_escala_id(NEW.id_producto, NEW.cantidad);
    IF v_escala IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El producto no tiene escala de precio configurada';
    END IF;
    SELECT precio_unitario INTO v_precio FROM escalas_precio WHERE id_escala = v_escala;

    SET NEW.id_escala_aplicada = v_escala;
    SET NEW.precio_escala = v_precio;
    SET NEW.monto_descuento_extra = ROUND(NEW.cantidad * v_precio * NEW.porcentaje_descuento_extra / 100, 2);
    SET NEW.subtotal = ROUND(NEW.cantidad * v_precio, 2) - NEW.monto_descuento_extra;
END$$

CREATE TRIGGER trg_pdet_bd BEFORE DELETE ON pedidos_detalle FOR EACH ROW
BEGIN
    DECLARE v_estado VARCHAR(30);
    SELECT estado INTO v_estado FROM pedidos WHERE id_pedido = OLD.id_pedido;
    IF v_estado <> 'CREADO' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Solo se modifica el detalle de un pedido CREADO';
    END IF;
END$$

CREATE TRIGGER trg_pdet_ai AFTER INSERT ON pedidos_detalle FOR EACH ROW
BEGIN
    CALL sp_recalcular_pedido(NEW.id_pedido);
END$$

CREATE TRIGGER trg_pdet_au AFTER UPDATE ON pedidos_detalle FOR EACH ROW
BEGIN
    CALL sp_recalcular_pedido(NEW.id_pedido);
END$$

CREATE TRIGGER trg_pdet_ad AFTER DELETE ON pedidos_detalle FOR EACH ROW
BEGIN
    CALL sp_recalcular_pedido(OLD.id_pedido);
END$$

-- ============================================================================
-- 15. TRIGGERS: VENTAS
-- ============================================================================
-- Generar la venta = INSERT con (numero_factura, id_pedido, id_usuario).
-- Importes y detalle se copian del pedido APROBADO.
CREATE TRIGGER trg_ventas_bi BEFORE INSERT ON ventas FOR EACH ROW
BEGIN
    DECLARE v_estado VARCHAR(30);
    DECLARE v_sub DECIMAL(12,2);
    DECLARE v_desc DECIMAL(12,2);
    DECLARE v_total DECIMAL(12,2);

    IF fn_tiene_permiso(NEW.id_usuario, 'ventas.registrar') = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El usuario no tiene permiso para registrar ventas';
    END IF;

    SELECT estado, subtotal, descuento_total, total
      INTO v_estado, v_sub, v_desc, v_total
    FROM pedidos WHERE id_pedido = NEW.id_pedido;

    IF v_estado = 'CANCELADO' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Un pedido CANCELADO no puede facturarse';
    END IF;
    IF v_estado IS NULL OR v_estado <> 'APROBADO' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Solo un pedido APROBADO puede facturarse';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pedidos_detalle WHERE id_pedido = NEW.id_pedido) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No puede generarse una venta sin productos';
    END IF;

    SET NEW.subtotal = v_sub;
    SET NEW.descuento = v_desc;
    SET NEW.total = v_total;
    SET NEW.saldo_pendiente = v_total;
    SET NEW.estado = 'PENDIENTE';
END$$

CREATE TRIGGER trg_ventas_ai AFTER INSERT ON ventas FOR EACH ROW
BEGIN
    INSERT INTO ventas_detalle (id_venta, id_producto, cantidad, precio_unitario, descuento_aplicado, subtotal)
    SELECT NEW.id_venta, id_producto, cantidad, precio_escala, monto_descuento_extra, subtotal
    FROM pedidos_detalle WHERE id_pedido = NEW.id_pedido;

    UPDATE pedidos SET estado = 'EN_PROCESO' WHERE id_pedido = NEW.id_pedido;

    CALL sp_auditar('Ventas', 'Creación', NEW.numero_factura, NULL,
        JSON_OBJECT('id_pedido', NEW.id_pedido, 'total', NEW.total, 'estado', NEW.estado));
END$$

CREATE TRIGGER trg_ventas_bu BEFORE UPDATE ON ventas FOR EACH ROW
BEGIN
    IF OLD.estado IN ('COMPLETADA', 'ANULADA') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Una venta finalizada no puede modificarse';
    END IF;
    IF NEW.id_pedido <> OLD.id_pedido OR NEW.subtotal <> OLD.subtotal
       OR NEW.descuento <> OLD.descuento OR NEW.total <> OLD.total THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Los importes de la venta no pueden modificarse';
    END IF;
    IF NEW.estado = 'COMPLETADA' THEN
        IF NOT EXISTS (SELECT 1 FROM ventas_detalle WHERE id_venta = OLD.id_venta) THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No puede completarse una venta sin productos';
        END IF;
        IF NEW.saldo_pendiente <> 0 THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La venta tiene saldo pendiente';
        END IF;
    END IF;
    IF NEW.estado = 'ANULADA' AND OLD.saldo_pendiente < OLD.total THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No se puede anular una venta con pagos registrados';
    END IF;
END$$

CREATE TRIGGER trg_ventas_bd BEFORE DELETE ON ventas FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Las ventas no se eliminan; use el estado ANULADA';
END$$

-- RN03: al completarse la venta salen las existencias y se cierra el pedido
CREATE TRIGGER trg_ventas_au AFTER UPDATE ON ventas FOR EACH ROW
BEGIN
    IF OLD.estado = 'PENDIENTE' AND NEW.estado = 'COMPLETADA' THEN
        INSERT INTO movimientos_inventario
            (id_producto, id_usuario, tipo_movimiento, cantidad, documento_tipo, documento_id, motivo)
        SELECT id_producto, fn_usuario_actual(), 'SALIDA', cantidad,
               'VENTA', NEW.numero_factura, 'Salida por venta completada'
        FROM ventas_detalle WHERE id_venta = NEW.id_venta;

        UPDATE pedidos SET estado = 'COMPLETADO' WHERE id_pedido = NEW.id_pedido;
    END IF;
    IF OLD.estado <> NEW.estado THEN
        CALL sp_auditar('Ventas', IF(NEW.estado = 'COMPLETADA', 'Finalización', 'Anulación'),
            NEW.numero_factura,
            JSON_OBJECT('estado', OLD.estado),
            JSON_OBJECT('estado', NEW.estado, 'total', NEW.total));
    END IF;
END$$

CREATE TRIGGER trg_vdet_bi BEFORE INSERT ON ventas_detalle FOR EACH ROW
BEGIN
    DECLARE v_estado VARCHAR(20);
    DECLARE v_stock INT DEFAULT 0;
    SELECT estado INTO v_estado FROM ventas WHERE id_venta = NEW.id_venta;
    IF v_estado <> 'PENDIENTE' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Una venta finalizada no puede modificarse';
    END IF;
    SELECT stock_actual INTO v_stock FROM inventario WHERE id_producto = NEW.id_producto;
    IF NEW.cantidad > v_stock THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No se puede vender mas que el inventario disponible';
    END IF;
END$$

CREATE TRIGGER trg_vdet_bu BEFORE UPDATE ON ventas_detalle FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El detalle de una venta no puede modificarse';
END$$

CREATE TRIGGER trg_vdet_bd BEFORE DELETE ON ventas_detalle FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El detalle de una venta no puede eliminarse';
END$$

-- ============================================================================
-- 16. TRIGGERS: PAGOS
-- ============================================================================
-- RN09: el pago no puede superar el saldo pendiente
CREATE TRIGGER trg_pagos_bi BEFORE INSERT ON pagos FOR EACH ROW
BEGIN
    DECLARE v_estado VARCHAR(20);
    DECLARE v_saldo DECIMAL(12,2);

    IF fn_tiene_permiso(NEW.id_usuario, 'pagos.registrar') = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El usuario no tiene permiso para registrar pagos';
    END IF;

    SELECT estado, saldo_pendiente INTO v_estado, v_saldo
    FROM ventas WHERE id_venta = NEW.id_venta FOR UPDATE;

    IF v_estado IS NULL OR v_estado <> 'PENDIENTE' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La venta no admite pagos (esta finalizada o anulada)';
    END IF;
    IF NEW.monto > v_saldo THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El pago no puede ser mayor al saldo pendiente';
    END IF;
END$$

CREATE TRIGGER trg_pagos_ai AFTER INSERT ON pagos FOR EACH ROW
BEGIN
    -- estado se evalúa antes de actualizar el saldo (orden de asignación)
    UPDATE ventas
       SET estado = IF(saldo_pendiente - NEW.monto = 0, 'COMPLETADA', 'PENDIENTE'),
           saldo_pendiente = saldo_pendiente - NEW.monto
     WHERE id_venta = NEW.id_venta;

    CALL sp_auditar('Pagos', 'Registro', NEW.numero_recibo, NULL,
        JSON_OBJECT('id_venta', NEW.id_venta, 'monto', NEW.monto, 'metodo', NEW.metodo_pago));
END$$

CREATE TRIGGER trg_pagos_bu BEFORE UPDATE ON pagos FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Los pagos no pueden modificarse';
END$$

CREATE TRIGGER trg_pagos_bd BEFORE DELETE ON pagos FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Los pagos no pueden eliminarse';
END$$

-- ============================================================================
-- 17. TRIGGERS: AUDITORÍA INMUTABLE
-- ============================================================================
CREATE TRIGGER trg_auditoria_bu BEFORE UPDATE ON auditoria FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La auditoria no puede modificarse';
END$$

CREATE TRIGGER trg_auditoria_bd BEFORE DELETE ON auditoria FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La auditoria no puede eliminarse';
END$$

DELIMITER ;

-- ============================================================================
-- 18. VISTAS PARA DASHBOARD Y REPORTES
-- ============================================================================
CREATE VIEW v_catalogo AS
SELECT p.id_producto, p.codigo_sku, p.nombre, c.nombre AS categoria, m.nombre AS marca,
       p.edad_minima_meses, e1.precio_unitario AS precio_menudeo,
       i.stock_actual, p.stock_minimo, p.activo
FROM productos p
JOIN categorias c ON c.id_categoria = p.id_categoria
LEFT JOIN marcas m ON m.id_marca = p.id_marca
JOIN inventario i ON i.id_producto = p.id_producto
LEFT JOIN escalas_precio e1 ON e1.id_producto = p.id_producto
                           AND e1.cantidad_minima = 1 AND e1.activo = 1;

CREATE VIEW v_stock_bajo AS               -- Reporte 1: productos bajo el mínimo
SELECT id_producto, codigo_sku, nombre, categoria, stock_actual, stock_minimo,
       (stock_minimo - stock_actual) AS faltante
FROM v_catalogo
WHERE activo = 1 AND stock_actual <= stock_minimo;

CREATE VIEW v_kardex AS                   -- Reporte 2: movimientos de inventario
SELECT m.id_movimiento, m.fecha_hora, p.codigo_sku, p.nombre AS producto,
       m.tipo_movimiento, m.cantidad, m.stock_anterior, m.stock_posterior,
       m.documento_tipo, m.documento_id, m.motivo, u.nombre_completo AS usuario
FROM movimientos_inventario m
JOIN productos p ON p.id_producto = m.id_producto
JOIN usuarios u ON u.id_usuario = m.id_usuario;

CREATE VIEW v_ventas_reporte AS           -- Reporte 3: ventas (filtrar por fecha_venta)
SELECT v.id_venta, v.fecha_venta, v.numero_factura, pe.numero_pedido,
       c.nombre_razon_social AS cliente, uv.nombre_completo AS vendedor,
       v.subtotal, v.descuento, v.total, v.saldo_pendiente, v.estado
FROM ventas v
JOIN pedidos pe ON pe.id_pedido = v.id_pedido
JOIN clientes c ON c.id_cliente = pe.id_cliente
JOIN usuarios uv ON uv.id_usuario = pe.id_usuario_vendedor;

CREATE VIEW v_auditoria_reporte AS       -- Reporte 4: bitácora legible
SELECT a.fecha_hora, u.nombre_completo AS usuario, a.modulo, a.accion, a.id_registro,
       a.detalle_anterior, a.detalle_nuevo
FROM auditoria a
JOIN usuarios u ON u.id_usuario = a.id_usuario;

CREATE VIEW v_pedidos_por_estado AS
SELECT estado, COUNT(*) AS cantidad, COALESCE(SUM(total), 0) AS monto
FROM pedidos GROUP BY estado;

CREATE VIEW v_ventas_por_mes AS           -- Gráfica 1
SELECT DATE_FORMAT(fecha_venta, '%Y-%m') AS mes, COUNT(*) AS ventas, SUM(total) AS monto
FROM ventas WHERE estado = 'COMPLETADA'
GROUP BY DATE_FORMAT(fecha_venta, '%Y-%m');

CREATE VIEW v_top_productos AS            -- Gráfica 2
SELECT p.codigo_sku, p.nombre, SUM(vd.cantidad) AS unidades_vendidas, SUM(vd.subtotal) AS ingresos
FROM ventas_detalle vd
JOIN ventas v ON v.id_venta = vd.id_venta AND v.estado = 'COMPLETADA'
JOIN productos p ON p.id_producto = vd.id_producto
GROUP BY p.id_producto, p.codigo_sku, p.nombre;

CREATE VIEW v_dashboard AS                -- 6 indicadores
SELECT
  (SELECT COALESCE(SUM(total), 0) FROM ventas
     WHERE estado = 'COMPLETADA' AND fecha_venta >= DATE_FORMAT(CURDATE(), '%Y-%m-01')) AS ventas_del_mes,
  (SELECT COALESCE(SUM(total), 0) FROM compras
     WHERE estado = 'RECIBIDA' AND fecha_compra >= DATE_FORMAT(CURDATE(), '%Y-%m-01')) AS compras_del_mes,
  (SELECT COUNT(*) FROM pedidos WHERE estado = 'PENDIENTE_APROBACION') AS pedidos_pendientes_aprobacion,
  (SELECT COUNT(*) FROM alertas_inventario WHERE estado = 'ACTIVA') AS productos_en_alerta,
  (SELECT COALESCE(SUM(saldo_pendiente), 0) FROM ventas WHERE estado = 'PENDIENTE') AS por_cobrar,
  (SELECT COUNT(*) FROM clientes WHERE activo = 1) AS clientes_activos;

CREATE VIEW v_matriz_roles_permisos AS    -- Documentación: matriz de roles y permisos
SELECT r.nombre AS rol, p.modulo, p.codigo AS permiso, p.descripcion
FROM roles r
JOIN rol_permisos rp ON rp.id_rol = r.id_rol
JOIN permisos p ON p.id_permiso = rp.id_permiso;

-- ============================================================================
-- 19. DATOS INICIALES
-- ============================================================================
INSERT INTO roles (nombre, descripcion) VALUES
('Administrador', 'Administra usuarios y roles; consulta auditoria, reportes y configuraciones'),
('Supervisor',    'Autoriza descuentos, aprueba operaciones y consulta reportes y movimientos'),
('Operador',      'Registra clientes, crea pedidos, registra ventas y consulta productos');

INSERT INTO permisos (codigo, modulo, descripcion) VALUES
('usuarios.gestionar',            'Usuarios',      'Crear, modificar y desactivar usuarios'),
('roles.gestionar',               'Roles',         'Administrar roles y permisos'),
('clientes.gestionar',            'Clientes',      'Crear y modificar clientes'),
('clientes.consultar',            'Clientes',      'Consultar clientes'),
('proveedores.gestionar',         'Proveedores',   'Crear y modificar proveedores'),
('productos.gestionar',           'Productos',     'Crear y modificar productos y escalas de precio'),
('productos.consultar',           'Productos',     'Consultar productos y precios'),
('compras.registrar',             'Compras',       'Registrar compras'),
('compras.recibir',               'Compras',       'Recibir mercaderia (genera entrada de inventario)'),
('inventario.consultar',          'Inventario',    'Consultar existencias, movimientos y alertas'),
('inventario.ajustar',            'Inventario',    'Registrar ajustes de inventario'),
('pedidos.crear',                 'Pedidos',       'Crear pedidos'),
('pedidos.autorizar_descuento',   'Pedidos',       'Autorizar descuentos sobre el limite'),
('pedidos.cancelar',              'Pedidos',       'Cancelar pedidos'),
('ventas.registrar',              'Ventas',        'Generar ventas desde pedidos aprobados'),
('pagos.registrar',               'Pagos',         'Registrar pagos'),
('reportes.consultar',            'Reportes',      'Consultar dashboard y reportes'),
('auditoria.consultar',           'Auditoria',     'Consultar la bitacora de auditoria'),
('configuracion.gestionar',       'Configuracion', 'Modificar parametros del sistema');

-- Administrador: todos los permisos
INSERT INTO rol_permisos (id_rol, id_permiso)
SELECT r.id_rol, p.id_permiso FROM roles r CROSS JOIN permisos p WHERE r.nombre = 'Administrador';

-- Supervisor
INSERT INTO rol_permisos (id_rol, id_permiso)
SELECT r.id_rol, p.id_permiso FROM roles r
JOIN permisos p ON p.codigo IN ('clientes.consultar','proveedores.gestionar','productos.gestionar',
    'productos.consultar','compras.registrar','compras.recibir','inventario.consultar',
    'inventario.ajustar','pedidos.autorizar_descuento','pedidos.cancelar','reportes.consultar')
WHERE r.nombre = 'Supervisor';

-- Operador
INSERT INTO rol_permisos (id_rol, id_permiso)
SELECT r.id_rol, p.id_permiso FROM roles r
JOIN permisos p ON p.codigo IN ('clientes.gestionar','clientes.consultar','productos.consultar',
    'inventario.consultar','pedidos.crear','ventas.registrar','pagos.registrar')
WHERE r.nombre = 'Operador';

-- Usuarios de demostración (REEMPLAZAR password_hash por un hash real generado desde la app)
SET @usuario_actual = 1;   -- el primer usuario se auto-referencia en la auditoría (BD nueva)

INSERT INTO usuarios (id_rol, nombre_completo, email, password_hash)
VALUES ((SELECT id_rol FROM roles WHERE nombre = 'Administrador'),
        'Administrador del Sistema', 'admin@jugueteria.local', 'REEMPLAZAR_HASH');
INSERT INTO usuarios (id_rol, nombre_completo, email, password_hash)
VALUES ((SELECT id_rol FROM roles WHERE nombre = 'Supervisor'),
        'Supervisor Demo', 'supervisor@jugueteria.local', 'REEMPLAZAR_HASH');
INSERT INTO usuarios (id_rol, nombre_completo, email, password_hash)
VALUES ((SELECT id_rol FROM roles WHERE nombre = 'Operador'),
        'Operador Demo', 'operador@jugueteria.local', 'REEMPLAZAR_HASH');

INSERT INTO configuraciones (clave, valor, descripcion) VALUES
('DESCUENTO_MAX_SIN_AUTORIZACION', '10.00',
 'Porcentaje maximo de descuento extra que un operador puede aplicar sin autorizacion de supervisor');

-- Catálogo de ejemplo
INSERT INTO categorias (nombre, descripcion) VALUES
('Vehiculos', 'Carros, camiones y aviones de juguete'),
('Munecas', 'Munecas y accesorios'),
('Didacticos', 'Bloques, rompecabezas y juegos educativos');

INSERT INTO marcas (nombre) VALUES ('Genérica'), ('Hot Wheels'), ('LEGO');

INSERT INTO productos (id_categoria, id_marca, codigo_sku, nombre, edad_minima_meses, advertencia_seguridad, stock_minimo)
VALUES
((SELECT id_categoria FROM categorias WHERE nombre = 'Vehiculos'),
 (SELECT id_marca FROM marcas WHERE nombre = 'Hot Wheels'),
 'JUG-001', 'Carro de carreras a escala', 36, 'Contiene piezas pequenas', 5),
((SELECT id_categoria FROM categorias WHERE nombre = 'Munecas'),
 (SELECT id_marca FROM marcas WHERE nombre = 'Genérica'),
 'JUG-002', 'Muneca clasica con accesorios', 36, NULL, 5),
((SELECT id_categoria FROM categorias WHERE nombre = 'Didacticos'),
 (SELECT id_marca FROM marcas WHERE nombre = 'LEGO'),
 'JUG-003', 'Set de bloques 100 piezas', 48, 'Contiene piezas pequenas', 20);

-- Escala de precios: 10 niveles por producto (1, 3, 6, 12, 25, 50, 100, 500, 1000, 10000)
INSERT INTO escalas_precio (id_producto, cantidad_minima, precio_unitario)
SELECT p.id_producto, n.cantidad_minima, ROUND(b.precio_menudeo * n.factor, 2)
FROM (SELECT 'JUG-001' AS sku, 50.00 AS precio_menudeo
      UNION ALL SELECT 'JUG-002', 80.00
      UNION ALL SELECT 'JUG-003', 120.00) b
JOIN productos p ON p.codigo_sku = b.sku
CROSS JOIN (SELECT 1 AS cantidad_minima, 1.00 AS factor
            UNION ALL SELECT 3, 0.95   UNION ALL SELECT 6, 0.90
            UNION ALL SELECT 12, 0.85  UNION ALL SELECT 25, 0.80
            UNION ALL SELECT 50, 0.75  UNION ALL SELECT 100, 0.70
            UNION ALL SELECT 500, 0.65 UNION ALL SELECT 1000, 0.60
            UNION ALL SELECT 10000, 0.55) n;

INSERT INTO proveedores (identificacion_fiscal, razon_social, contacto_nombre, telefono)
VALUES ('1234567-8', 'Distribuidora de Juguetes S.A.', 'Contacto Demo', '5555-0000');

INSERT INTO clientes (identificacion, nombre_razon_social, telefono) VALUES
(NULL,        'Consumidor Final', NULL),
('7654321-0', 'Tienda Mayorista El Sol', '5555-1111');

-- Compra inicial recibida: demuestra ENTRADA de inventario y una alerta (JUG-003: 15 <= minimo 20)
INSERT INTO compras (numero_comprobante, id_proveedor, id_usuario, observaciones)
SELECT 'COMP-0001', id_proveedor, 2, 'Compra inicial de inventario'
FROM proveedores WHERE identificacion_fiscal = '1234567-8';

INSERT INTO compras_detalle (id_compra, id_producto, cantidad, costo_unitario)
SELECT c.id_compra, p.id_producto, d.cantidad, d.costo
FROM compras c
JOIN (SELECT 'JUG-001' AS sku, 200 AS cantidad, 28.00 AS costo
      UNION ALL SELECT 'JUG-002', 100, 45.00
      UNION ALL SELECT 'JUG-003', 15, 70.00) d
JOIN productos p ON p.codigo_sku = d.sku
WHERE c.numero_comprobante = 'COMP-0001';

UPDATE compras SET estado = 'RECIBIDA', id_usuario_recepcion = 2
WHERE numero_comprobante = 'COMP-0001';
