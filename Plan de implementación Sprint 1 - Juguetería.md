# Plan de implementación del Sprint 1 (Entrega 1)

Sistema de Gestión de Pedidos, Inventario y Ventas · Juguetería · Análisis II · Documento para ser ejecutado por un agente de IA de desarrollo

## 0. Reglas de trabajo del agente

1. Ejecuta las partes en orden (Parte 0 a Parte 10). Cada parte termina con criterios de salida verificables; si alguno falla, corrígelo antes de continuar.
2. Una rama por parte (feature/parte-N-nombre), commits en formato Conventional Commits (feat:, fix:, test:, docs:, chore:) y merge a develop al cumplir los criterios de salida. Al final crea el tag v0.1.0-sprint1.
3. Toda decisión que este plan no cubra se resuelve con la opción más simple y se registra en docs/sprint-1/bitacora-decisiones.md (fecha, situación, decisión, motivo, resultado).
4. No cambies el esquema SQL en silencio. Si hay que corregirlo, hazlo de forma mínima, anótalo en la bitácora e infórmalo en el resumen final.
5. Nunca inventes evidencia de Scrum. Planning, Daily Scrum, Review y Retrospective ocurren con las personas reales. El agente solo prepara plantillas y borradores marcados con \[PENDIENTE: completar por el equipo\]. Las capturas de pantalla sí las puedes generar, siempre desde el sistema real en ejecución.
6. Todo lo visible debe funcionar. El PDF no acepta botones sin función ni datos simulados: no pongas en el menú módulos que aún no existen.
7. Las reglas de negocio ya viven en la base (triggers). El backend las respeta y muestra sus mensajes; no las reimplementes de forma distinta.

Los documentos de docs/sprint-1 se redactan como trabajo del equipo y no mencionan herramientas de apoyo. Eso no cambia la regla 5: las ceremonias y la evidencia deben ser reales, y quien presente el proyecto debe poder explicar y modificar en vivo cualquier parte del código durante la defensa.

## 1. Contexto

### 1.1 Equipo y roles Scrum

| Persona | Rol Scrum | Responsabilidad en este sprint |
| --- | --- | --- |
| Raúl | Product Owner | Prioriza el backlog, aprueba criterios de aceptación y Sprint Goal |
| Kevin | Scrum Master | Facilita ceremonias y custodia las evidencias reales |
| Noé | Developer | Líder técnico: desarrolla y revisa el código del proyecto |

### 1.2 Stack

- Backend: Node.js 20+ (ES modules), Express 4, mysql2/promise con SQL directo (sin ORM: así se controlan mejor los triggers y la variable de sesión @usuario\_actual, y es más fácil de explicar en la defensa), zod, bcryptjs, jsonwebtoken, helmet, morgan, express-rate-limit, dotenv. Pruebas: vitest y supertest.
- Frontend: React 18 con Vite (JavaScript), react-router-dom 6, axios y CSS propio (sin librerías de UI).
- Base de datos: MySQL 8.0.16 o superior con database/jugueteria\_db.sql (22 tablas, 52 triggers, vistas).
- Idioma: interfaz y mensajes en español. Los campos JSON de la API usan los mismos nombres de columna de la BD (snake\_case) para evitar mapeos.

### 1.3 Alcance del Sprint 1

- Entra: base de datos, inicio de sesión, usuarios, roles, permisos, clientes, productos (con escala de precios, categorías y marcas), menú principal, validaciones básicas y restricción de acceso por rol.
- No entra: proveedores, compras, movimientos de inventario (el stock solo se muestra en lectura), pedidos, ventas, pagos, reportes y dashboard con gráficas.

### 1.4 Contrato con la base de datos (leer completo antes de programar)

