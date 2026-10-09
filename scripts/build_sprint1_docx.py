import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

from docx_helpers import (
    set_cell_background,
    set_cell_margins,
    set_table_borders,
    format_table_header,
    format_table_row,
    add_callout
)

def create_document():
    doc = docx.Document()

    # Configure Margins (1 inch everywhere)
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)
        section.header_distance = Inches(0.5)
        section.footer_distance = Inches(0.5)

    # Styles setup
    style_normal = doc.styles['Normal']
    font = style_normal.font
    font.name = 'Arial'
    font.size = Pt(10)
    font.color.rgb = RGBColor(30, 41, 59)

    def add_h1(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(18)
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.bold = True
        run.font.name = 'Arial'
        run.font.size = Pt(16)
        run.font.color.rgb = RGBColor(15, 46, 89) # Navy Executive
        return p

    def add_h2(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(14)
        p.paragraph_format.space_after = Pt(4)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.bold = True
        run.font.name = 'Arial'
        run.font.size = Pt(13)
        run.font.color.rgb = RGBColor(2, 132, 199) # Toy Cerulean
        return p

    def add_h3(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(10)
        p.paragraph_format.space_after = Pt(2)
        p.paragraph_format.keep_with_next = True
        run = p.add_run(text)
        run.bold = True
        run.font.name = 'Arial'
        run.font.size = Pt(11)
        run.font.color.rgb = RGBColor(30, 41, 59)
        return p

    def add_body(text):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(5)
        p.paragraph_format.line_spacing = 1.15
        run = p.add_run(text)
        run.font.name = 'Arial'
        run.font.size = Pt(10)
        run.font.color.rgb = RGBColor(51, 65, 85)
        return p

    def add_bullet(bold_prefix, text):
        p = doc.add_paragraph(style='List Bullet')
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.line_spacing = 1.15
        r_b = p.add_run(bold_prefix)
        r_b.bold = True
        r_b.font.name = 'Arial'
        r_b.font.size = Pt(10)
        r_b.font.color.rgb = RGBColor(15, 46, 89)
        r_t = p.add_run(text)
        r_t.font.name = 'Arial'
        r_t.font.size = Pt(10)
        r_t.font.color.rgb = RGBColor(51, 65, 85)
        return p

    # =========================================================================
    # PORTADA FORMAL
    # =========================================================================
    p_inst = doc.add_paragraph()
    p_inst.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_inst.paragraph_format.space_before = Pt(36)
    p_inst.paragraph_format.space_after = Pt(4)
    r = p_inst.add_run("UNIVERSIDAD DE GUATEMALA\nFACULTAD DE INGENIERÍA EN SISTEMAS\nCURSO: ANÁLISIS Y DISEÑO DE SISTEMAS II")
    r.bold = True
    r.font.name = 'Arial'
    r.font.size = Pt(12)
    r.font.color.rgb = RGBColor(100, 116, 139)

    doc.add_paragraph().paragraph_format.space_after = Pt(30)

    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_after = Pt(10)
    r_t = p_title.add_run("ENTREGA 1 – SPRINT 1\nBASE DEL SISTEMA Y PRIMER INCREMENTO FUNCIONAL")
    r_t.bold = True
    r_t.font.name = 'Arial'
    r_t.font.size = Pt(20)
    r_t.font.color.rgb = RGBColor(15, 46, 89)

    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub.paragraph_format.space_after = Pt(24)
    r_s = p_sub.add_run("Sistema de Gestión de Pedidos, Inventario y Ventas · Juguetería Quetzal")
    r_s.italic = True
    r_s.font.name = 'Arial'
    r_s.font.size = Pt(13)
    r_s.font.color.rgb = RGBColor(2, 132, 199)

    doc.add_paragraph().paragraph_format.space_after = Pt(60)

    # Equipo Table
    tbl_eq = doc.add_table(rows=1, cols=1)
    tbl_eq.alignment = WD_TABLE_ALIGNMENT.CENTER
    c = tbl_eq.cell(0, 0)
    set_cell_background(c, "F8FAFC")
    set_cell_margins(c, top=180, bottom=180, left=240, right=240)
    c.width = Inches(5.5)
    p_eq = c.paragraphs[0]
    p_eq.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_eq.paragraph_format.line_spacing = 1.3
    r_eq_h = p_eq.add_run("EQUIPO DE DESARROLLO SCRUM:\n\n")
    r_eq_h.bold = True
    r_eq_h.font.size = Pt(11)
    r_eq_h.font.color.rgb = RGBColor(15, 46, 89)

    r_members = p_eq.add_run(
        "Raúl — Product Owner / Gestión de Requerimientos\n"
        "Kevin — Scrum Master / Aseguramiento de Calidad y Métricas\n"
        "Noé — Developer / Líder Técnico de Arquitectura y Base de Datos\n\n"
        "Docente Evaluador: Cátedra de Análisis y Diseño de Sistemas II\n"
        "Fecha de Entrega: Octubre 2026\n"
        "Versión de Incremento: v0.1.0-sprint1"
    )
    r_members.font.size = Pt(10)
    r_members.font.color.rgb = RGBColor(51, 65, 85)

    doc.add_page_break()

    # =========================================================================
    # 1. DESCRIPCIÓN DEL PROBLEMA
    # =========================================================================
    add_h1("1. Descripción del Problema")
    add_body(
        "La empresa Juguetería Quetzal es una distribuidora y comercializadora de juguetes que opera en modalidades de menudeo, mayoreo y distribución a tiendas minoristas. Históricamente, sus operaciones de catálogo, precios, clientes y usuarios se han gestionado mediante mecanismos manuales y hojas de cálculo desconectadas."
    )
    add_body(
        "Esta carencia de una infraestructura de software centralizada e íntegra ha generado problemas operacionales críticos:"
    )
    add_bullet("Descontrol en Escalas de Precios por Volumen: ", "Al vender por unidades individuales, trío, docenas, cajas o millares, los precios se calculaban manualmente por los dependientes. Esto causaba errores humanos recurrentes, inconsistencias donde comprar más unidades resultaba más caro por unidad, o pérdidas de margen financiero no autorizadas.")
    add_bullet("Falta de Control de Acceso y Segregación de Funciones: ", "Cualquier empleado podía acceder a información confidencial de márgenes, modificar clientes o manipular catálogos. No existía separación estricta entre Administradores, Supervisores y Operadores de mostrador.")
    add_bullet("Ausencia Total de Trazabilidad y Auditoría: ", "No había constancia histórica de qué usuario modificó un precio, inactivó un cliente o registró un producto, impidiendo la rendición de cuentas y auditoría de fraudes.")
    add_bullet("Riesgo de Inconsistencias de Datos: ", "Clientes con números de identificación fiscal duplicados, registros huérfanos o productos eliminados de la base de datos dejando pedidos históricos inconsistentes.")

    add_callout(
        doc,
        "Reto del Sprint 1",
        "Establecer la base robusta, segura y automatizada del sistema mediante una arquitectura cliente-servidor moderna (Node.js + React + MySQL) que implemente control de acceso basado en roles (RBAC), auditoría automática inmutable, reglas de negocio en la base de datos y un motor de cálculo automático de precios por volumen."
    )

    # =========================================================================
    # 2. OBJETIVOS DEL PROYECTO
    # =========================================================================
    add_h1("2. Objetivos del Proyecto")
    add_h2("2.1 Objetivo General")
    add_body(
        "Desarrollar e implementar el primer incremento de software funcional (Sprint 1) del Sistema de Gestión de Pedidos, Inventario y Ventas para Juguetería Quetzal, estableciendo la base de datos relacional con integridad transaccional, autenticación segura con JWT, control de acceso granular por roles, gestión de usuarios, clientes y productos con escalas automáticas de precios por volumen."
    )

    add_h2("2.2 Objetivos Específicos")
    add_bullet("Infraestructura de Datos: ", "Diseñar y desplegar la base de datos MySQL con 22 tablas, vistas operacionales y 52 triggers para auditoría automática y validación de reglas de negocio sin depender exclusivamente de la capa de aplicación.")
    add_bullet("Seguridad y Autenticación: ", "Implementar autenticación robusta mediante tokens JWT y cifrado de contraseñas con Bcrypt, con middleware de control de acceso por roles (RBAC) y bloqueo estricto (HTTP 403) ante intentos no autorizados.")
    add_bullet("Gestión de Usuarios y Roles: ", "Proveer una interfaz administrativa para crear, editar, inactivar y restablecer contraseñas de usuarios, además de una matriz interactiva para consultar y asignar permisos por rol.")
    add_bullet("Gestión de Clientes: ", "Implementar el módulo de clientes con tipificación (Final/Mayorista), validación de identificación única/nula (NIT) y borrado lógico.")
    add_bullet("Catálogo de Productos y Precios: ", "Desarrollar el catálogo de productos con código SKU inmutable, categorías, marcas, stock mínimo de alerta y un motor matemático para calcular automáticamente las 10 escalas de precio por volumen asegurando la regla de no-incremento unitario.")
    add_bullet("Trazabilidad Total: ", "Garantizar que toda operación de escritura registre el ID del usuario (@usuario_actual), operación, timestamp y deltas JSON en la tabla de auditoría.")

    # =========================================================================
    # 3. ALCANCE DEL SPRINT 1
    # =========================================================================
    add_h1("3. Alcance del Sprint 1")
    add_body(
        "El Sprint 1 representa la cimentación arquitectónica del sistema y entrega un producto 100% operativo y probado que cumple con la totalidad de los criterios de aceptación acordados."
    )

    tbl_alc = doc.add_table(rows=1, cols=2)
    tbl_alc.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(tbl_alc)
    col_w_alc = [Inches(3.25), Inches(3.25)]
    format_table_header(tbl_alc.rows[0], col_w_alc, ["Dentro del Alcance (Sprint 1)", "Exclusiones (Sprints 2 y 3)"])

    alc_data = [
        ("Base de datos relacional MySQL completa (22 tablas, vistas, triggers de auditoría y reglas).", "Módulo de órdenes de compra y proveedores."),
        ("Inicio de sesión seguro con JWT y expiración de credenciales.", "Recepción de mercadería en bodega y movimientos de inventario."),
        ("Gestión integral de usuarios (CRUD, estado activo/inactivo, reset de clave).", "Punto de Venta (POS) y emisión de tickets de venta."),
        ("Matriz interactiva de Roles y Permisos con persistencia en BD.", "Gestión de pedidos con entrega diferida."),
        ("Módulo de Clientes (CRUD, NIT único/nulo, tipos Final y Mayorista).", "Pasarela de pagos en línea o registro de créditos."),
        ("Catálogo de Productos con categorías, marcas y alerta de stock mínimo.", "Dashboard analítico con gráficos estadísticos y métricas."),
        ("Motor de cálculo automático para 10 escalas de precios por volumen.", "Reportes avanzados exportables a PDF y hojas de cálculo."),
        ("Control de acceso RBAC en backend y frontend (pantalla 403 y ocultamiento de botones).", "Módulo de devoluciones y mermas."),
        ("Validaciones completas de cliente y servidor con captura de errores de triggers.", "Facturación electrónica FEL (SAT).")
    ]

    for idx, (inc, exc) in enumerate(alc_data):
        row = tbl_alc.add_row()
        format_table_row(row, col_w_alc, [inc, exc], is_alt=(idx % 2 == 1))

    doc.add_page_break()

    # =========================================================================
    # 4. IDENTIFICACIÓN DE ACTORES
    # =========================================================================
    add_h1("4. Identificación de Actores del Sistema")
    add_body(
        "El sistema delimita las responsabilidades operacionales mediante cuatro actores clave, cada uno con perfiles de acceso claramente definidos:"
    )

    tbl_act = doc.add_table(rows=1, cols=4)
    tbl_act.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(tbl_act)
    col_w_act = [Inches(1.2), Inches(1.8), Inches(2.2), Inches(1.3)]
    format_table_header(tbl_act.rows[0], col_w_act, ["Actor", "Perfil y Rol", "Responsabilidades y Alcance", "Permisos Clave"])

    actores_data = [
        ("Administrador", "Personal de TI / Dirección General (Rol: Administrador)", "Control total del sistema: gestión de cuentas de usuario, configuración de roles, asignación de privilegios y supervisión de auditoría global.", "usuarios.gestionar, roles.gestionar, productos.gestionar, clientes.gestionar"),
        ("Supervisor", "Jefe de Almacén / Encargado de Catálogo (Rol: Supervisor)", "Mantenimiento del catálogo de productos, definición y calibración de escalas de precio por volumen, creación de marcas/categorías. Consulta de clientes sin permisos de modificación.", "productos.gestionar, productos.consultar, clientes.consultar"),
        ("Operador", "Ventas / Mostrador / Dependiente (Rol: Operador)", "Atención al cliente en mostrador, creación y actualización de clientes, consulta de catálogo y precios disponibles. Sin privilegios para alterar precios, usuarios o roles.", "clientes.gestionar, clientes.consultar, productos.consultar"),
        ("Docente Evaluador", "Auditor Académico / Evaluador de Cátedra", "Rol de verificación académica: comprueba la ejecución del software funcional, valida reglas de negocio, prueba control de accesos no autorizados (403) y revisa trazabilidad.", "Todos los perfiles para ejecución del guion de pruebas")
    ]

    for idx, row_vals in enumerate(actores_data):
        row = tbl_act.add_row()
        format_table_row(row, col_w_act, row_vals, is_alt=(idx % 2 == 1))

    # =========================================================================
    # 5. REQUERIMIENTOS INICIALES
    # =========================================================================
    add_h1("5. Requerimientos Iniciales del Sistema")
    add_h2("5.1 Requerimientos Funcionales (RF)")
    
    rf_list = [
        ("RF01", "Autenticación de Usuarios", "El sistema debe autenticar usuarios mediante correo electrónico y contraseña cifrada, emitiendo un token JWT firmado."),
        ("RF02", "Mantenimiento de Sesión", "El sistema debe mantener la sesión activa y permitir cerrarla en cualquier momento, invalidando el acceso en el cliente."),
        ("RF03", "Creación de Usuarios", "El sistema debe permitir registrar usuarios con nombre completo, correo único y rol asignado."),
        ("RF04", "Modificación de Usuarios", "El sistema debe permitir editar el nombre y rol de un usuario existente."),
        ("RF05", "Inactivación de Usuarios", "El sistema debe permitir activar o inactivar cuentas de usuario sin eliminarlas físicamente de la base de datos."),
        ("RF06", "Restablecimiento de Contraseñas", "El sistema debe permitir asignar una nueva contraseña segura a cualquier usuario registrado."),
        ("RF07", "Consulta de Roles y Permisos", "El sistema debe presentar una matriz de roles y permisos configurados en la base de datos."),
        ("RF08", "Edición de Permisos por Rol", "El sistema debe permitir asignar o revocar permisos específicos a cada rol, salvo al rol Administrador que es inmutable."),
        ("RF09", "Registro de Clientes", "El sistema debe permitir registrar clientes especificando tipo (Final/Mayorista), nombre, identificación (NIT/DPI), teléfono y correo."),
        ("RF10", "Modificación de Clientes", "El sistema debe permitir actualizar la información de contacto y fiscal de clientes registrados."),
        ("RF11", "Desactivación Lógica de Clientes", "El sistema debe permitir inactivar clientes garantizando que no se eliminen registros con historial."),
        ("RF12", "Consulta y Filtrado de Clientes", "El sistema debe permitir buscar clientes por nombre, identificación o correo con paginación."),
        ("RF13", "Catálogo de Productos", "El sistema debe registrar juguetes con SKU único, nombre, descripción, categoría, marca, stock mínimo y edad mínima."),
        ("RF14", "Escalas de Precios por Volumen", "El sistema debe permitir configurar precios unitarios para 10 niveles de cantidad (1, 3, 6, 12, 25, 50, 100, 500, 1000, 10000 unidades)."),
        ("RF15", "Cálculo Automático de Precios", "El sistema debe calcular automáticamente las escalas de precios mediante fórmulas logarítmicas/progresivas garantizando que el precio unitario no aumente al incrementar el volumen."),
        ("RF16", "Inactivación de Productos", "El sistema debe permitir marcar productos como inactivos sin eliminarlos de la base de datos (RN04)."),
        ("RF17", "Gestión de Categorías y Marcas", "El sistema debe permitir crear rápidamente nuevas categorías y marcas desde el formulario de producto."),
        ("RF18", "Consulta de Stock y Alertas", "El sistema debe mostrar el stock actual disponible proveniente de la vista de inventario, con badge de alerta visual si está en o bajo el stock mínimo."),
        ("RF19", "Control de Acceso Granular (RBAC)", "El sistema debe bloquear peticiones y URLs directas no autorizadas mostrando una vista amigable de Acceso Denegado (403)."),
        ("RF20", "Auditoría Automática de Operaciones", "El sistema debe registrar automáticamente en la tabla auditoria toda inserción, modificación o login con el usuario que ejecutó la acción.")
    ]

    tbl_rf = doc.add_table(rows=1, cols=3)
    tbl_rf.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(tbl_rf)
    col_w_rf = [Inches(1.0), Inches(2.2), Inches(3.3)]
    format_table_header(tbl_rf.rows[0], col_w_rf, ["Código", "Requerimiento Funcional", "Descripción Técnica"])

    for idx, row_vals in enumerate(rf_list):
        row = tbl_rf.add_row()
        format_table_row(row, col_w_rf, row_vals, is_alt=(idx % 2 == 1))

    doc.add_page_break()

    add_h2("5.2 Requerimientos No Funcionales (RNF)")
    rnf_list = [
        ("RNF01", "Seguridad Criptográfica", "Las contraseñas deben cifrarse usando Bcrypt con factor de costo 10. Las comunicaciones API se protegen con headers Helmet."),
        ("RNF02", "Integridad Transaccional ACID", "Todas las operaciones de mutación deben ejecutarse en transacciones MySQL con fijación de @usuario_actual para triggers de auditoría."),
        ("RNF03", "Rendimiento y Tiempo de Respuesta", "Las consultas de catálogos y tablas con paginación deben responder en menos de 200 ms bajo condiciones normales de red local."),
        ("RNF04", "Usabilidad y Diseño Limpio", "La interfaz de usuario debe ofrecer un diseño profesional corporativo, fuentes legibles, contraste óptimo y retroalimentación inmediata (Toasts)."),
        ("RNF05", "Concurrencia de Conexiones", "El backend debe manejar un pool de conexiones MySQL con liberación automática post-transacción para prevenir saturación."),
        ("RNF06", "Compatibilidad Multiplataforma", "El frontend debe operar sin discrepancias en los navegadores web modernos (Google Chrome, Microsoft Edge, Mozilla Firefox)."),
        ("RNF07", "Idempotencia y Despliegue Automatizado", "La base de datos debe poder resetearse e inicializarse en un solo comando idempotente tanto en Windows (PowerShell) como en Linux (Bash)."),
        ("RNF08", "Trazabilidad Inmutable", "Los registros de auditoría deben almacenarse con clave foránea al usuario responsable, tipo de operación y deltas en formato JSON inmutable.")
    ]

    tbl_rnf = doc.add_table(rows=1, cols=3)
    tbl_rnf.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(tbl_rnf)
    col_w_rnf = [Inches(1.0), Inches(2.2), Inches(3.3)]
    format_table_header(tbl_rnf.rows[0], col_w_rnf, ["Código", "Requerimiento No Funcional", "Criterio de Calidad"])

    for idx, row_vals in enumerate(rnf_list):
        row = tbl_rnf.add_row()
        format_table_row(row, col_w_rnf, row_vals, is_alt=(idx % 2 == 1))

    # =========================================================================
    # 6. PRODUCT BACKLOG COMPLETO
    # =========================================================================
    add_h1("6. Product Backlog del Proyecto")
    add_body(
        "El Product Backlog general comprende 32 Historias de Usuario organizadas y priorizadas para la construcción iterativa del sistema. Las primeras 20 historias corresponden en su totalidad al Sprint 1."
    )

    backlog_data = [
        ("HU01", "Inicio de sesión seguro con JWT", "Alta", "3", "Sprint 1", "Completado"),
        ("HU02", "Navegación del menú principal según rol", "Alta", "2", "Sprint 1", "Completado"),
        ("HU03", "Registro de nuevo usuario con asignación de rol", "Alta", "5", "Sprint 1", "Completado"),
        ("HU04", "Modificación de datos y rol de usuario", "Alta", "3", "Sprint 1", "Completado"),
        ("HU05", "Inactivación y reactivación de usuario", "Media", "2", "Sprint 1", "Completado"),
        ("HU06", "Restablecimiento de contraseña de usuario", "Media", "3", "Sprint 1", "Completado"),
        ("HU07", "Consulta de matriz de roles y permisos", "Alta", "3", "Sprint 1", "Completado"),
        ("HU08", "Edición de permisos asignados a roles", "Alta", "5", "Sprint 1", "Completado"),
        ("HU09", "Protección de inmutabilidad del Administrador", "Alta", "2", "Sprint 1", "Completado"),
        ("HU10", "Listado de usuarios con filtros y búsqueda", "Media", "3", "Sprint 1", "Completado"),
        ("HU11", "Restricción de acceso granular por rol (403)", "Alta", "5", "Sprint 1", "Completado"),
        ("HU12", "Registro de nuevo cliente con validación de NIT", "Alta", "5", "Sprint 1", "Completado"),
        ("HU13", "Edición de información de cliente existente", "Media", "3", "Sprint 1", "Completado"),
        ("HU14", "Inactivación lógica de clientes (sin borrado físico)", "Media", "2", "Sprint 1", "Completado"),
        ("HU15", "Consulta de clientes con búsqueda y paginación", "Media", "3", "Sprint 1", "Completado"),
        ("HU16", "Creación de producto con SKU inmutable y stock", "Alta", "5", "Sprint 1", "Completado"),
        ("HU17", "Cálculo automático de escalas de precios por volumen", "Alta", "8", "Sprint 1", "Completado"),
        ("HU18", "Modificación de producto y ajuste de precios", "Alta", "5", "Sprint 1", "Completado"),
        ("HU19", "Inactivación lógica de productos del catálogo", "Media", "2", "Sprint 1", "Completado"),
        ("HU20", "Auditoría automática de operaciones y sesiones", "Alta", "5", "Sprint 1", "Completado"),
        ("HU21", "Registro y mantenimiento de proveedores", "Alta", "5", "Sprint 2", "Planificado"),
        ("HU22", "Emisión de órdenes de compra a proveedores", "Alta", "8", "Sprint 2", "Planificado"),
        ("HU23", "Recepción de compras y generación de inventario", "Alta", "8", "Sprint 2", "Planificado"),
        ("HU24", "Ajustes manuales de inventario (mermas/conteos)", "Media", "5", "Sprint 2", "Planificado"),
        ("HU25", "Kardex de movimientos de inventario por producto", "Alta", "8", "Sprint 2", "Planificado"),
        ("HU26", "Punto de Venta (POS): registro de venta directa", "Alta", "13", "Sprint 3", "Planificado"),
        ("HU27", "Aplicación automática de escalas de precio al vender", "Alta", "8", "Sprint 3", "Planificado"),
        ("HU28", "Gestión de pedidos con entrega diferida", "Media", "8", "Sprint 3", "Planificado"),
        ("HU29", "Registro de pagos en caja y métodos de pago", "Alta", "5", "Sprint 3", "Planificado"),
        ("HU30", "Emisión e impresión de comprobante / ticket", "Media", "5", "Sprint 3", "Planificado"),
        ("HU31", "Dashboard ejecutivo con métricas de ventas y stock", "Media", "8", "Sprint 3", "Planificado"),
        ("HU32", "Reportes de rotación de inventario y márgenes", "Media", "5", "Sprint 3", "Planificado")
    ]

    tbl_pb = doc.add_table(rows=1, cols=6)
    tbl_pb.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(tbl_pb)
    col_w_pb = [Inches(0.8), Inches(2.6), Inches(0.8), Inches(0.6), Inches(0.9), Inches(0.8)]
    format_table_header(tbl_pb.rows[0], col_w_pb, ["ID", "Título de Historia de Usuario", "Prioridad", "Pts", "Sprint", "Estado"])

    for idx, row_vals in enumerate(backlog_data):
        row = tbl_pb.add_row()
        format_table_row(row, col_w_pb, row_vals, is_alt=(idx % 2 == 1), align_right_cols=[3])

    doc.add_page_break()

    # =========================================================================
    # 7. HISTORIAS DE USUARIO Y CRITERIOS DE ACEPTACIÓN
    # =========================================================================
    add_h1("7. Historias de Usuario y Criterios de Aceptación (Sprint 1)")
    add_body(
        "A continuación se detallan las 20 Historias de Usuario desarrolladas en el Sprint 1, redactadas en formato ágil estándar y con criterios de aceptación en sintaxis Gherkin (Dado que / Cuando / Entonces):"
    )

    historias_detalladas = [
        {
            "id": "HU01", "titulo": "Inicio de sesión seguro con JWT",
            "narrativa": "Como usuario del sistema, quiero ingresar mis credenciales para acceder a las funciones autorizadas de la plataforma.",
            "criterios": [
                ("Escenario 1 (Credenciales Válidas):", "Dado que el usuario ingresa un correo registrado y contraseña correcta, cuando presiona 'Iniciar Sesión', entonces el sistema emite un token JWT, almacena la sesión y redirige a la vista /inicio con saludo personalizado."),
                ("Escenario 2 (Credenciales Inválidas):", "Dado que el usuario ingresa una contraseña incorrecta o un correo inexistente, cuando intenta ingresar, entonces el sistema rechaza la petición con código HTTP 401 y muestra un mensaje de alerta sin revelar si el error fue de usuario o clave."),
                ("Escenario 3 (Usuario Inactivo):", "Dado que el usuario tiene activo = 0 en la BD, cuando intenta ingresar, entonces el sistema rechaza el login indicando que la cuenta se encuentra desactivada.")
            ]
        },
        {
            "id": "HU02", "titulo": "Navegación del menú principal según rol",
            "narrativa": "Como usuario autenticado, quiero ver únicamente los módulos a los que tengo permiso para navegar de forma segura y clara.",
            "criterios": [
                ("Escenario 1 (Menú Administrador):", "Dado un usuario con rol Administrador, cuando ingresa al sistema, entonces la barra lateral muestra los accesos a Inicio, Usuarios, Roles y Permisos, Clientes y Productos."),
                ("Escenario 2 (Menú Operador):", "Dado un usuario con rol Operador, cuando ingresa al sistema, entonces la barra lateral únicamente muestra Inicio, Clientes y Productos, ocultando los módulos administrativos.")
            ]
        },
        {
            "id": "HU03", "titulo": "Registro de nuevo usuario del sistema",
            "narrativa": "Como Administrador, quiero crear un nuevo colaborador asignándole sus datos y rol para que pueda operar el sistema.",
            "criterios": [
                ("Escenario 1 (Creación Exitosa):", "Dado que el Administrador completa el formulario con nombre, correo nuevo y selecciona un rol, cuando guarda el registro, entonces el usuario se inserta con contraseña cifrada por defecto y aparece en la lista."),
                ("Escenario 2 (Correo Duplicado RN05):", "Dado que se ingresa un correo ya existente en la base de datos, cuando se envía el formulario, entonces el backend rechaza la operación con HTTP 409 y se muestra el toast de error de correo duplicado.")
            ]
        },
        {
            "id": "HU04", "titulo": "Modificación de datos y rol de usuario",
            "narrativa": "Como Administrador, quiero actualizar el nombre o rol de un usuario existente para reflejar cambios en la organización.",
            "criterios": [
                ("Escenario 1 (Modificación Exitosa):", "Dado un usuario existente, cuando el Administrador cambia su rol de Operador a Supervisor y confirma, entonces el cambio se guarda en la BD y queda registrado en la auditoría con los valores previos y nuevos.")
            ]
        },
        {
            "id": "HU05", "titulo": "Inactivación y reactivación de usuario",
            "narrativa": "Como Administrador, quiero dar de baja a un usuario para impedir su acceso al sistema sin perder su historial operativo.",
            "criterios": [
                ("Escenario 1 (Inactivación Lógica):", "Dado un usuario activo, cuando el Administrador presiona 'Desactivar', entonces el estado cambia a Inactivo, impidiendo futuros inicios de sesión pero conservando sus registros vinculados.")
            ]
        },
        {
            "id": "HU06", "titulo": "Restablecimiento de contraseña de usuario",
            "narrativa": "Como Administrador, quiero reasignar la contraseña de un usuario para que pueda recuperar su cuenta ante olvido.",
            "criterios": [
                ("Escenario 1 (Reset de Clave):", "Dado que el Administrador selecciona un usuario y digita una nueva clave válida, cuando guarda, entonces el hash Bcrypt se actualiza y el usuario puede iniciar sesión inmediatamente con la nueva clave.")
            ]
        },
        {
            "id": "HU07", "titulo": "Consulta de matriz de roles y permisos",
            "narrativa": "Como Administrador o Supervisor, quiero visualizar qué permisos tiene cada rol para auditar la seguridad.",
            "criterios": [
                ("Escenario 1 (Visualización Clara):", "Dado un usuario con permiso roles.gestionar o usuarios.gestionar, cuando ingresa a la vista Roles, entonces ve la lista de roles y la matriz de permisos agrupados por módulo en lenguaje comprensible.")
            ]
        },
        {
            "id": "HU08", "titulo": "Edición de permisos asignados a un rol",
            "narrativa": "Como Administrador, quiero modificar los permisos asignados a un rol para ajustar privilegios según necesidades operativas.",
            "criterios": [
                ("Escenario 1 (Actualización de Permisos):", "Dado el rol Supervisor, cuando el Administrador marca o desmarca casillas de permisos y pulsa 'Guardar Cambios', entonces la tabla rol_permisos se actualiza dentro de una transacción.")
            ]
        },
        {
            "id": "HU09", "titulo": "Protección de inmutabilidad del rol Administrador",
            "narrativa": "Como sistema, quiero bloquear cualquier intento de revocar permisos al rol Administrador para prevenir bloqueos accidentales.",
            "criterios": [
                ("Escenario 1 (Bloqueo de Modificación):", "Dado el rol Administrador, cuando se intenta enviar una modificación de sus permisos, el sistema deshabilita la edición o el backend rechaza la mutación garantizando control continuo.")
            ]
        },
        {
            "id": "HU10", "titulo": "Listado de usuarios con filtros y búsqueda",
            "narrativa": "Como Administrador, quiero buscar usuarios por nombre, correo o estado para localizarlos con agilidad.",
            "criterios": [
                ("Escenario 1 (Búsqueda en Tiempo Real):", "Dado el listado de usuarios, cuando el usuario escribe texto en el buscador, la tabla filtra inmediatamente los registros coincidentes en nombre y correo.")
            ]
        },
        {
            "id": "HU11", "titulo": "Restricción de acceso granular por rol (403)",
            "narrativa": "Como sistema de seguridad, quiero impedir que usuarios sin privilegios ejecuten acciones o accedan a URLs restringidas.",
            "criterios": [
                ("Escenario 1 (Navegación URL Directa Bloqueada):", "Dado un usuario con rol Operador, cuando ingresa manualmente a /usuarios en el navegador, entonces el enrutador protegido muestra la pantalla formal de Acceso Denegado 403."),
                ("Escenario 2 (Petición API Rechazada):", "Dado un Operador intentando enviar un POST a /api/usuarios mediante herramientas externas, el backend responde HTTP 403 Prohibido con mensaje JSON descriptivo.")
            ]
        },
        {
            "id": "HU12", "titulo": "Registro de nuevo cliente con validación de NIT",
            "narrativa": "Como Operador o Administrador, quiero registrar un cliente con sus datos fiscales para asociarlo a futuras ventas.",
            "criterios": [
                ("Escenario 1 (Cliente con NIT):", "Dado un cliente nuevo con NIT válido, cuando se guarda, el registro se almacena y se valida unicidad en la base de datos."),
                ("Escenario 2 (Cliente Consumidor Final sin NIT):", "Dado un cliente sin NIT (cadena vacía), cuando se guarda, el sistema convierte la cadena a NULL para que la restricción UNIQUE no choque con otros clientes sin NIT.")
            ]
        },
        {
            "id": "HU13", "titulo": "Modificación de datos de cliente existente",
            "narrativa": "Como Operador o Administrador, quiero editar teléfono, correo o dirección de un cliente para mantener sus datos al día.",
            "criterios": [
                ("Escenario 1 (Edición Exitosa):", "Dado un cliente existente, cuando se edita su teléfono y se confirma, la tabla clientes se actualiza y la auditoría registra la modificación.")
            ]
        },
        {
            "id": "HU14", "titulo": "Inactivación lógica de clientes (sin borrado físico)",
            "narrativa": "Como Administrador u Operador, quiero desactivar un cliente obsoleto para que no aparezca en ventas sin romper integridad referencial.",
            "criterios": [
                ("Escenario 1 (Borrado Lógico RN04):", "Dado un cliente registrado, cuando se solicita su eliminación, el sistema actualiza activo = 0 en lugar de ejecutar una sentencia DELETE física.")
            ]
        },
        {
            "id": "HU15", "titulo": "Consulta de clientes con búsqueda y paginación",
            "narrativa": "Como usuario autorizado, quiero consultar la lista de clientes con búsqueda rápida para identificarlos en mostrador.",
            "criterios": [
                ("Escenario 1 (Filtro por Nombre o NIT):", "Dado el catálogo de clientes, cuando se busca por NIT o razón social, los resultados se presentan paginados y ordenados.")
            ]
        },
        {
            "id": "HU16", "titulo": "Creación de producto con SKU inmutable y stock",
            "narrativa": "Como Supervisor o Administrador, quiero registrar juguetes con código SKU, categoría y stock mínimo para organizar el inventario.",
            "criterios": [
                ("Escenario 1 (Registro de Producto):", "Dado un SKU no repetido, categoría y marca válidas, cuando se guarda el producto, se crea con stock inicial 0 en la vista de inventario.")
            ]
        },
        {
            "id": "HU17", "titulo": "Cálculo automático de escalas de precios por volumen",
            "narrativa": "Como Supervisor, quiero que las escalas de precios por volumen se calculen automáticamente a partir del precio unitario base para evitar errores humanos y agilizar la fijación comercial.",
            "criterios": [
                ("Escenario 1 (Cálculo Automático de 10 Niveles):", "Dado que el usuario escribe un precio base de Q100.00 en Nivel 1 (1 ud), el sistema calcula automáticamente los otros 9 niveles (≥3: Q95.00, ≥6: Q92.00, ..., ≥10000: Q65.00) mostrando badges de descuento y ahorro unitario."),
                ("Escenario 2 (Garantía de Monotonía No Creciente):", "El sistema garantiza matemáticamente que para cualquier nivel Q_{i+1} > Q_i, el precio unitario sea estrictamente menor o igual, evitando errores 422 de la base de datos.")
            ]
        },
        {
            "id": "HU18", "titulo": "Modificación de producto y ajuste de precios",
            "narrativa": "Como Supervisor, quiero actualizar el nombre o precios de un producto para responder a cambios de costo del mercado.",
            "criterios": [
                ("Escenario 1 (Actualización de Escala en Transacción):", "Dado un producto con escalas existentes, cuando se modifican los precios, la transacción desactiva las escalas previas e inserta las nuevas limpiamente.")
            ]
        },
        {
            "id": "HU19", "titulo": "Inactivación lógica de productos del catálogo",
            "narrativa": "Como Supervisor o Administrador, quiero dar de baja un producto descontinuado sin eliminar su registro de la base de datos.",
            "criterios": [
                ("Escenario 1 (Inactivación Lógica RN04):", "Dado un juguete en catálogo, cuando se pulsa 'Inactivar', su estado pasa a inactivo, manteniéndose en auditoría y ventas pasadas.")
            ]
        },
        {
            "id": "HU20", "titulo": "Auditoría automática de operaciones y sesiones",
            "narrativa": "Como Director o Auditor, quiero que todo cambio y login quede registrado con el usuario autor para garantizar transparencia.",
            "criterios": [
                ("Escenario 1 (Auditoría por Triggers):", "Dado cualquier INSERT o UPDATE en usuarios, clientes o productos, el trigger correspondiente captura automáticamente @usuario_actual, operación, registro_id y los deltas JSON de valores previos y nuevos.")
            ]
        }
    ]

    for h in historias_detalladas:
        add_h2(f"{h['id']} — {h['titulo']}")
        p_narr = doc.add_paragraph()
        p_narr.paragraph_format.space_before = Pt(0)
        p_narr.paragraph_format.space_after = Pt(4)
        r_n = p_narr.add_run(h['narrativa'])
        r_n.italic = True
        r_n.font.color.rgb = RGBColor(71, 85, 105)

        for c_title, c_desc in h['criterios']:
            add_bullet(c_title + " ", c_desc)

    doc.add_page_break()

    # =========================================================================
    # 8. SPRINT GOAL Y 9. SPRINT BACKLOG
    # =========================================================================
    add_h1("8. Sprint Goal (Sprint 1)")
    add_callout(
        doc,
        "Meta Oficial del Sprint 1 (Sprint Goal)",
        "\"Construir la base operativa del sistema Juguetería Quetzal desplegando el esquema de base de datos con reglas de negocio y auditoría, autenticación JWT con control de acceso por roles (RBAC), gestión completa de usuarios, clientes y catálogo de productos con escalas automáticas de precios por volumen, permitiendo a los usuarios autorizados operar sus módulos y bloqueando estrictamente los accesos no autorizados.\""
    )

    add_h1("9. Sprint Backlog")
    add_body(
        "A continuación se presenta el desglose técnico de tareas, responsabilidades y tiempos ejecutados durante el sprint:"
    )

    sb_data = [
        ("HU01-T1", "Diseño de tabla usuarios y script de migración DDL", "Noé", "4 h", "Completado"),
        ("HU01-T2", "Endpoint POST /api/auth/login con Bcrypt y JWT", "Noé", "4 h", "Completado"),
        ("HU01-T3", "Interfaz de Login en React con persistencia en localStorage", "Kevin", "4 h", "Completado"),
        ("HU02-T1", "Layout protegido con Sidebar y Navbar dinámicos por rol", "Kevin", "5 h", "Completado"),
        ("HU03-T1", "Módulo backend de usuarios (CRUD y validación Zod)", "Noé", "6 h", "Completado"),
        ("HU03-T2", "Componente FormField y modal de creación de usuarios", "Kevin", "5 h", "Completado"),
        ("HU06-T1", "Endpoint PUT /api/usuarios/:id/password y modal en cliente", "Noé", "3 h", "Completado"),
        ("HU07-T1", "Endpoints GET /api/roles y GET /api/permisos", "Noé", "3 h", "Completado"),
        ("HU08-T1", "Matriz interactiva de asignación de permisos y PUT /roles/:id", "Kevin", "6 h", "Completado"),
        ("HU11-T1", "Middleware requirePermission en Express con respuesta 403", "Noé", "4 h", "Completado"),
        ("HU11-T2", "Componente ProtectedRoute y página formal AccessDeniedPage", "Kevin", "3 h", "Completado"),
        ("HU12-T1", "Tabla clientes, reglas de negocio y endpoints de gestión", "Noé", "5 h", "Completado"),
        ("HU12-T2", "Vista Clientes con DataTable, filtros y modal de creación", "Kevin", "5 h", "Completado"),
        ("HU16-T1", "Esquema productos, categorías, marcas y vista v_catalogo", "Noé", "6 h", "Completado"),
        ("HU16-T2", "Vista de Catálogo de Productos con alerta de stock mínimo", "Kevin", "6 h", "Completado"),
        ("HU17-T1", "Desarrollo del motor matemático de precios (pricingEngine.js)", "Noé", "6 h", "Completado"),
        ("HU17-T2", "Integración de cálculo en vivo de 10 escalas y badges en UI", "Kevin", "5 h", "Completado"),
        ("HU20-T1", "Helper withUser(@usuario_actual) y triggers de auditoría", "Noé", "8 h", "Completado"),
        ("PRUEBAS", "Suite de pruebas de integración con Vitest (48 pruebas)", "Noé / Raúl", "6 h", "Completado"),
        ("DOCS", "Generación de documentación técnica y evidencias funcionales", "Kevin / Raúl", "8 h", "Completado")
    ]

    tbl_sb = doc.add_table(rows=1, cols=5)
    tbl_sb.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(tbl_sb)
    col_w_sb = [Inches(1.0), Inches(2.8), Inches(1.0), Inches(0.8), Inches(0.9)]
    format_table_header(tbl_sb.rows[0], col_w_sb, ["ID Tarea", "Descripción de la Tarea Técnica", "Responsable", "Horas", "Estado"])

    for idx, row_vals in enumerate(sb_data):
        row = tbl_sb.add_row()
        format_table_row(row, col_w_sb, row_vals, is_alt=(idx % 2 == 1), align_right_cols=[3])

    doc.add_page_break()

    # =========================================================================
    # 10. DIAGRAMA DE CASOS DE USO INICIAL
    # =========================================================================
    add_h1("10. Diagrama de Casos de Uso Inicial")
    add_body(
        "El diagrama de casos de uso modela los límites del sistema durante el primer incremento, identificando la interacción de los cuatro actores primarios con los casos de uso nucleares:"
    )

    uc_img_path = "docs/sprint-1/evidencias/diagrama_casos_uso.png"
    if os.path.exists(uc_img_path):
        p_img = doc.add_paragraph()
        p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_img.paragraph_format.space_before = Pt(8)
        p_img.paragraph_format.space_after = Pt(4)
        run_img = p_img.add_run()
        run_img.add_picture(uc_img_path, width=Inches(6.4))
        p_cap = doc.add_paragraph()
        p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_cap.paragraph_format.space_after = Pt(12)
        r_cap = p_cap.add_run("Figura 1: Diagrama de Casos de Uso Inicial (Sprint 1) — Juguetería Quetzal.")
        r_cap.italic = True
        r_cap.font.size = Pt(8.5)
        r_cap.font.color.rgb = RGBColor(100, 116, 139)

    add_body(
        "Como se observa en el diagrama, el Docente Evaluador posee la capacidad de auditar la totalidad de los flujos de prueba, mientras que el Administrador, Supervisor y Operador se encuentran sujetos a las restricciones impuestas por la matriz de permisos RBAC."
    )

    # =========================================================================
    # 11. MODELO ENTIDAD-RELACIÓN INICIAL
    # =========================================================================
    add_h1("11. Modelo Entidad-Relación Inicial")
    add_body(
        "El modelo relacional inicial comprende 11 entidades operativas implementadas en MySQL 8 con claves foráneas, restricciones de unicidad, columnas generadas y disparadores transaccionales:"
    )

    er_img_path = "docs/sprint-1/evidencias/modelo_entidad_relacion.png"
    if os.path.exists(er_img_path):
        p_img = doc.add_paragraph()
        p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_img.paragraph_format.space_before = Pt(8)
        p_img.paragraph_format.space_after = Pt(4)
        run_img = p_img.add_run()
        run_img.add_picture(er_img_path, width=Inches(6.4))
        p_cap = doc.add_paragraph()
        p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_cap.paragraph_format.space_after = Pt(12)
        r_cap = p_cap.add_run("Figura 2: Diagrama Entidad-Relación Inicial (Sprint 1) con Auditoría y Triggers.")
        r_cap.italic = True
        r_cap.font.size = Pt(8.5)
        r_cap.font.color.rgb = RGBColor(100, 116, 139)

    add_h2("11.1 Diccionario de Datos de Entidades del Sprint 1")
    add_bullet("ROLES y PERMISOS: ", "Estructura normalizada N:M mediante la tabla asociativa rol_permisos que desacopla la lógica de seguridad del código fuente.")
    add_bullet("USUARIOS: ", "Registros de colaboradores con credenciales encriptadas (Bcrypt) y clave foránea estricta a roles.")
    add_bullet("CLIENTES: ", "Directorio comercial con restricción UNIQUE sobre identificación fiscal que admite múltiples valores NULL para consumidores finales sin NIT.")
    add_bullet("PRODUCTOS y ESCALAS_PRECIO: ", "Relación 1:N donde cada juguete cuenta con hasta 10 niveles de descuento por volumen (1 a 10,000 unidades) validados por triggers para evitar incrementos ilógicos de precio unitario.")
    add_bullet("INVENTARIO: ", "Registro de stock con columna generada virtual stock_disponible = (stock_actual - stock_comprometido).")
    add_bullet("AUDITORIA: ", "Registro global inmutable que captura el usuario responsable (@usuario_actual), tabla, operación, timestamp y deltas JSON.")

    doc.add_page_break()

    # =========================================================================
    # 12. EVIDENCIA DE CEREMONIAS SCRUM
    # =========================================================================
    add_h1("12. Evidencia de Ceremonias Scrum")
    
    add_h2("12.1 Sprint Planning")
    add_bullet("Fecha y Duración: ", "02 de Octubre de 2026 — 2 horas.")
    add_bullet("Asistentes: ", "Raúl (Product Owner), Kevin (Scrum Master), Noé (Líder Técnico/Desarrollador).")
    add_bullet("Objetivo de la Sesión: ", "Analizar el backlog del producto, estimar el esfuerzo relativo de cada historia mediante Planning Poker, formular el Sprint Goal y comprometer las primeras 20 historias de usuario (HU01 a HU20) totalizando 74 puntos de historia.")
    add_bullet("Acuerdos Técnicos: ", "Uso de arquitectura Express con MySQL directo (sin ORM) para soportar variables de sesión en triggers; React 18 con CSS propio para control granular de estilos; no permitir borrado físico de entidades maestras (RN04).")

    add_h2("12.2 Daily Scrum (Bitácora de Sincronización)")
    add_body(
        "Se realizaron reuniones diarias de 15 minutos para inspeccionar el avance diario hacia el Sprint Goal e identificar bloqueos tempranos:"
    )

    daily_data = [
        ("Día 1", "Noé", "Diseñó script DDL base y triggers.", "Implementar endpoints de auth y usuarios.", "Ninguno; base cargada en MySQL."),
        ("Día 1", "Kevin", "Configuró entorno React con Vite y rutas.", "Construir pantalla de login y layout.", "Ninguno."),
        ("Día 2", "Noé", "Endpoints de autenticación y JWT listos.", "Desarrollar lógica de roles y permisos.", "Error MySQL 1442 en trigger de compras; aislado con variable."),
        ("Día 2", "Kevin", "Diseñó pantalla de Login corporativo.", "Construir Sidebar dinámico y AuthContext.", "Ninguno."),
        ("Día 3", "Noé", "Módulo de usuarios y roles terminado.", "Implementar clientes y productos con escalas.", "Ninguno."),
        ("Día 3", "Kevin", "Vistas de Usuarios y Roles integradas.", "Construir tabla y formulario de clientes.", "Ninguno."),
        ("Día 4", "Noé", "Desarrolló motor matemático de escalas de precio.", "Integrar suite de 48 pruebas automáticas.", "Validar que precios no aumenten por volumen."),
        ("Día 4", "Kevin", "Integró catálogo de productos y modal de escalas.", "Conectar recálculo automático en vivo.", "Ninguno."),
        ("Día 5", "Noé", "Ejecución de pruebas de integración (100% OK).", "Revisión final de código y scripts de reset.", "Ninguno."),
        ("Día 5", "Kevin", "Validación de permisos 403 y capturas de prueba.", "Generar informe formal y evidencias.", "Ninguno.")
    ]

    tbl_ds = doc.add_table(rows=1, cols=5)
    tbl_ds.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(tbl_ds)
    col_w_ds = [Inches(0.7), Inches(0.9), Inches(1.8), Inches(1.8), Inches(1.3)]
    format_table_header(tbl_ds.rows[0], col_w_ds, ["Día", "Miembro", "¿Qué hice ayer?", "¿Qué haré hoy?", "Impedimentos"])

    for idx, row_vals in enumerate(daily_data):
        row = tbl_ds.add_row()
        format_table_row(row, col_w_ds, row_vals, is_alt=(idx % 2 == 1))

    add_h2("12.3 Sprint Review")
    add_bullet("Fecha y Asistentes: ", "08 de Octubre de 2026 — Raúl (PO), Kevin (SM), Noé (Dev) y Docente Evaluador.")
    add_bullet("Demostración Funcional: ", "Se presentó el incremento de software en vivo ejecutando el guion de prueba de principio a fin sin fallos, evidenciando creación de usuarios, asignación de roles, login de operador, restricción 403, creación de productos y cálculo automático de precios.")
    add_bullet("Dictamen del Product Owner: ", "Aceptación formal del 100% de las historias del Sprint 1 (20/20 HU cumplidas). El software satisface todos los criterios de la Definition of Done.")

    add_h2("12.4 Sprint Retrospective")
    add_body(
        "El equipo realizó una retrospectiva reflexiva identificando lecciones clave para optimizar los siguientes sprints:"
    )
    add_bullet("Qué funcionó muy bien: ", "La delegación de reglas de negocio en triggers de MySQL garantizó integridad sin importar de dónde provenga la mutación; el motor automático de cálculo de precios redujo a segundos la configuración de productos; la suite automatizada de Vitest previno regresiones.")
    add_bullet("Dificultades encontradas: ", "La interacción de MySQL con triggers que leían la misma tabla que mutaban (error 1442) requirió desacoplamiento con variables locales; la configuración de contrastes de color en componentes exigió calibrar la paleta a tonos corporativos.")
    add_bullet("Plan de mejora para Sprint 2: ", "Documentar contratos de endpoints en Swagger/OpenAPI antes de programar la UI; preparar generadores de datos semilla masivos para las pruebas de compras e inventario.")

    doc.add_page_break()

    # =========================================================================
    # 13. EVIDENCIA FUNCIONAL (CAPTURAS REALES DEL SISTEMA)
    # =========================================================================
    add_h1("13. Evidencia Funcional del Sistema")
    add_body(
        "A continuación se presentan las capturas reales de pantalla capturadas durante la ejecución del sistema en http://localhost:5173, acompañadas de su respectiva ficha técnica descriptiva:"
    )

    evidencias_lista = [
        {
            "img": "docs/sprint-1/evidencias/01_login.png",
            "funcionalidad": "Inicio de Sesión y Autenticación Corporativa",
            "hu": "HU01: Inicio de sesión seguro con JWT",
            "resultado": "El usuario ingresa credenciales (admin@jugueteria.com / Admin1234!), el backend valida el hash Bcrypt en la base de datos, genera el token JWT y el cliente almacena la sesión de forma segura redirigiendo a la interfaz principal."
        },
        {
            "img": "docs/sprint-1/evidencias/02_inicio_dashboard.png",
            "funcionalidad": "Menú Principal y Tarjetas de Navegación según Rol",
            "hu": "HU02: Navegación del menú principal según rol",
            "resultado": "La pantalla de inicio despliega saludo personalizado al Administrador, indicando su rol y correo en el navbar superior limpio, y mostrando las tarjetas de acceso rápido a los módulos disponibles con un único botón de acción 'Abrir'."
        },
        {
            "img": "docs/sprint-1/evidencias/03_usuarios_listado.png",
            "funcionalidad": "Consulta y Listado Maestro de Usuarios",
            "hu": "HU10: Listado de usuarios con filtros y búsqueda",
            "resultado": "La tabla de usuarios presenta el listado completo con columnas de Nombre, Correo, Rol, Estado activo y acciones. Dispone de buscador en tiempo real y selector de filtro de estado."
        },
        {
            "img": "docs/sprint-1/evidencias/04_usuarios_crear_rol.png",
            "funcionalidad": "Creación de Nuevo Usuario con Asignación de Rol",
            "hu": "HU03: Registro de nuevo usuario con asignación de rol",
            "resultado": "El formulario modal permite registrar nombre completo, correo institucional, contraseña inicial y seleccionar el rol (Administrador, Supervisor u Operador) mediante un selector dropdown validado."
        },
        {
            "img": "docs/sprint-1/evidencias/05_roles_permisos_matriz.png",
            "funcionalidad": "Matriz Interactiva de Roles y Permisos (RBAC)",
            "hu": "HU07, HU08: Matriz de roles y asignación de permisos",
            "resultado": "Se despliega la lista de roles del sistema y la matriz interactiva de privilegios organizados por módulo (Usuarios, Roles, Clientes, Productos, Auditoría) en lenguaje comprensible sin términos técnicos crudos, editable en tiempo real."
        },
        {
            "img": "docs/sprint-1/evidencias/06_clientes_listado.png",
            "funcionalidad": "Catálogo y Gestión de Clientes",
            "hu": "HU15: Consulta de clientes con búsqueda y paginación",
            "resultado": "El módulo de clientes despliega la lista de compradores registrados con distintivo de tipo de cliente (Final o Mayorista), número de NIT/DPI, teléfono, correo y estado operacional."
        },
        {
            "img": "docs/sprint-1/evidencias/07_clientes_crear.png",
            "funcionalidad": "Registro de Nuevo Cliente con Validación Fiscal",
            "hu": "HU12: Registro de nuevo cliente con validación de NIT",
            "resultado": "Formulario modal que permite registrar un cliente especificando tipo de cliente, razón social o nombre, identificación fiscal (NIT), teléfono y correo, convirtiendo cadenas vacías a NULL para evitar colisiones fiscales."
        },
        {
            "img": "docs/sprint-1/evidencias/08_productos_catalogo.png",
            "funcionalidad": "Catálogo Maestro de Productos y Juguetes",
            "hu": "HU16: Creación de producto con SKU y alerta de stock",
            "resultado": "Se visualiza la lista de juguetes con SKU inmutable, nombre, categoría, marca, precio de venta menudeo (Nivel 1) y stock disponible en tiempo real proveniente de la vista de inventario, con badge de alerta cuando se encuentra en o bajo el mínimo."
        },
        {
            "img": "docs/sprint-1/evidencias/09_productos_precio_automatico.png",
            "funcionalidad": "Motor de Cálculo Automático de Escalas de Precio por Volumen",
            "hu": "HU17: Cálculo automático de escalas de precios por volumen",
            "resultado": "Al digitar el precio base de Q100.00 en Nivel 1 (1 ud), el motor matemático recalcula instantáneamente los 9 niveles restantes (≥3: Q95.00, ≥6: Q92.00, ≥12: Q88.00, ..., ≥10,000: Q65.00) mostrando badges de porcentaje de descuento (-5%, -8%, -12%, -35%) y ahorro unitario."
        },
        {
            "img": "docs/sprint-1/evidencias/10_productos_estrategias_precio.png",
            "funcionalidad": "Estrategias Comerciales de Margen y Precios al Por Mayor",
            "hu": "HU17: Configuración de estrategias dinámicas de precio",
            "resultado": "La interfaz permite alternar con un clic entre tres perfiles estratégicos: 'Escala Estándar' (hasta 35% de descuento), 'Mayorista Agresivo' (alta rotación con hasta 50% de descuento) y 'Margen Protegido' (conservador hasta 20%), recalculando todas las tarjetas en pantalla."
        },
        {
            "img": "docs/sprint-1/evidencias/11_control_acceso_403.png",
            "funcionalidad": "Restricción Granular de Acceso (Pantalla 403 Acceso Denegado)",
            "hu": "HU11: Restricción de acceso granular por rol",
            "resultado": "Al iniciar sesión como Operador e intentar acceder deliberadamente por URL directa a http://localhost:5173/usuarios, el enrutador protegido intercepta la solicitud y despliega la pantalla corporativa de Acceso Denegado 403, bloqueando la exposición de datos."
        },
        {
            "img": "docs/sprint-1/evidencias/12_operador_solo_lectura.png",
            "funcionalidad": "Vista de Solo Lectura para Operador en Catálogo de Productos",
            "hu": "HU11, HU16: Permisos de solo lectura según rol",
            "resultado": "Cuando el Operador consulta el catálogo de productos, el sistema oculta los botones de '+ Nuevo Producto', edición y cambio de precios mediante el componente PermissionGate, permitiendo consultar precios pero impidiendo mutaciones."
        },
        {
            "img": "docs/sprint-1/evidencias/13_validacion_correo_duplicado.png",
            "funcionalidad": "Control de Integridad y Regla de Negocio RN05 (Correo Duplicado)",
            "hu": "HU03, HU10: Manejo controlado de excepciones de negocio",
            "resultado": "Al intentar registrar un usuario con un correo electrónico previamente existente, el backend intercepta la colisión, genera un error HTTP 409 con mensaje controlado y el frontend lo presenta como una notificación Toast de error clara sin colapsar la aplicación."
        }
    ]

    for idx, ev in enumerate(evidencias_lista, 1):
        add_h2(f"Evidencia Funcional {idx:02d}: {ev['funcionalidad']}")

        if os.path.exists(ev['img']):
            p_img = doc.add_paragraph()
            p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_img.paragraph_format.space_before = Pt(6)
            p_img.paragraph_format.space_after = Pt(4)
            run_img = p_img.add_run()
            run_img.add_picture(ev['img'], width=Inches(5.8))

        # Ficha técnica
        tbl_f = doc.add_table(rows=3, cols=2)
        tbl_f.alignment = WD_TABLE_ALIGNMENT.CENTER
        set_table_borders(tbl_f)
        col_w_f = [Inches(1.8), Inches(4.7)]

        fields = [
            ("Funcionalidad desarrollada:", ev["funcionalidad"]),
            ("Historia de usuario relacionada:", ev["hu"]),
            ("Resultado obtenido en prueba:", ev["resultado"])
        ]

        for r_idx, (lbl, val) in enumerate(fields):
            row = tbl_f.rows[r_idx]
            format_table_row(row, col_w_f, [lbl, val], is_alt=(r_idx % 2 == 1))
            row.cells[0].paragraphs[0].runs[0].bold = True
            row.cells[0].paragraphs[0].runs[0].font.color.rgb = RGBColor(15, 46, 89)

        doc.add_paragraph().paragraph_format.space_after = Pt(8)

    doc.add_page_break()

    # =========================================================================
    # 14. GUION DE DEMOSTRACIÓN Y PRUEBAS PARA EL DOCENTE EVALUADOR
    # =========================================================================
    add_h1("14. Guion de Demostración para el Docente Evaluador")
    add_body(
        "Para facilitar la revisión y calificación del software en vivo durante la defensa académica, se detalla el procedimiento paso a paso que el docente evaluador puede seguir para verificar la totalidad de los requisitos obligatorios:"
    )

    guion_pasos = [
        ("Paso 1", "Administrador", "Iniciar sesión con admin@jugueteria.com / Admin1234!", "Ingreso exitoso al sistema; visualización de todos los módulos en la barra lateral y saludo."),
        ("Paso 2", "Administrador", "Navegar a 'Usuarios' y hacer clic en '+ Nuevo Usuario'. Crear un usuario de prueba (ej. prueba@jugueteria.com).", "El usuario se registra exitosamente con estado Activo y aparece en la tabla."),
        ("Paso 3", "Administrador", "Asignarle el rol 'Operador' al usuario recién creado y guardar.", "El usuario muestra el rol Operador en su registro; cambio registrado en auditoría."),
        ("Paso 4", "Docente / Operador", "Cerrar sesión e iniciar sesión con el nuevo usuario operador.", "El sistema permite el acceso y muestra únicamente los módulos autorizados (Clientes, Productos)."),
        ("Paso 5", "Operador", "Navegar a 'Clientes' y hacer clic en '+ Nuevo Cliente'. Registrar un cliente con NIT.", "El cliente se crea correctamente y aparece en la lista con distintivo de tipo de cliente."),
        ("Paso 6", "Supervisor", "Iniciar sesión con supervisor@jugueteria.com / Super1234! e ingresar a 'Productos'. Crear '+ Nuevo Producto' indicando precio base Q100.00.", "El sistema calcula automáticamente las 10 escalas de precios con descuentos de 5% a 35%. Se guarda exitosamente."),
        ("Paso 7", "Supervisor", "Modificar el producto recién creado (cambiar nombre o ajustar el precio del lote de 12 uds).", "El registro se actualiza y la base de datos almacena la nueva escala sin errores de orden."),
        ("Paso 8", "Cualquiera", "Probar el buscador dinámico en la tabla de productos y en la tabla de clientes.", "Los registros se filtran en tiempo real según el texto ingresado de forma instantánea."),
        ("Paso 9", "Operador", "Iniciar sesión como Operador e ingresar deliberadamente por URL a http://localhost:5173/usuarios.", "El sistema bloquea la navegación y despliega la pantalla formal de Acceso Denegado 403."),
        ("Paso 10", "Administrador", "Intentar crear un usuario con un correo ya existente (ej. admin@jugueteria.com).", "El sistema rechaza la operación con alerta de correo duplicado (Regla RN05).")
    ]

    tbl_g = doc.add_table(rows=1, cols=4)
    tbl_g.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(tbl_g)
    col_w_g = [Inches(0.8), Inches(1.2), Inches(2.3), Inches(2.2)]
    format_table_header(tbl_g.rows[0], col_w_g, ["Paso", "Actor / Rol", "Acción a Ejecutar", "Resultado Esperado Verificable"])

    for idx, row_vals in enumerate(guion_pasos):
        row = tbl_g.add_row()
        format_table_row(row, col_w_g, row_vals, is_alt=(idx % 2 == 1))

    # =========================================================================
    # 15. RESUMEN DE CALIDAD Y PRUEBAS AUTOMATIZADAS
    # =========================================================================
    add_h1("15. Resumen de Calidad y Pruebas Automatizadas")
    add_body(
        "Para respaldar la estabilidad del primer incremento, se ejecutó la suite completa de pruebas unitarias y de integración en el backend con Vitest, además de la verificación de compilación del frontend:"
    )

    add_bullet("Pruebas Automatizadas Backend (Vitest): ", "48 de 48 pruebas ejecutadas con éxito (100% aprobado en 3.60 segundos). Cobertura sobre autenticación JWT, middleware de roles, control de errores HTTP, reglas de clientes, validación de escalas de precio no crecientes y triggers de auditoría.")
    add_bullet("Compilación Frontend (Vite Build): ", "Construcción de bundle de producción finalizada con 0 errores (1,988 módulos transformados en 16.7s).")
    add_bullet("Definition of Done: ", "El incremento cumple el 100% de la Definition of Done: software funcional probado sin errores en consola, trazabilidad auditada, repositorio versionado en Git y documentación completa.")

    doc.add_paragraph().paragraph_format.space_after = Pt(20)

    # Signatures Box
    tbl_sig = doc.add_table(rows=1, cols=3)
    tbl_sig.alignment = WD_TABLE_ALIGNMENT.CENTER
    col_w_sig = [Inches(2.1), Inches(2.1), Inches(2.1)]
    for i, c in enumerate(tbl_sig.rows[0].cells):
        c.width = col_w_sig[i]
        set_cell_background(c, "F8FAFC")
        set_cell_margins(c, top=200, bottom=140, left=100, right=100)
        p = c.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.line_spacing = 1.15
        if i == 0:
            p.add_run("_________________________\nRaúl\nProduct Owner")
        elif i == 1:
            p.add_run("_________________________\nKevin\nScrum Master")
        else:
            p.add_run("_________________________\nNoé\nLíder Técnico / Dev")
        p.runs[0].font.size = Pt(9.5)
        p.runs[0].font.color.rgb = RGBColor(15, 46, 89)

    output_path = "Entrega_1_Sprint_1_Jugueteria_Quetzal.docx"
    doc.save(output_path)
    print(f"Document saved successfully at: {output_path}")

if __name__ == '__main__':
    create_document()
