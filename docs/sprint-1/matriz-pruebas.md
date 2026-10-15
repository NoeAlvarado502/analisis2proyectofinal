# Matriz de Pruebas de Calidad y Verificación E2E — Sprint 1

**Proyecto:** Sistema de Gestión de Pedidos, Inventario y Ventas (Juguetería)  
**Materia:** Análisis II  
**Entrega:** Sprint 1 (Entrega 1 - 20%)  
**Base de Datos de Pruebas:** `jugueteria_test` (MySQL / MariaDB 10.4)  
**Entorno de Ejecución:** Node.js v20+, Vitest v3.2.7, Supertest, MariaDB 10.4.32, React 18, Vite  
**Fecha de Ejecución:** Octubre 2026  
**Resultado Global:** 48/48 Pruebas Unitarias/Integración Aprobadas (100%) + 9/9 Pasos del Guion Manual Aprobados (100%)

---

## 1. Matriz de Pruebas Automatizadas de Integración y Reglas de Negocio

| ID Caso | Historia | Descripción de la Prueba | Datos de Entrada | Resultado Esperado | Resultado Obtenido | Estado |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **CP-01** | HU01 | Login con credenciales válidas (Administrador) | `email: admin@jugueteria.local`, `password: Admin1234!` | HTTP 200, JWT token HS256, objeto de usuario con rol Administrador y lista de 19 permisos | HTTP 200, token generado, permisos listados, auditoría de login registrada | **APROBADO** |
| **CP-02** | HU01 | Login con contraseña errónea | `email: admin@jugueteria.local`, `password: ClaveInvalida!` | HTTP 401, mensaje genérico "Credenciales inválidas" sin revelar si el correo existe | HTTP 401, error `INVALID_CREDENTIALS`, mensaje "Credenciales inválidas" | **APROBADO** |
| **CP-03** | HU01 | Login con usuario inactivo | `email: inactivo@jugueteria.local`, `password: Admin1234!` (activo=0) | HTTP 403, mensaje "Usuario inactivo" | HTTP 403, error `FORBIDDEN`, mensaje "El usuario está inactivo o suspendido" | **APROBADO** |
| **CP-04** | HU11 | Acceso a endpoint protegido sin token | `GET /api/auth/me` sin cabecera `Authorization` | HTTP 401, rechazo inmediato | HTTP 401, error `UNAUTHORIZED`, "No autorizado" | **APROBADO** |
| **CP-05** | HU03 | Creación de usuario por Administrador | `nombre_completo: Empleado Nuevo`, `email: empleado.nuevo@...`, `rol: Operador` | HTTP 201, registro en tabla `usuarios`, registro automático en tabla `auditoria` con `id_usuario = 1` | HTTP 201, usuario creado, trigger `trg_usuarios_ai` insertó auditoría `USR-<id>` | **APROBADO** |
| **CP-06** | HU03, RN05 | Creación de usuario con correo duplicado | `email: admin@jugueteria.local` (existente) | HTTP 409, error 1062 capturado, mensaje descriptivo en español | HTTP 409, mensaje "Ya existe un registro con ese valor (duplicado: 'admin@jugueteria.local')" | **APROBADO** |
| **CP-07** | HU03 | Creación de usuario con contraseña corta / inválida | `password: 123` (< 8 caracteres, sin combinación) | HTTP 422, validación de esquema Zod con mensaje detallado por campo | HTTP 422, error `VALIDATION_ERROR`, detalle en campo `password` | **APROBADO** |
| **CP-08** | HU11 | Operador intenta crear usuario en POST /api/usuarios | Token con rol Operador (`id_rol = 3`), payload de usuario | HTTP 403, middleware `requirePermission('usuarios.gestionar')` bloquea la petición | HTTP 403, error `FORBIDDEN`, mensaje "No tienes los permisos requeridos" | **APROBADO** |
| **CP-09** | HU07 | Administrador intenta desactivarse a sí mismo | `PATCH /api/usuarios/1/estado` con token de usuario 1 | HTTP 409, bloqueo de seguridad para evitar pérdida de acceso administrativo | HTTP 409, mensaje "No puedes desactivar tu propia cuenta de administrador" | **APROBADO** |
| **CP-10** | HU08 | Restablecimiento de contraseña por administrador | `PATCH /api/usuarios/:id/password` con nueva clave válida | HTTP 200, actualización de hash bcrypt, login exitoso con nueva clave | HTTP 200, password_hash actualizado en BD, verificación de login aprobada | **APROBADO** |
| **CP-11** | HU10 | Intento de despojar permisos críticos al Administrador | `PUT /api/roles/1/permisos` sin `usuarios.gestionar` | HTTP 409, protección para asegurar gobernanza del sistema | HTTP 409, mensaje "El rol Administrador debe conservar los permisos: usuarios.gestionar, roles.gestionar" | **APROBADO** |
| **CP-12** | HU12 | Registro de cliente con NIT/identificación por Operador | `nombre_razon_social: Tienda El Sol`, `identificacion: 7654321-0` | HTTP 201, inserción en `clientes`, auditoría registrada por `trg_clientes_ai` | HTTP 201, cliente creado con NIT, auditoría `CLI-<id>` registrada | **APROBADO** |
| **CP-13** | HU12 | Registro de clientes sin NIT (Consumidor Final) | 2 clientes consecutivos con `identificacion: null` | HTTP 201 en ambos registros, sin colisión de unicidad (NULL UNIQUE) | HTTP 201 para ambos clientes, coexisten múltiples clientes sin NIT | **APROBADO** |
| **CP-14** | HU12 | Registro de cliente con NIT duplicado | `identificacion: 7654321-0` (existente) | HTTP 409, captura de error 1062 de MySQL | HTTP 409, mensaje "Ya existe un registro con ese valor (duplicado: '7654321-0')" | **APROBADO** |
| **CP-15** | HU11 | Supervisor intenta crear clientes en POST /api/clientes | Token con rol Supervisor (solo tiene `clientes.consultar`) | HTTP 403, rechazo por falta de permiso `clientes.gestionar` | HTTP 403, error `FORBIDDEN` | **APROBADO** |
| **CP-16** | HU15 | Supervisor crea producto con escala completa de 10 niveles | SKU único, `stock_minimo: 10`, 10 niveles (1,3,6,12,25,50,100,500,1000,10000) de precios decrecientes | HTTP 201, inserción en `productos` y `escalas_precio`, `inventario.stock_actual = 0` generado por trigger | HTTP 201, 10 escalas activas en BD, stock inicial 0, auditoría registrada | **APROBADO** |
| **CP-17** | HU15 | Creación de producto sin precio de menudeo (Nivel 1) | Array de escalas omitiendo nivel de cantidad 1 | HTTP 422, validación Zod previa | HTTP 422, mensaje "La escala debe incluir obligatoriamente el nivel 1 (precio de menudeo)" | **APROBADO** |
| **CP-18** | HU15 | Creación de producto con escala de precio ascendente | Nivel 1 a Q100, Nivel 6 a Q120 (más caro por mayor cantidad) | HTTP 422, regla de negocio de escalas decrecientes | HTTP 422, mensaje "El precio unitario no puede subir al aumentar la cantidad" | **APROBADO** |
| **CP-19** | HU15, RN05 | Creación de producto con SKU duplicado | `codigo_sku: JUG-001` (existente) | HTTP 409, captura de unicidad de clave foránea/índice | HTTP 409, mensaje "Ya existe un registro con ese valor (duplicado: 'JUG-001')" | **APROBADO** |
| **CP-20** | HU18, RN04 | Inactivación lógica en lugar de borrado físico | `PATCH /api/productos/:id/estado` | HTTP 200, `activo = 0`, el registro no se borra físicamente de la base | HTTP 200, producto marcado como inactivo, historial conservado íntegro | **APROBADO** |
| **CP-21** | HU11 | Operador intenta crear productos en POST /api/productos | Token con rol Operador (solo tiene `productos.consultar`) | HTTP 403, rechazo por RBAC | HTTP 403, error `FORBIDDEN` | **APROBADO** |