1. El script contiene DELIMITER, que es una directiva del cliente mysql. Cárgalo con el CLI (mysql -u root -p < database/jugueteria\_db.sql), nunca con mysql2.
2. Toda escritura debe ejecutarse en una conexión donde se haya hecho SET @usuario\_actual = id\_usuario. Sin esa variable, los triggers de auditoría rechazan la operación. Implementa un helper withUser(userId, fn) que toma una conexión del pool, fija la variable, abre transacción, ejecuta, hace commit o rollback, restablece la variable a NULL y libera la conexión.
3. Los errores de reglas de negocio llegan como SQLSTATE 45000 con el mensaje en sqlMessage (español, sin tildes). Se devuelven al cliente tal cual con HTTP 409.
4. El inventario no se toca. El stock se lee de la vista v\_catalogo.
5. Productos y clientes no se eliminan (RN04): se usa activo = 0. No existe endpoint DELETE para ninguna entidad.
6. Los usuarios semilla tienen password\_hash = REEMPLAZAR\_HASH. Un script de seed debe asignarles un hash bcrypt real.
7. clientes.identificacion es NULL UNIQUE: una cadena vacía debe convertirse a null antes de guardar, o dos clientes sin NIT chocarán.
8. Escalas de precio: un trigger exige que el precio no suba al aumentar el nivel. Para guardar la escala de un producto usa este patrón dentro de una transacción: (a) UPDATE escalas\_precio SET activo = 0 WHERE id\_producto = ?; (b) por cada nivel recibido, INSERT ... ON DUPLICATE KEY UPDATE precio\_unitario = VALUES(precio\_unitario), activo = 1. Así el orden de inserción no provoca falsos rechazos.
9. La auditoría ya se genera sola para usuarios, clientes y productos. El login se registra aparte con CALL sp\_auditar('Usuarios', 'Login', 'USR-id', NULL, JSON) dentro de withUser.

## 2. Historias de usuario del Sprint 1

| ID | Historia | Prioridad | Partes |
| --- | --- | --- | --- |
| HU01 | Como usuario quiero iniciar sesión con correo y contraseña para acceder según mi rol | Alta | 2, 6 |
| HU02 | Como usuario quiero cerrar sesión y que la sesión expire para proteger el sistema | Media | 2, 6 |
| HU03 | Como administrador quiero crear usuarios para dar acceso al personal | Alta | 3, 7 |
| HU04 | Como administrador quiero asignar un rol a un usuario para definir lo que puede hacer | Alta | 3, 7 |
| HU05 | Como administrador quiero consultar y buscar usuarios | Alta | 3, 7 |
| HU06 | Como administrador quiero modificar los datos de un usuario | Alta | 3, 7 |
| HU07 | Como administrador quiero activar o desactivar usuarios sin borrarlos | Media | 3, 7 |
| HU08 | Como administrador quiero restablecer la contraseña de un usuario | Media | 3, 7 |
| HU09 | Como administrador quiero consultar los roles y su matriz de permisos | Alta | 3, 7 |
| HU10 | Como administrador quiero editar los permisos de un rol | Media | 3, 7 |
| HU11 | Como sistema quiero bloquear funciones a quien no tiene permiso, en API y en pantallas | Alta | 2, 6 |
| HU12 | Como operador quiero registrar clientes | Alta | 4, 7 |
| HU13 | Como operador quiero consultar y buscar clientes | Alta | 4, 7 |
| HU14 | Como operador quiero modificar o desactivar clientes | Media | 4, 7 |
| HU15 | Como supervisor quiero registrar productos con su escala de precios por cantidad | Alta | 5, 7 |
| HU16 | Como usuario autorizado quiero consultar y filtrar productos con precio de menudeo y stock | Alta | 5, 7 |
| HU17 | Como supervisor quiero modificar productos y sus escalas | Alta | 5, 7 |
| HU18 | Como supervisor quiero inactivar productos en lugar de eliminarlos (RN04) | Media | 5, 7 |
| HU19 | Como supervisor quiero administrar categorías y marcas | Media | 5, 7 |
| HU20 | Como usuario quiero un menú principal que muestre solo los módulos permitidos para mi rol | Alta | 6 |

Backlog posterior (no se desarrolla ahora, pero debe aparecer en el Product Backlog): HU21 proveedores, HU22 compras con detalle, HU23 recepción que genera entrada de inventario, HU24 consulta de inventario y kardex, HU25 alertas de stock mínimo, HU26 pedido con validación de existencia, HU27 aprobación de descuentos, HU28 venta desde pedido aprobado, HU29 registro de pagos, HU30 consulta de auditoría, HU31 dashboard con gráficas, HU32 reportes con filtro por fechas y exportación.

