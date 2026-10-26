import { pool } from '../src/db/pool.js';

async function seedDemoData() {
  console.log('Iniciando creación de registros semilla (Agosto - Octubre 2026)...');
  const conn = await pool.getConnection();
  await conn.query('SET @usuario_actual = 1');

  // Guardar triggers para restaurarlos al final
  const triggersToRecreate = [
    {
      name: 'trg_mov_bu',
      table: 'movimientos_inventario',
      sql: `CREATE TRIGGER trg_mov_bu BEFORE UPDATE ON movimientos_inventario FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Los movimientos de inventario no pueden modificarse';
END`
    },
    {
      name: 'trg_mov_bd',
      table: 'movimientos_inventario',
      sql: `CREATE TRIGGER trg_mov_bd BEFORE DELETE ON movimientos_inventario FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Los movimientos de inventario no pueden eliminarse';
END`
    },
    {
      name: 'trg_ventas_bu',
      table: 'ventas',
      sql: `CREATE TRIGGER trg_ventas_bu BEFORE UPDATE ON ventas FOR EACH ROW
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
END`
    },
    {
      name: 'trg_pagos_bu',
      table: 'pagos',
      sql: `CREATE TRIGGER trg_pagos_bu BEFORE UPDATE ON pagos FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Los pagos no pueden modificarse';
END`
    },
    {
      name: 'trg_compras_bu',
      table: 'compras',
      sql: `CREATE TRIGGER trg_compras_bu BEFORE UPDATE ON compras FOR EACH ROW
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
END`
    },
    {
      name: 'trg_compras_bd',
      table: 'compras',
      sql: `CREATE TRIGGER trg_compras_bd BEFORE DELETE ON compras FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Las compras no se eliminan; use el estado ANULADA';
END`
    },
    {
      name: 'trg_pedidos_bu',
      table: 'pedidos',
      sql: `CREATE TRIGGER trg_pedidos_bu BEFORE UPDATE ON pedidos FOR EACH ROW
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
END`
    }
  ];

  // 1. Desactivar temporalmente los triggers restrictivos
  for (const t of triggersToRecreate) {
    await conn.query(`DROP TRIGGER IF EXISTS ${t.name}`);
  }
  console.log('Triggers restrictivos desactivados temporalmente.');

  try {


    // 2. Insertar Categorías Adicionales
    const nuevasCategorias = [
      ['Juegos de Mesa', 'Juegos de mesa familiares, estrategia y cartas'],
      ['Figuras de Accion', 'Superhéroes, personajes y figuras coleccionables'],
      ['Construccion y Bloques', 'Sets de armar, ladrillos y arquitectura'],
      ['Peloteria y Deportes', 'Balones, pelotas y juegos al aire libre']
    ];
    for (const [nombre, desc] of nuevasCategorias) {
      await conn.query('INSERT IGNORE INTO categorias (nombre, descripcion) VALUES (?, ?)', [nombre, desc]);
    }

    // 3. Insertar Marcas Adicionales
    const nuevasMarcas = [
      'Hasbro', 'LEGO', 'Mattel', 'Fisher-Price', 'Play-Doh', 'Hot Wheels', 'Genérica'
    ];
    for (const m of nuevasMarcas) {
      await conn.query('INSERT IGNORE INTO marcas (nombre) VALUES (?)', [m]);
    }

    // 4. Insertar Nuevos Productos con sus 10 Escalas de Precio
    const nuevosProductos = [
      {
        sku: 'JUG-004',
        nombre: 'Juego de mesa Monopolio clásico',
        cat: 'Juegos de Mesa',
        marca: 'Hasbro',
        edad: 96,
        advertencia: 'Contiene billetes y piezas pequeñas',
        stock_minimo: 6,
        precio_base: 160.00
      },
      {
        sku: 'JUG-005',
        nombre: 'Figura de accion Superheroe 30cm',
        cat: 'Figuras de Accion',
        marca: 'Hasbro',
        edad: 48,
        advertencia: 'Articulaciones movibles',
        stock_minimo: 8,
        precio_base: 125.00
      },
      {
        sku: 'JUG-006',
        nombre: 'Pelota de futbol infantil No. 3',
        cat: 'Peloteria y Deportes',
        marca: 'Genérica',
        edad: 36,
        advertencia: null,
        stock_minimo: 12,
        precio_base: 45.00
      },
      {
        sku: 'JUG-007',
        nombre: 'Set plastilina 8 colores moldeables',
        cat: 'Didacticos',
        marca: 'Play-Doh',
        edad: 24,
        advertencia: 'No tóxica, contiene trigo',
        stock_minimo: 20,
        precio_base: 35.00
      },
      {
        sku: 'JUG-008',
        nombre: 'Pista de carreras acrobática con curvas',
        cat: 'Vehiculos',
        marca: 'Hot Wheels',
        edad: 60,
        advertencia: 'Requiere ensamblaje por un adulto',
        stock_minimo: 5,
        precio_base: 260.00
      },
      {
        sku: 'JUG-009',
        nombre: 'Castillo medieval de bloques 500 piezas',
        cat: 'Didacticos',
        marca: 'LEGO',
        edad: 72,
        advertencia: 'Contiene piezas pequeñas',
        stock_minimo: 4,
        precio_base: 420.00
      },
      {
        sku: 'JUG-010',
        nombre: 'Gimnasio musical para bebes con luces',
        cat: 'Didacticos',
        marca: 'Fisher-Price',
        edad: 0,
        advertencia: 'Uso bajo supervisión adulta',
        stock_minimo: 4,
        precio_base: 290.00
      }
    ];

    const factoresEscala = [
      [1, 1.00], [3, 0.95], [6, 0.90], [12, 0.85], [25, 0.80],
      [50, 0.75], [100, 0.70], [500, 0.65], [1000, 0.60], [10000, 0.55]
    ];

    for (const prod of nuevosProductos) {
      const [existing] = await conn.query('SELECT id_producto FROM productos WHERE codigo_sku = ?', [prod.sku]);
      let idProd;
      if (existing.length === 0) {
        const [res] = await conn.query(
          `INSERT INTO productos (id_categoria, id_marca, codigo_sku, nombre, edad_minima_meses, advertencia_seguridad, stock_minimo)
           VALUES (
             (SELECT id_categoria FROM categorias WHERE nombre = ?),
             (SELECT id_marca FROM marcas WHERE nombre = ?),
             ?, ?, ?, ?, ?
           )`,
          [prod.cat, prod.marca, prod.sku, prod.nombre, prod.edad, prod.advertencia, prod.stock_minimo]
        );
        idProd = res.insertId;

        // Registrar escalas
        for (const [cant, factor] of factoresEscala) {
          const precio = Math.round(prod.precio_base * factor * 100) / 100;
          await conn.query(
            'INSERT INTO escalas_precio (id_producto, cantidad_minima, precio_unitario) VALUES (?, ?, ?)',
            [idProd, cant, precio]
          );
        }

        // Registrar inventario inicial en 0
        await conn.query(
          'INSERT IGNORE INTO inventario (id_producto, stock_actual) VALUES (?, 0)',
          [idProd]
        );
      }
    }
    console.log('Productos y escalas sincronizados.');

    // 5. Clientes completos con correo y dirección
    const clientesCompletos = [
      {
        nit: 'CF',
        razon: 'Consumidor Final',
        tel: '2200-0000',
        email: 'consumidorfinal@quetzal.gt',
        dir: 'Ciudad de Guatemala, Guatemala'
      },
      {
        nit: '1029384-7',
        razon: 'Tienda Mayorista El Sol',
        tel: '2331-4567',
        email: 'contacto@mayoristaelsol.com.gt',
        dir: '4ta Avenida 12-30, Zona 1, Ciudad de Guatemala'
      },
      {
        nit: '8492011-2',
        razon: 'Distribuidora Infantil La Esperanza',
        tel: '5521-9988',
        email: 'pedidos@infantillaesperanza.com',
        dir: 'Calzada Roosevelt 22-45, Zona 11, Ciudad de Guatemala'
      },
      {
        nit: '9382104-5',
        razon: 'Juguetes y Piñatas Los Chiquitines',
        tel: '5612-4433',
        email: 'ventas@loschiquitines.gt',
        dir: '6ta Calle 8-15, Zona 9, Quetzaltenango'
      },
      {
        nit: '3491028-9',
        razon: 'Librería y Papelería San Carlos',
        tel: '5433-2211',
        email: 'compras@libreriasancarlos.edu.gt',
        dir: 'Avenida Reforma 7-20, Zona 10, Ciudad de Guatemala'
      },
      {
        nit: '5820194-7',
        razon: 'Comercializadora del Altiplano S.A.',
        tel: '5899-7766',
        email: 'admin@altiplano-dist.com',
        dir: 'Km 145 Carretera Interamericana, Sololá'
      },
      {
        nit: '1294819-3',
        razon: 'Colegio Bilingüe Montessori',
        tel: '5244-1100',
        email: 'direccion@montessori.edu.gt',
        dir: 'Boulevard Vista Hermosa 15-40, Zona 15, Ciudad de Guatemala'
      },
      {
        nit: '7401928-1',
        razon: 'Farmacias y Novedades del Centro',
        tel: '5766-3322',
        email: 'novedades@farmaciasdelcentro.com',
        dir: '5ta Avenida 10-02, Zona 1, Escuintla'
      }
    ];

    for (const c of clientesCompletos) {
      const [existing] = await conn.query('SELECT id_cliente FROM clientes WHERE nombre_razon_social = ?', [c.razon]);
      if (existing.length > 0) {
        await conn.query(
          'UPDATE clientes SET identificacion = ?, telefono = ?, email = ?, direccion = ? WHERE id_cliente = ?',
          [c.nit, c.tel, c.email, c.dir, existing[0].id_cliente]
        );
      } else {
        await conn.query(
          'INSERT INTO clientes (identificacion, nombre_razon_social, telefono, email, direccion) VALUES (?, ?, ?, ?, ?)',
          [c.nit, c.razon, c.tel, c.email, c.dir]
        );
      }
    }

    // 6. Proveedores completos con correo y dirección
    const proveedoresCompletos = [
      {
        nit: '1092837-4',
        razon: 'Distribuidora de Juguetes S.A.',
        contacto: 'Juan Pérez',
        tel: '2234-5678',
        email: 'ventas@distribuidorajuguetes.com.gt',
        dir: 'Calzada San Juan 14-80, Zona 7, Ciudad de Guatemala'
      },
      {
        nit: '7829103-1',
        razon: 'Jugueton S.A.',
        contacto: 'Pablo Morales',
        tel: '2388-1122',
        email: 'PabloIIIk@jugueton.com.gt',
        dir: 'Avenida Las Américas 8-42, Zona 13, Ciudad de Guatemala'
      },
      {
        nit: '4546546',
        razon: 'Jugueteria X',
        contacto: 'Noé Alvarado',
        tel: '5566-7788',
        email: 'nalvaradoh2002@gmail.com',
        dir: '10850 NW 21ST ST STE 10#ICC45911, Miami, FL'
      },
      {
        nit: '6930219-4',
        razon: 'Importadora Continental de Juguetes S.A.',
        contacto: 'Carlos Méndez',
        tel: '2344-8899',
        email: 'importaciones@continentaljuguetes.com',
        dir: 'Diagonal 6 10-50, Centro Gerencial Las Margaritas, Zona 10, Ciudad de Guatemala'
      },
      {
        nit: '8192034-7',
        razon: 'Almacenes Didácticos de Guatemala',
        contacto: 'Luisa Morales',
        tel: '2455-6677',
        email: 'contacto@didacticosguatemala.gt',
        dir: 'Ruta 4 6-32, Zona 4, Cuatro Grados Norte, Ciudad de Guatemala'
      }
    ];

    for (const p of proveedoresCompletos) {
      const [existing] = await conn.query('SELECT id_proveedor FROM proveedores WHERE razon_social = ?', [p.razon]);
      if (existing.length > 0) {
        await conn.query(
          'UPDATE proveedores SET identificacion_fiscal = ?, contacto_nombre = ?, telefono = ?, email = ?, direccion = ? WHERE id_proveedor = ?',
          [p.nit, p.contacto, p.tel, p.email, p.dir, existing[0].id_proveedor]
        );
      } else {
        await conn.query(
          'INSERT INTO proveedores (identificacion_fiscal, razon_social, contacto_nombre, telefono, email, direccion) VALUES (?, ?, ?, ?, ?, ?)',
          [p.nit, p.razon, p.contacto, p.tel, p.email, p.dir]
        );
      }
    }
    console.log('Clientes y proveedores registrados con correo y dirección completos.');

    // 7. COMPRAS HISTÓRICAS (Agosto, Septiembre, Octubre 2026)
    const [allProducts] = await conn.query('SELECT id_producto, codigo_sku FROM productos');
    const prodMap = {};
    for (const p of allProducts) {
      prodMap[p.codigo_sku] = p.id_producto;
    }

    const [allProv] = await conn.query('SELECT id_proveedor FROM proveedores LIMIT 4');
    const provIds = allProv.map(p => p.id_proveedor);

    const comprasData = [
      // AGOSTO 2026
      {
        num: 'COMP-0010',
        prov: provIds[0],
        fecha: '2026-08-04 09:15:00',
        items: [
          { sku: 'JUG-001', cant: 120, costo: 26.00 },
          { sku: 'JUG-002', cant: 80, costo: 42.00 },
          { sku: 'JUG-004', cant: 40, costo: 90.00 }
        ]
      },
      {
        num: 'COMP-0011',
        prov: provIds[1] || provIds[0],
        fecha: '2026-08-12 11:30:00',
        items: [
          { sku: 'JUG-003', cant: 60, costo: 68.00 },
          { sku: 'JUG-005', cant: 50, costo: 70.00 },
          { sku: 'JUG-007', cant: 150, costo: 18.00 }
        ]
      },
      {
        num: 'COMP-0012',
        prov: provIds[2] || provIds[0],
        fecha: '2026-08-20 14:45:00',
        items: [
          { sku: 'JUG-006', cant: 100, costo: 22.00 },
          { sku: 'JUG-008', cant: 30, costo: 140.00 },
          { sku: 'JUG-010', cant: 25, costo: 160.00 }
        ]
      },
      // SEPTIEMBRE 2026
      {
        num: 'COMP-0020',
        prov: provIds[0],
        fecha: '2026-09-02 10:00:00',
        items: [
          { sku: 'JUG-001', cant: 150, costo: 27.00 },
          { sku: 'JUG-003', cant: 70, costo: 69.00 },
          { sku: 'JUG-009', cant: 25, costo: 230.00 }
        ]
      },
      {
        num: 'COMP-0021',
        prov: provIds[1] || provIds[0],
        fecha: '2026-09-14 13:20:00',
        items: [
          { sku: 'JUG-004', cant: 60, costo: 92.00 },
          { sku: 'JUG-005', cant: 70, costo: 72.00 },
          { sku: 'JUG-007', cant: 100, costo: 19.00 }
        ]
      },
      {
        num: 'COMP-0022',
        prov: provIds[2] || provIds[0],
        fecha: '2026-09-22 16:00:00',
        items: [
          { sku: 'JUG-002', cant: 90, costo: 44.00 },
          { sku: 'JUG-006', cant: 120, costo: 23.00 },
          { sku: 'JUG-008', cant: 35, costo: 145.00 }
        ]
      },
      // OCTUBRE 2026
      {
        num: 'COMP-0030',
        prov: provIds[0],
        fecha: '2026-10-05 09:40:00',
        items: [
          { sku: 'JUG-001', cant: 100, costo: 27.00 },
          { sku: 'JUG-005', cant: 50, costo: 73.00 },
          { sku: 'JUG-010', cant: 15, costo: 165.00 }
        ]
      },
      {
        num: 'COMP-0031',
        prov: provIds[1] || provIds[0],
        fecha: '2026-10-18 11:15:00',
        items: [
          { sku: 'JUG-003', cant: 40, costo: 70.00 },
          { sku: 'JUG-007', cant: 80, costo: 19.00 },
          { sku: 'JUG-009', cant: 15, costo: 235.00 }
        ]
      },
      {
        num: 'COMP-0032',
        prov: provIds[2] || provIds[0],
        fecha: '2026-10-25 15:30:00',
        items: [
          { sku: 'JUG-004', cant: 30, costo: 95.00 },
          { sku: 'JUG-006', cant: 50, costo: 24.00 }
        ],
        pendiente: true
      }
    ];

    for (const c of comprasData) {
      const [existingComp] = await conn.query('SELECT id_compra FROM compras WHERE numero_comprobante = ?', [c.num]);
      if (existingComp.length === 0) {
        // 1. Insertar compra en REGISTRADA
        const [res] = await conn.query(
          `INSERT INTO compras (numero_comprobante, id_proveedor, id_usuario, estado, total, fecha_compra, observaciones)
           VALUES (?, ?, 1, 'REGISTRADA', 0.00, ?, ?)`,
          [
            c.num,
            c.prov,
            c.fecha,
            `Compra histórica de reabastecimiento (${c.num})`
          ]
        );
        const idCompra = res.insertId;

        // 2. Insertar detalle (sp_recalcular_compra actualiza compras.total automáticamente)
        for (const item of c.items) {
          const idProd = prodMap[item.sku];
          if (!idProd) continue;
          const subtotalItem = item.cant * item.costo;
          await conn.query(
            `INSERT INTO compras_detalle (id_compra, id_producto, cantidad, costo_unitario, subtotal)
             VALUES (?, ?, ?, ?, ?)`,
            [idCompra, idProd, item.cant, item.costo, subtotalItem]
          );
        }

        // 3. Si se debe recibir, transicionar a RECIBIDA
        // El trigger trg_compras_au genera automáticamente la ENTRADA en movimientos_inventario,
        // y el trigger trg_mov_bi actualiza automáticamente inventario.stock_actual.
        if (!c.pendiente) {
          await conn.query(
            `UPDATE compras
             SET estado = 'RECIBIDA', id_usuario_recepcion = 1, fecha_recepcion = ?
             WHERE id_compra = ?`,
            [c.fecha, idCompra]
          );

          // Actualizar la fecha del movimiento en inventario para que el Kardex refleje la fecha histórica
          await conn.query(
            `UPDATE movimientos_inventario
             SET fecha_hora = ?
             WHERE documento_tipo = 'COMPRA' AND documento_id = ?`,
            [c.fecha, c.num]
          );
        }
      }
    }
    console.log('Compras y recepciones históricas registradas.');

    // 8. VENTAS, PEDIDOS Y PAGOS HISTÓRICOS (Agosto, Septiembre, Octubre 2026)
    const [allClients] = await conn.query('SELECT id_cliente FROM clientes');
    const clientIds = allClients.map(c => c.id_cliente);

    const ventasData = [
      // ======================== AGOSTO 2026 ========================
      {
        ped: 'PED-0020', fac: 'FAC-0020', rec: 'REC-0020',
        cli: clientIds[1] || 1, fecha: '2026-08-05 10:15:00',
        items: [{ sku: 'JUG-001', cant: 25, precio: 40.00 }] // Q1,000
      },
      {
        ped: 'PED-0021', fac: 'FAC-0021', rec: 'REC-0021',
        cli: clientIds[2] || 1, fecha: '2026-08-08 15:40:00',
        items: [{ sku: 'JUG-002', cant: 15, precio: 68.00 }] // Q1,020
      },
      {
        ped: 'PED-0022', fac: 'FAC-0022', rec: 'REC-0022',
        cli: clientIds[3] || 1, fecha: '2026-08-14 11:20:00',
        items: [
          { sku: 'JUG-004', cant: 8, precio: 144.00 }, // Q1,152
          { sku: 'JUG-007', cant: 40, precio: 28.00 }  // Q1,120
        ] // Total Q2,272
      },
      {
        ped: 'PED-0023', fac: 'FAC-0023', rec: 'REC-0023',
        cli: clientIds[0], fecha: '2026-08-18 16:10:00',
        items: [
          { sku: 'JUG-003', cant: 20, precio: 95.00 },   // Q1,900
          { sku: 'JUG-005', cant: 15, precio: 112.50 }   // Q1,687.50
        ] // Total Q3,587.50
      },
      {
        ped: 'PED-0024', fac: 'FAC-0024', rec: 'REC-0024',
        cli: clientIds[4] || 1, fecha: '2026-08-22 13:00:00',
        items: [
          { sku: 'JUG-006', cant: 25, precio: 36.00 },  // Q900
          { sku: 'JUG-008', cant: 5, precio: 234.00 }   // Q1,170
        ] // Total Q2,070
      },
      {
        ped: 'PED-0025', fac: 'FAC-0025', rec: 'REC-0025',
        cli: clientIds[5] || 1, fecha: '2026-08-27 10:45:00',
        items: [
          { sku: 'JUG-001', cant: 15, precio: 42.50 },  // Q637.50
          { sku: 'JUG-010', cant: 3, precio: 275.50 }   // Q826.50
        ] // Total Q1,464
      },
      {
        ped: 'PED-0026', fac: 'FAC-0026', rec: 'REC-0026',
        cli: clientIds[6] || 1, fecha: '2026-08-30 14:15:00',
        items: [
          { sku: 'JUG-002', cant: 12, precio: 72.00 },  // Q864
          { sku: 'JUG-007', cant: 50, precio: 26.25 }  // Q1,312.50
        ] // Total Q2,176.50
      },

      // ======================== SEPTIEMBRE 2026 ========================
      {
        ped: 'PED-0030', fac: 'FAC-0030', rec: 'REC-0030',
        cli: clientIds[2] || 1, fecha: '2026-09-04 09:30:00',
        items: [
          { sku: 'JUG-001', cant: 30, precio: 40.00 }, // Q1,200
          { sku: 'JUG-003', cant: 15, precio: 95.00 }  // Q1,425
        ] // Total Q2,625
      },
      {
        ped: 'PED-0031', fac: 'FAC-0031', rec: 'REC-0031',
        cli: clientIds[3] || 1, fecha: '2026-09-09 11:00:00',
        items: [
          { sku: 'JUG-009', cant: 4, precio: 378.00 },  // Q1,512
          { sku: 'JUG-005', cant: 10, precio: 112.50 }  // Q1,125
        ] // Total Q2,637
      },
      {
        ped: 'PED-0032', fac: 'FAC-0032', rec: 'REC-0032',
        cli: clientIds[1] || 1, fecha: '2026-09-13 14:50:00',
        items: [
          { sku: 'JUG-004', cant: 10, precio: 144.00 }, // Q1,440
          { sku: 'JUG-006', cant: 30, precio: 36.00 }   // Q1,080
        ] // Total Q2,520
      },
      {
        ped: 'PED-0033', fac: 'FAC-0033', rec: 'REC-0033',
        cli: clientIds[4] || 1, fecha: '2026-09-18 10:15:00',
        items: [
          { sku: 'JUG-007', cant: 30, precio: 28.00 },  // Q840
          { sku: 'JUG-008', cant: 6, precio: 234.00 }   // Q1,404
        ] // Total Q2,244
      },
      {
        ped: 'PED-0034', fac: 'FAC-0034', rec: 'REC-0034',
        cli: clientIds[0], fecha: '2026-09-21 16:30:00',
        items: [
          { sku: 'JUG-002', cant: 15, precio: 68.00 },  // Q1,020
          { sku: 'JUG-003', cant: 12, precio: 95.00 }   // Q1,140
        ] // Total Q2,160
      },
      {
        ped: 'PED-0035', fac: 'FAC-0035', rec: 'REC-0035',
        cli: clientIds[5] || 1, fecha: '2026-09-25 12:20:00',
        items: [
          { sku: 'JUG-001', cant: 20, precio: 40.00 },  // Q800
          { sku: 'JUG-005', cant: 12, precio: 112.50 }  // Q1,350
        ] // Total Q2,150
      },
      {
        ped: 'PED-0036', fac: 'FAC-0036', rec: 'REC-0036',
        cli: clientIds[6] || 1, fecha: '2026-09-28 15:45:00',
        items: [
          { sku: 'JUG-006', cant: 20, precio: 38.25 },  // Q765
          { sku: 'JUG-010', cant: 4, precio: 261.00 }   // Q1,044
        ] // Total Q1,809
      },

      // ======================== OCTUBRE 2026 ========================
      {
        ped: 'PED-0040', fac: 'FAC-0040', rec: 'REC-0040',
        cli: clientIds[1] || 1, fecha: '2026-10-03 10:00:00',
        items: [
          { sku: 'JUG-001', cant: 18, precio: 42.50 },  // Q765
          { sku: 'JUG-007', cant: 35, precio: 28.00 }   // Q980
        ] // Total Q1,745
      },
      {
        ped: 'PED-0041', fac: 'FAC-0041', rec: 'REC-0041',
        cli: clientIds[3] || 1, fecha: '2026-10-08 14:30:00',
        items: [
          { sku: 'JUG-003', cant: 10, precio: 104.50 }, // Q1,045
          { sku: 'JUG-004', cant: 12, precio: 136.00 }  // Q1,632
        ] // Total Q2,677
      },
      {
        ped: 'PED-0042', fac: 'FAC-0042', rec: 'REC-0042',
        cli: clientIds[0], fecha: '2026-10-12 11:15:00',
        items: [
          { sku: 'JUG-002', cant: 8, precio: 72.00 },   // Q576
          { sku: 'JUG-008', cant: 4, precio: 234.00 }   // Q936
        ] // Total Q1,512
      },
      {
        ped: 'PED-0043', fac: 'FAC-0043', rec: 'REC-0043',
        cli: clientIds[4] || 1, fecha: '2026-10-16 16:00:00',
        items: [
          { sku: 'JUG-005', cant: 8, precio: 118.75 },  // Q950
          { sku: 'JUG-009', cant: 5, precio: 378.00 }   // Q1,890
        ] // Total Q2,840
      },
      {
        ped: 'PED-0044', fac: 'FAC-0044', rec: null,
        cli: clientIds[2] || 1, fecha: '2026-10-21 11:45:00',
        items: [{ sku: 'JUG-001', cant: 25, precio: 40.00 }], // Q1,000
        pendiente: true,
        abono: 400.00 // Abono parcial, saldo Q600
      },
      {
        ped: 'PED-0045', fac: 'FAC-0045', rec: 'REC-0045',
        cli: clientIds[5] || 1, fecha: '2026-10-23 13:20:00',
        items: [
          { sku: 'JUG-003', cant: 15, precio: 95.00 },  // Q1,425
          { sku: 'JUG-006', cant: 20, precio: 38.25 }   // Q765
        ] // Total Q2,190
      },
      {
        ped: 'PED-0046', fac: 'FAC-0046', rec: 'REC-0046',
        cli: clientIds[6] || 1, fecha: '2026-10-25 15:10:00',
        items: [{ sku: 'JUG-001', cant: 12, precio: 42.50 }] // Q510
      }
    ];

    for (const v of ventasData) {
      const [existingVenta] = await conn.query('SELECT id_venta, estado FROM ventas WHERE numero_factura = ?', [v.fac]);
      if (existingVenta.length > 0 && !v.pendiente && existingVenta[0].estado === 'PENDIENTE') {
        const idVenta = existingVenta[0].id_venta;
        const [vRow] = await conn.query('SELECT saldo_pendiente FROM ventas WHERE id_venta = ?', [idVenta]);
        const dbSaldo = Number(vRow[0].saldo_pendiente);
        if (dbSaldo > 0) {
          const [existingRec] = await conn.query('SELECT id_pago FROM pagos WHERE numero_recibo = ?', [v.rec]);
          const finalRec = existingRec.length === 0 ? v.rec : `${v.rec}-B`;
          await conn.query(
            `INSERT INTO pagos (numero_recibo, id_venta, id_usuario, monto, metodo_pago, fecha_pago)
             VALUES (?, ?, 1, ?, 'EFECTIVO', ?)`,
            [finalRec, idVenta, dbSaldo, v.fecha]
          );
          await conn.query(
            `UPDATE movimientos_inventario
             SET fecha_hora = ?
             WHERE documento_tipo = 'VENTA' AND documento_id = ?`,
            [v.fecha, v.fac]
          );
          await conn.query('UPDATE ventas SET fecha_venta = ? WHERE id_venta = ?', [v.fecha, idVenta]);
        }
      } else if (existingVenta.length === 0) {
        // 1. Crear Pedido en CREADO
        const [pedRes] = await conn.query(
          `INSERT INTO pedidos (numero_pedido, id_cliente, id_usuario_vendedor, estado, subtotal, descuento_total, total, fecha_creacion)
           VALUES (?, ?, 1, 'CREADO', 0.00, 0.00, 0.00, ?)`,
          [v.ped, v.cli, v.fecha]
        );
        const idPed = pedRes.insertId;

        // 2. Detalle de pedido
        for (const it of v.items) {
          const idProd = prodMap[it.sku];
          const subtotalIt = it.cant * it.precio;
          await conn.query(
            `INSERT INTO pedidos_detalle (id_pedido, id_producto, cantidad, precio_escala, porcentaje_descuento_extra, monto_descuento_extra, subtotal)
             VALUES (?, ?, ?, ?, 0.00, 0.00, ?)`,
            [idPed, idProd, it.cant, it.precio, subtotalIt]
          );
        }

        // 3. Aprobar Pedido
        await conn.query('UPDATE pedidos SET estado = "APROBADO" WHERE id_pedido = ?', [idPed]);

        // 4. Crear Venta (trg_ventas_bi copia importes y trg_ventas_ai copia detalle y pasa pedido a EN_PROCESO)
        const [ventaRes] = await conn.query(
          `INSERT INTO ventas (numero_factura, id_pedido, id_usuario, fecha_venta)
           VALUES (?, ?, 1, ?)`,
          [v.fac, idPed, v.fecha]
        );
        const idVenta = ventaRes.insertId;

        // Obtener saldo pendiente real asignado por trg_ventas_bi
        const [vRow] = await conn.query('SELECT total, saldo_pendiente FROM ventas WHERE id_venta = ?', [idVenta]);
        const dbSaldo = Number(vRow[0].saldo_pendiente);

        // 5. Registrar Pagos
        if (!v.pendiente && v.rec) {
          // El pago total por trg_pagos_ai pasa la venta a COMPLETADA,
          // lo que dispara trg_ventas_au que crea SALIDA en movimientos_inventario,
          // y trg_mov_bi descuenta el stock en inventario y cierra el pedido a COMPLETADO.
          await conn.query(
            `INSERT INTO pagos (numero_recibo, id_venta, id_usuario, monto, metodo_pago, fecha_pago)
             VALUES (?, ?, 1, ?, 'EFECTIVO', ?)`,
            [v.rec, idVenta, dbSaldo, v.fecha]
          );

          // Ajustar fecha_hora del movimiento en Kardex para reflejar la fecha histórica de venta
          await conn.query(
            `UPDATE movimientos_inventario
             SET fecha_hora = ?
             WHERE documento_tipo = 'VENTA' AND documento_id = ?`,
            [v.fecha, v.fac]
          );
        } else if (v.pendiente && v.abono) {
          const abonoReal = Math.min(dbSaldo, v.abono);
          await conn.query(
            `INSERT INTO pagos (numero_recibo, id_venta, id_usuario, monto, metodo_pago, fecha_pago)
             VALUES (?, ?, 1, ?, 'EFECTIVO', ?)`,
            ['REC-0044', idVenta, abonoReal, v.fecha]
          );
        }

        // Asegurar fecha_venta histórica
        await conn.query('UPDATE ventas SET fecha_venta = ? WHERE id_venta = ?', [v.fecha, idVenta]);
      }
    }
    console.log('Ventas, pedidos y cobros históricos registrados.');

    // 9. Pedidos pendientes de autorización para el supervisor (Octubre)
    const pedidosPorAutorizar = [
      {
        num: 'PED-0048',
        cli: clientIds[1],
        fecha: '2026-10-26 11:00:00',
        desc: 15.00,
        items: [{ sku: 'JUG-001', cant: 12, precio: 42.50 }]
      },
      {
        num: 'PED-0049',
        cli: clientIds[2] || 1,
        fecha: '2026-10-26 14:20:00',
        desc: 20.00,
        items: [{ sku: 'JUG-004', cant: 6, precio: 144.00 }]
      }
    ];

    for (const p of pedidosPorAutorizar) {
      const [existingPed] = await conn.query('SELECT id_pedido FROM pedidos WHERE numero_pedido = ?', [p.num]);
      if (existingPed.length === 0) {
        // Insertar pedido en CREADO
        const [res] = await conn.query(
          `INSERT INTO pedidos (numero_pedido, id_cliente, id_usuario_vendedor, estado, subtotal, descuento_total, total, requiere_autorizacion, fecha_creacion)
           VALUES (?, ?, 1, 'CREADO', 0.00, 0.00, 0.00, 1, ?)`,
          [p.num, p.cli, p.fecha]
        );
        const idPed = res.insertId;

        for (const it of p.items) {
          const idProd = prodMap[it.sku];
          const subtotalIt = it.cant * it.precio;
          const montoDescIt = Math.round(subtotalIt * (p.desc / 100) * 100) / 100;
          const finalSubtotal = subtotalIt - montoDescIt;

          await conn.query(
            `INSERT INTO pedidos_detalle (id_pedido, id_producto, cantidad, precio_escala, porcentaje_descuento_extra, monto_descuento_extra, subtotal)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [idPed, idProd, it.cant, it.precio, p.desc, montoDescIt, finalSubtotal]
          );
        }

        // Transicionar a PENDIENTE_APROBACION
        await conn.query("UPDATE pedidos SET estado = 'PENDIENTE_APROBACION' WHERE id_pedido = ?", [idPed]);
      }
    }
    console.log('Pedidos por autorizar de demostración creados.');

    // 10. GENERAR PRODUCTOS EN ALERTA DE STOCK (2 productos con stock <= stock_minimo)
    // Producto JUG-008: Pista de carreras acrobática (stock_minimo: 5, ajustar stock a 3)
    // Producto JUG-010: Gimnasio musical para bebés (stock_minimo: 4, ajustar stock a 2)
    const prodsAlerta = [
      { sku: 'JUG-008', targetStock: 3, motivo: 'Ajuste de inventario físico mensual (unidades dañadas en exhibición)' },
      { sku: 'JUG-010', targetStock: 2, motivo: 'Ajuste de inventario físico mensual (merma por empaque averiado)' }
    ];

    for (const pa of prodsAlerta) {
      const idProd = prodMap[pa.sku];
      if (!idProd) continue;

      const [stockRow] = await conn.query('SELECT stock_actual FROM inventario WHERE id_producto = ?', [idProd]);
      const currentStock = stockRow[0]?.stock_actual || 0;

      if (currentStock > pa.targetStock) {
        const delta = pa.targetStock - currentStock; // número negativo
        // Insertar movimiento de AJUSTE: trg_mov_bi actualiza inventario, lo que dispara trg_inventario_au que genera alerta ACTIVA en alertas_inventario
        await conn.query(
          `INSERT INTO movimientos_inventario (id_producto, id_usuario, tipo_movimiento, cantidad, documento_tipo, documento_id, motivo, fecha_hora)
           VALUES (?, 1, 'AJUSTE', ?, 'AJUSTE', 'AJU-0001', ?, '2026-10-26 10:00:00')`,
          [idProd, delta, pa.motivo]
        );
      }
    }
    console.log('Productos en alerta de stock generados.');

  } catch (err) {
    console.error('Error durante la inserción de semillas:', err);
    throw err;
  } finally {
    // 10. Reactivar triggers
    for (const t of triggersToRecreate) {
      await conn.query(t.sql);
    }
    conn.release();
    console.log('Triggers restrictivos reactivados exitosamente.');
  }

  console.log('Registros semilla completados con éxito.');
  process.exit(0);
}

seedDemoData().catch(err => {
  console.error(err);
  process.exit(1);
});