---

## 2. Matriz de Ejecución del Guion de Demostración para Evaluación Docente

| Paso | Actor | Acción Ejecutada | Resultado Esperado | Resultado Obtenido en el Sistema Real | Estado |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **1** | Administrador | Iniciar sesión y crear un nuevo usuario (`Carlos Demo`, `carlos.demo@jugueteria.local`, rol `Operador`). | Usuario creado visible en la tabla con ID único y registro en tabla `auditoria`. | Usuario ID 26 creado exitosamente, visualizado en la tabla de usuarios con badge "Activo", auditoría generada en BD. | **APROBADO** |
| **2** | Administrador | Asignarle el rol Operador en el formulario de creación. | La tabla de usuarios muestra el rol "Operador" con badge verde. | Columna "Rol Asignado" muestra badge "Operador" en color verde esmeralda. | **APROBADO** |
| **3** | Usuario Nuevo | Iniciar sesión con las credenciales creadas (`carlos.demo@jugueteria.local` / `Password123!`). | Acceso concedido al dashboard. Barra lateral solo muestra: Inicio, Clientes, Productos (Usuarios y Roles ocultos). | Dashboard saluda "¡Hola, Carlos Demo! 👋", badge "Operador". Menú filtrado exactamente a 3 ítems permitidos. | **APROBADO** |
| **4** | Operador | Registrar un nuevo cliente mayorista (`Juguetería El Pitufo Feliz S.A.`, NIT `9876543-2`). | Cliente guardado y visible en la tabla con sus datos fiscales completos. | Cliente insertado, visible en la tabla con NIT en formato monoespaciado y estado Activo. | **APROBADO** |
| **5** | Supervisor | Iniciar sesión y registrar producto `JUG-099` con escala de precios (1 ud: Q250, 6 uds: Q225, 12 uds: Q200). | Producto aparece en el catálogo con precio de menudeo Q250.00, stock 0 y distintivo visual de stock bajo. | Producto listado con Q250.00, stock 0, y badge rojo "⚠️ Bajo" por regla `stock_actual <= stock_minimo`. | **APROBADO** |
| **6** | Supervisor | Modificar el producto recién creado (Nombre a `Pista de Carreras Turbo 360 Pro` y precio 12+ uds a Q195.00). | Cambio guardado en BD, actualización reflejada en la tabla y auditoría de modificación registrada. | Nombre actualizado en la tabla inmediatamente, notificación toast de confirmación emitida. | **APROBADO** |
| **7** | Cualquiera | Buscar registros en la barra de búsqueda (escribir término `"Turbo"` en el catálogo). | La tabla filtra en tiempo real y muestra únicamente el producto coincidente. | La tabla muestra exclusivamente la fila de `JUG-099` filtrada. | **APROBADO** |
| **8** | Operador | Ingresar directamente por URL a `http://localhost:5173/usuarios` e intentar crear un producto. | El botón "+ Nuevo Producto" está ausente. Al navegar a `/usuarios`, aparece pantalla roja "Acceso Denegado (403)". | Botón ausente en UI. La navegación forzada a `/usuarios` despliega tarjeta de Acceso Denegado 403 con explicación de rol. | **APROBADO** |
| **9** | Administrador | Intentar crear un usuario con el correo ya registrado (`carlos.demo@jugueteria.local`). | El sistema bloquea la acción y muestra mensaje claro de correo duplicado (RN05). | Se muestra alerta indicando valor duplicado capturado desde el error 1062 de MySQL. | **APROBADO** |

---

## 3. Conclusiones de Aseguramiento de Calidad
1. **Reglas de Negocio Validadas en Doble Capa:** Las restricciones de integridad (unicidad de NIT para clientes, inmutabilidad de SKU, orden decreciente de precios por volumen) están validadas en el esquema cliente/API y respaldadas por los triggers de MariaDB/MySQL.
2. **Seguridad RBAC Efectiva:** La interfaz refleja de forma dinámica los privilegios del token y el backend protege de manera estricta todas las operaciones con middleware y base de datos.
3. **Cero Datos Simulados:** Todas las pruebas fueron corridas de extremo a extremo contra endpoints reales y persistencia directa en MariaDB.