Los puntos de historia y la selección final del Sprint Backlog los definen Raúl y el equipo en el Sprint Planning real. El agente solo propone una estimación inicial marcada como propuesta.

## 3. Estructura del repositorio

```
jugueteria/
  database/jugueteria_db.sql
  backend/
    src/ config/ db/ middleware/ modules/(auth, usuarios, roles, clientes, productos) utils/
    src/app.js  src/server.js
    scripts/seed-passwords.js
    tests/
    .env.example
  frontend/
    src/ api/ auth/ components/ pages/ routes/ styles/
    vite.config.js   (proxy /api -> http://localhost:3000)
  docs/sprint-1/ (documentación, bitácora, matriz de pruebas, evidencias)
  README.md
```

Cada módulo del backend tiene routes, controller, service y schema (zod). Las consultas SQL viven solo en el service.

## 4. Partes de implementación

### Parte 0. Preparación del repositorio y validación de la base (tamaño S)

Tareas:

- Verificar prerrequisitos: node -v (20 o superior), mysql --version (8.0.16 o superior), git.
- git init, .gitignore, ramas main y develop, estructura de carpetas de la sección 3.
- Copiar jugueteria\_db.sql a database/ y cargarlo en una base vacía con el CLI de mysql.
- Validar con consultas de humo: 22 tablas; SHOW TRIGGERS devuelve 52; hay 3 roles, 19 permisos y 3 usuarios; v\_catalogo devuelve 3 productos con stock; existe una alerta activa para JUG-003.
- Pruebas de reglas directamente en SQL: un UPDATE manual a inventario falla con el mensaje de inventario no modificable; un INSERT de usuario con email repetido falla con error 1062; una escala con precio mayor en un nivel superior falla; el bloque de prueba rápida comentado al final del script (pedido, venta, pago, kardex) corre completo.
- Si el script tiene errores de sintaxis (no fue ejecutado antes de entregarse), corrígelos de forma mínima y regístralos en la bitácora.
- Agregar scripts de apoyo: database/reset.sh que hace DROP DATABASE IF EXISTS y recarga el script.

Criterios de salida: base cargada sin errores, todas las verificaciones de humo correctas, commit chore.

### Parte 1. Backend base (tamaño M)

HU: transversal.

Tareas:

- npm init con type module e instalar dependencias (sección 1.2).
- src/config/env.js: valida variables con zod y falla al arrancar si faltan. Variables: PORT, DB\_HOST, DB\_PORT, DB\_USER, DB\_PASSWORD, DB\_NAME, JWT\_SECRET, JWT\_EXPIRES\_IN (8h). Entregar .env.example.
- src/db/pool.js: createPool de mysql2/promise con decimalNumbers activado y charset utf8mb4.
- src/db/withUser.js: helper descrito en la sección 1.4, punto 2. Debe aceptar también la IP de origen (@ip\_origen).
- src/app.js (sin listen, para poder probar con supertest) y src/server.js. Middlewares: helmet, morgan, express.json, rutas bajo /api, notFound y errorHandler.
- errorHandler: ZodError a 422 con detalle por campo; error 1062 a 409 con mensaje amigable (ej. Ya existe un usuario con ese correo); SQLSTATE 45000 a 409 con sqlMessage; errores de llave foránea (1451 y 1452) a 409; cualquier otro a 500 con mensaje genérico y log interno. Formato de error: un objeto con la clave error que contiene code, message y details.
- Utilidades: paginación (page, limit con máximo 100) y respuesta estándar con data y meta.
- GET /api/health que ejecuta SELECT 1.

Criterios de salida: npm run dev levanta el servidor; /api/health responde 200; prueba unitaria del errorHandler para cada mapeo.

### Parte 2. Autenticación y autorización (tamaño M)

HU01, HU02, HU11.

Tareas:

- scripts/seed-passwords.js (npm run seed:passwords): asigna hash bcrypt (costo 10) a los tres usuarios de demostración. La contraseña sale de DEMO\_PASSWORD en el .env; documenta en el README que es solo para demostración. Los correos son admin@jugueteria.local, supervisor@jugueteria.local y operador@jugueteria.local.
- POST /api/auth/login con email y password. Respuesta: token JWT (HS256), datos del usuario con su rol y la lista de códigos de permiso. Reglas: mensaje único Credenciales inválidas para correo o clave erróneos (no revelar cuál); usuario inactivo recibe 403; rate limit de 10 intentos por 15 minutos; actualizar ultimo\_login; registrar auditoría Login con withUser.
- GET /api/auth/me devuelve el usuario y sus permisos vigentes.
- Middleware requireAuth: verifica el JWT y recarga el usuario desde la BD en cada petición, de modo que desactivar un usuario o cambiar su rol surte efecto de inmediato.
- Middleware requirePermission(...codigos): permite el acceso si el usuario tiene al menos uno de los códigos; si no, 403 con mensaje claro.
- El cierre de sesión es del lado del cliente (borrar el token). Opcional: registrar auditoría de Logout.

Criterios de salida: pruebas con supertest para login correcto, clave incorrecta, usuario inactivo, acceso sin token (401) y acceso sin permiso (403).

### Parte 3. Usuarios, roles y permisos en el backend (tamaño M)

HU03 a HU10.

Endpoints (permisos en la sección 5):

- GET /api/usuarios con q, page, limit y filtro de estado; GET /api/usuarios/:id.
- POST /api/usuarios (nombre\_completo, email, password, id\_rol). PUT /api/usuarios/:id (nombre\_completo, email, id\_rol). PATCH /api/usuarios/:id/estado. PATCH /api/usuarios/:id/password (restablecimiento por administrador).
- GET /api/roles (con conteo de permisos), GET /api/roles/:id (con sus permisos), GET /api/permisos (agrupados por módulo), PUT /api/roles/:id/permisos (reemplaza la lista de permisos del rol dentro de una transacción).

Reglas y validaciones:

- Correo con formato válido y único (RN05, el mensaje lo da el error 1062). Contraseña de mínimo 8 caracteres con letra y número. Nombre obligatorio. El rol debe existir.
- Nunca devolver password\_hash.
- Un administrador no puede desactivarse a sí mismo ni cambiar su propio rol. Siempre debe quedar al menos un administrador activo.
- El rol Administrador no puede perder los permisos usuarios.gestionar y roles.gestionar (evita bloqueo total).
- Cada escritura usa withUser con el id del usuario autenticado.

Criterios de salida: pruebas de creación, correo duplicado (409), contraseña corta (422), un operador recibe 403 en POST /api/usuarios, y la edición de permisos de un rol se refleja en /api/auth/me.

### Parte 4. Clientes en el backend (tamaño S)

HU12, HU13, HU14.

Endpoints: GET /api/clientes (q busca por nombre, identificación, teléfono o correo; paginado), GET /api/clientes/:id, POST, PUT y PATCH /:id/estado.

Validaciones: nombre\_razon\_social obligatorio; identificación opcional pero única (cadena vacía se guarda como NULL); correo con formato válido si se envía; teléfono con caracteres válidos.

Criterios de salida: pruebas de creación con y sin identificación (dos clientes sin NIT deben convivir), identificación duplicada (409), modificación y desactivación, y que el supervisor pueda consultar pero no crear (403).

### Parte 5. Productos, categorías, marcas y escalas en el backend (tamaño M)

HU15 a HU19.

Endpoints:

- GET /api/productos (usa la vista v\_catalogo; filtros q, id\_categoria, activo; paginado), GET /api/productos/:id (incluye las escalas activas).
- POST /api/productos: datos del producto más el arreglo escalas. PUT /api/productos/:id. PATCH /api/productos/:id/estado.
- GET y POST de /api/categorias y /api/marcas.

Reglas y validaciones:

- codigo\_sku obligatorio, en mayúsculas, único y no editable después de crear (decisión de bitácora: es el identificador que aparece en la auditoría).
- Categoría existente, stock\_minimo entero mayor o igual a 0, edad\_minima\_meses entero mayor o igual a 0 o nulo.
- escalas: cada cantidad\_minima debe estar en la lista 1, 3, 6, 12, 25, 50, 100, 500, 1000, 10000; precio mayor que 0; no repetir niveles; el nivel 1 es obligatorio (precio de menudeo); los precios no pueden subir al aumentar el nivel. Valida esto en el schema antes de llegar a la BD para dar un mensaje claro y deja el trigger como segunda barrera.
- La creación o modificación del producto y de sus escalas ocurre en una sola transacción usando el patrón de la sección 1.4, punto 8.
- El stock se muestra, pero no existe ningún campo editable de stock. El stock inicial es 0 (lo crea el trigger).
- No hay DELETE: inactivar con PATCH.

Criterios de salida: pruebas de creación con escala completa, nivel 1 ausente (422), precios no decrecientes (422), SKU duplicado (409), modificación de escalas, inactivación, y que se genere el registro de auditoría con el usuario correcto.

### Parte 6. Frontend base (tamaño M)

HU01, HU02, HU11, HU20.

Tareas:

- Crear el proyecto con Vite y React; configurar el proxy /api hacia el backend; estructura de la sección 3.
- src/api/client.js con axios: agrega el token en cada petición; ante un 401 limpia la sesión y redirige a /login; ante un 403 muestra el aviso de acceso denegado.
- AuthContext: login, logout, usuario, permisos y función can(codigo). El token se guarda en localStorage (decisión de bitácora: suficiente para el alcance académico; riesgos conocidos). Al recargar la página se restaura la sesión llamando a /api/auth/me.
- Rutas: /login (pública), layout protegido con barra lateral y encabezado (nombre, rol y botón Cerrar sesión), /inicio, y una página Acceso denegado.
- ProtectedRoute con permiso requerido: si el usuario entra por URL directa a una ruta sin permiso, ve la página Acceso denegado (no una redirección silenciosa).
- El menú se genera desde una configuración con el permiso de cada ítem y muestra solo lo permitido. Ítems de este sprint: Inicio, Usuarios, Roles y permisos, Clientes, Productos.
- Componentes reutilizables: DataTable con búsqueda y paginación, FormField con error en línea, Modal, Toast, PermissionGate (oculta botones sin permiso).
- Página Inicio: saludo, rol, y los módulos disponibles para ese usuario.

Criterios de salida: login funcional con los tres usuarios de demostración; cada rol ve un menú distinto; entrar por URL a /usuarios con el operador muestra Acceso denegado; cerrar sesión limpia todo.

### Parte 7. Frontend de los módulos (tamaño L)

HU03 a HU10, HU12 a HU19.

Páginas, cada una conectada a la API real (nada simulado):

- Usuarios: tabla con búsqueda y filtro de estado; formulario de crear y editar con selector de rol; activar o desactivar con confirmación; restablecer contraseña.
- Roles y permisos: lista de roles; vista de matriz (módulo y permiso con casillas) editable solo para quien tenga roles.gestionar; guardar con confirmación.
- Clientes: tabla con búsqueda; formulario de crear y editar; desactivar. Los botones de escritura solo aparecen con clientes.gestionar.
- Productos: tabla con SKU, nombre, categoría, precio de menudeo, stock (solo lectura, con distintivo cuando está en o bajo el mínimo) y estado; formulario con los datos del producto y una tabla editable de los 10 niveles de la escala (solo el nivel 1 es obligatorio); inactivar con confirmación. Crear categoría y marca desde el formulario.
- Validación en cliente (campos obligatorios, formato de correo, contraseña, precios positivos y decrecientes) y mostrar siempre los errores que devuelve el servidor, incluidos los mensajes de los triggers.
- Estados de carga, vacío y error en todas las tablas.
- Opcional si todo lo anterior está completo: página Auditoría (GET /api/auditoria con filtros por módulo, usuario y fecha), útil como evidencia.

Criterios de salida: se completa de principio a fin el guion de demostración de la sección 6, sin errores en consola y sin botones sin función.

### Parte 8. Pruebas y verificación de extremo a extremo (tamaño M)

Tareas:

- Configurar una base de pruebas jugueteria\_test cargada con el mismo script y un .env.test; las pruebas de integración se ejecutan con npm test.
- Matriz de pruebas en docs/sprint-1/matriz-pruebas.md con columnas: ID del caso, historia, descripción, datos, resultado esperado, resultado obtenido, estado. Cubre como mínimo estos casos: login correcto, login fallido, usuario inactivo, correo duplicado (RN05), contraseña inválida, operador sin acceso a usuarios, operador sin permiso para crear productos, supervisor crea producto con escala, escala no decreciente rechazada, clientes sin identificación, identificación duplicada, inactivación de producto en lugar de eliminación (RN04) y auditoría con el usuario correcto.
- Ejecutar el guion de la sección 6 manualmente contra el sistema real y anotar el resultado obtenido de cada paso.

Criterios de salida: todas las pruebas automáticas pasan; la matriz está completa con resultados reales.

### Parte 9. Documentación del Sprint 1 y evidencias (tamaño L)

Crear en docs/sprint-1/ un archivo por entregable, en español y en Markdown:

| Archivo | Contenido | Quién valida |
| --- | --- | --- |
| 01-problema-objetivos-alcance.md | Descripción del problema (tomada del escenario del PDF), objetivo general, objetivos específicos, alcance inicial y exclusiones | Raúl |
| 02-actores-requerimientos.md | Actores (Administrador, Supervisor, Operador, Docente evaluador) y requerimientos funcionales RF y no funcionales RNF iniciales | Raúl |
| 03-product-backlog.md | Backlog completo con HU01 a HU32, prioridad y sprint objetivo; estimación marcada como propuesta | Raúl |
| 04-historias-criterios.md | Cada historia de las 20 con criterios de aceptación en formato Dado, Cuando, Entonces (mínimo 2 por historia) | Raúl |
| 05-sprint-goal-backlog.md | Sprint Goal propuesto y Sprint Backlog con tareas técnicas por historia | Raúl y equipo |
| 06-casos-de-uso.md | Diagrama de casos de uso inicial en Mermaid con los tres actores y los casos CU de HU01 a HU20 | Noé |
| 07-modelo-er.md | Diagrama entidad-relación en Mermaid (erDiagram) de las entidades del sprint: roles, permisos, rol\_permisos, usuarios, clientes, categorias, marcas, productos, escalas\_precio, inventario y auditoria, más una nota sobre el resto del modelo | Noé |
| 08-trazabilidad.md | Matriz inicial: necesidad, requerimiento, historia, funcionalidad, caso de prueba, estado | Kevin |
| 09-bitacora-decisiones.md | Decisiones reales tomadas durante el sprint (incluye: SQL directo sin ORM, JWT en localStorage, SKU inmutable, patrón de escalas, escala por producto) | Kevin |
| 10-registro-del-sprint.md | Las 9 secciones del Registro del Sprint exigido por el PDF. El agente rellena con datos reales: qué se desarrolló (a partir de git log y pruebas), problemas encontrados y cómo se resolvieron, y evidencias. Deja pendientes: Sprint Goal esperado, qué quedó pendiente, qué cambió y la retrospectiva | Kevin |
| 11-ceremonias.md | Plantillas listas para llenar: Sprint Planning, Daily Scrum (tabla por día y por persona), Sprint Review y Sprint Retrospective (qué salió bien, mal y qué mejorar). Todo marcado como PENDIENTE | Kevin |
| 12-evidencia-funcional.md | Tabla con columnas funcionalidad desarrollada, historia relacionada, captura y resultado obtenido | Noé |

Capturas: genera las imágenes con Playwright contra el sistema real, en docs/sprint-1/evidencias/ con nombres como HU03-crear-usuario.png. Cada captura corresponde a un paso del guion de la sección 6 y el resultado obtenido se escribe a partir de lo observado, no de lo esperado. Incluye también capturas del acceso denegado y de los mensajes de error de las reglas.

Criterios de salida: los 12 archivos existen, no contienen datos inventados de ceremonias, y todo lo pendiente está marcado de forma visible.

### Parte 10. Cierre y entrega (tamaño S)

Tareas:

- README.md en la raíz con prerrequisitos, instalación paso a paso (cargar la base, .env, seed:passwords, arrancar backend y frontend), usuarios de demostración y cómo correr las pruebas.
- Probar la instalación desde cero siguiendo solo el README en una carpeta limpia.
- Revisar la lista de la sección 7 (Definition of Done), merge final a main y tag v0.1.0-sprint1.
- Resumen final para el equipo: qué se hizo, qué cambió respecto al plan, correcciones al SQL, riesgos y pendientes.

Criterios de salida: la instalación desde cero funciona y la lista de la sección 7 está completa.

## 5. Permisos requeridos por endpoint

| Endpoint | Permiso |
| --- | --- |
| POST /api/auth/login | Público |
| GET /api/auth/me | Usuario autenticado |
| GET, POST, PUT, PATCH /api/usuarios y subrutas | usuarios.gestionar |
| GET /api/roles, GET /api/permisos | roles.gestionar o usuarios.gestionar |
| PUT /api/roles/:id/permisos | roles.gestionar |
| GET /api/clientes y /api/clientes/:id | clientes.consultar |
| POST, PUT, PATCH /api/clientes | clientes.gestionar |
| GET /api/productos, /api/categorias, /api/marcas | productos.consultar |
| POST, PUT, PATCH /api/productos; POST /api/categorias y /api/marcas | productos.gestionar |
| GET /api/auditoria (opcional) | auditoria.consultar |

Los permisos por rol ya están sembrados en la base: el Administrador tiene todos; el Supervisor gestiona productos y consulta clientes; el Operador gestiona clientes y consulta productos.

## 6. Guion de demostración para el docente

| Paso | Quién actúa | Acción | Resultado esperado |
| --- | --- | --- | --- |
| 1 | Administrador | Crear usuario nuevo | Aparece en la lista; queda registro en auditoría |
| 2 | Administrador | Asignarle el rol Operador | La lista muestra el rol asignado |
| 3 | Usuario nuevo | Iniciar sesión | Entra y ve solo el menú de Operador |
| 4 | Operador | Crear un cliente | Cliente visible en la tabla |
| 5 | Supervisor | Crear un producto con escala de precios | Producto visible con precio de menudeo y stock 0 |
| 6 | Supervisor | Modificar el producto (nombre o precio de un nivel) | Cambio guardado y auditado |
| 7 | Cualquiera | Consultar y buscar registros | Resultados filtrados correctos |
| 8 | Operador | Entrar por URL a /usuarios e intentar crear un producto | Pantalla Acceso denegado y respuesta 403 de la API |
| 9 | Administrador | Intentar crear un usuario con correo repetido | Mensaje de correo duplicado (RN05) |

## 7. Definition of Done del Sprint 1

- La historia cumple todos sus criterios de aceptación y fue probada manualmente.
- Tiene pruebas automáticas que pasan; no hay errores en la consola del navegador ni del servidor durante el guion.
- La API valida las entradas y devuelve mensajes de error comprensibles; el frontend los muestra.
- Los permisos se aplican en el backend y se reflejan en el frontend.
- Las escrituras quedan auditadas con el usuario correcto.
- No hay botones sin función ni datos simulados.
- El código está en develop con commits convencionales, sin secretos en el repositorio (.env fuera de git).
- La documentación del sprint está actualizada y la evidencia proviene del sistema real.
- El Product Owner revisó la historia (Review real, a cargo del equipo).

## 8. Puntos de control con el equipo

| Momento | Quién | Qué debe confirmar |
| --- | --- | --- |
| Antes de la Parte 0 | Noé | Versiones de Node y MySQL instaladas; credenciales de la base |
| Al terminar la Parte 0 | Noé | Resultado de la validación del SQL y correcciones aplicadas |
| Antes de la Parte 9 | Raúl | Sprint Goal, selección del Sprint Backlog y criterios de aceptación |
| Durante todo el sprint | Kevin | Ceremonias reales; completar plantillas con fechas y asistentes reales |
| Al terminar la Parte 7 | Noé y Raúl | Revisión funcional con el guion de demostración |
| Al terminar la Parte 10 | Todo el equipo | Sprint Review y Retrospective reales; firma de la entrega |
