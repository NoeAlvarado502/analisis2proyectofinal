import os
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

def set_cell_border(cell, **kwargs):
    """
    Aplica bordes específicos a una celda en formato XML de Word.
    """
    tcPr = cell._tc.get_or_add_tcPr()
    tcBorders = OxmlElement('w:tcBorders')
    for edge in ('top', 'left', 'bottom', 'right'):
        edge_data = kwargs.get(edge)
        if edge_data:
            tag = 'w:{}'.format(edge)
            element = OxmlElement(tag)
            element.set(qn('w:val'), edge_data.get('val', 'single'))
            element.set(qn('w:sz'), str(edge_data.get('sz', 4)))
            element.set(qn('w:space'), '0')
            element.set(qn('w:color'), edge_data.get('color', '000000'))
            tcBorders.append(element)
        else:
            tag = 'w:{}'.format(edge)
            element = OxmlElement(tag)
            element.set(qn('w:val'), 'none')
            tcBorders.append(element)
    tcPr.append(tcBorders)

def format_apa_table(table):
    """
    Aplica el formato estricto de tablas APA 7ma Edición:
    - Sin bordes verticales ni rellenos de color.
    - Borde superior de tabla (sz 8).
    - Borde inferior de fila encabezado (sz 6).
    - Borde inferior de última fila (sz 8).
    - Texto Times New Roman de 10 puntos, interlineado 1.15 y color negro puro.
    """
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    rows = table.rows
    num_rows = len(rows)
    for r_idx, row in enumerate(rows):
        for cell in row.cells:
            for paragraph in cell.paragraphs:
                paragraph.paragraph_format.line_spacing = 1.15
                paragraph.paragraph_format.space_before = Pt(3)
                paragraph.paragraph_format.space_after = Pt(3)
                paragraph.paragraph_format.first_line_indent = Inches(0)
                for run in paragraph.runs:
                    run.font.name = 'Times New Roman'
                    run.font.size = Pt(10)
                    run.font.color.rgb = RGBColor(0, 0, 0)
                    if r_idx == 0:
                        run.font.bold = True
            if r_idx == 0:
                set_cell_border(cell, top={'val': 'single', 'sz': 8}, bottom={'val': 'single', 'sz': 6})
            elif r_idx == num_rows - 1:
                set_cell_border(cell, bottom={'val': 'single', 'sz': 8})
            else:
                set_cell_border(cell, top=None, bottom=None, left=None, right=None)

def add_heading_apa(doc, text, level=1):
    """
    Inserta títulos formateados según la jerarquía APA 7ma Edición:
    - Nivel 1: Centrado y negrita.
    - Nivel 2: Alineado a la izquierda y negrita.
    - Nivel 3: Alineado a la izquierda, negrita y cursiva.
    """
    p = doc.add_paragraph()
    p.paragraph_format.first_line_indent = Inches(0)
    p.paragraph_format.line_spacing = 2.0
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(6)
    run = p.add_run(text)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(12)
    run.font.color.rgb = RGBColor(0, 0, 0)
    run.font.bold = True
    if level == 1:
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    elif level == 2:
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    elif level == 3:
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        run.font.italic = True
    return p

def add_body_p(doc, text, indent=True):
    """
    Inserta un párrafo narrativo con sangría de primera línea de 1.27 cm (0.5 pulgadas)
    e interlineado doble (2.0) en Times New Roman 12 pt negro.
    """
    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 2.0
    p.paragraph_format.space_before = Pt(0)
    p.paragraph_format.space_after = Pt(0)
    p.paragraph_format.first_line_indent = Inches(0.5) if indent else Inches(0)
    run = p.add_run(text)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(12)
    run.font.color.rgb = RGBColor(0, 0, 0)
    return p

def add_table_caption(doc, number, title):
    """
    Inserta el encabezado formal de tabla APA 7ma Edición:
    Tabla X en negrita, seguido del título en cursiva en línea separada.
    """
    p_num = doc.add_paragraph()
    p_num.paragraph_format.first_line_indent = Inches(0)
    p_num.paragraph_format.line_spacing = 2.0
    p_num.paragraph_format.space_before = Pt(12)
    p_num.paragraph_format.space_after = Pt(0)
    r_num = p_num.add_run(f"Tabla {number}")
    r_num.font.name = 'Times New Roman'
    r_num.font.size = Pt(12)
    r_num.font.bold = True
    r_num.font.color.rgb = RGBColor(0, 0, 0)

    p_title = doc.add_paragraph()
    p_title.paragraph_format.first_line_indent = Inches(0)
    p_title.paragraph_format.line_spacing = 2.0
    p_title.paragraph_format.space_before = Pt(0)
    p_title.paragraph_format.space_after = Pt(6)
    r_title = p_title.add_run(title)
    r_title.font.name = 'Times New Roman'
    r_title.font.size = Pt(12)
    r_title.font.italic = True
    r_title.font.color.rgb = RGBColor(0, 0, 0)

def add_placeholder_box(doc, fig_num, label, description):
    """
    Inserta un recuadro sobrio con borde simple fino negro (sz 4) centrado,
    con el texto formal para pegar capturas y diagramas de evidencia.
    """
    tbl = doc.add_table(rows=1, cols=1)
    tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = tbl.cell(0, 0)
    cell.width = Inches(6.5)
    set_cell_border(cell,
        top={'val': 'single', 'sz': 4, 'color': '000000'},
        bottom={'val': 'single', 'sz': 4, 'color': '000000'},
        left={'val': 'single', 'sz': 4, 'color': '000000'},
        right={'val': 'single', 'sz': 4, 'color': '000000'}
    )
    p = cell.paragraphs[0]
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.first_line_indent = Inches(0)
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(8)
    
    r1 = p.add_run(f"Figura {fig_num}. [ESPACIO RESERVADO PARA CAPTURA: {label}]\n")
    r1.font.name = 'Times New Roman'
    r1.font.size = Pt(10)
    r1.font.bold = True
    r1.font.italic = True
    r1.font.color.rgb = RGBColor(0, 0, 0)
    
    r2 = p.add_run(description)
    r2.font.name = 'Times New Roman'
    r2.font.size = Pt(10)
    r2.font.italic = True
    r2.font.color.rgb = RGBColor(0, 0, 0)

    p_after = doc.add_paragraph()
    p_after.paragraph_format.space_before = Pt(0)
    p_after.paragraph_format.space_after = Pt(6)
    p_after.paragraph_format.line_spacing = 2.0

def build_document():
    doc = Document()

    # Configuración estricta de márgenes de 2.54 cm (1 pulgada)
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)

    # =========================================================================
    # PORTADA ACADÉMICA APA 7
    # =========================================================================
    for _ in range(4):
        doc.add_paragraph()

    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.line_spacing = 2.0
    r_t = p_title.add_run(
        "Sistema de Gestión de Pedidos, Inventario y Ventas:\n"
        "Entrega 3 – Sprint 3 (Pedidos, Ventas, Pagos, Auditoría e Informes de Inventario)"
    )
    r_t.font.name = 'Times New Roman'
    r_t.font.size = Pt(12)
    r_t.font.bold = True
    r_t.font.color.rgb = RGBColor(0, 0, 0)

    doc.add_paragraph()

    meta_lines = [
        "Raúl, Noé y Kevin",
        "Facultad de Ingeniería en Sistemas y Ciencias de la Computación",
        "Curso: Análisis de Sistemas II",
        "23 de octubre de 2026"
    ]
    for line in meta_lines:
        pm = doc.add_paragraph()
        pm.alignment = WD_ALIGN_PARAGRAPH.CENTER
        pm.paragraph_format.line_spacing = 2.0
        rm = pm.add_run(line)
        rm.font.name = 'Times New Roman'
        rm.font.size = Pt(12)
        rm.font.color.rgb = RGBColor(0, 0, 0)

    doc.add_page_break()

    # =========================================================================
    # 1. META DEL SPRINT Y ALCANCE DE LA ENTREGA 3
    # =========================================================================
    add_heading_apa(doc, "1. Meta del Sprint (Sprint Goal) y Alcance de la Entrega 3", 1)
    add_body_p(
        doc,
        "La meta del tercer Sprint, planificada formalmente en la sesión de Sprint Planning "
        "el lunes 19 de octubre de 2026, consistió en implementar y validar de extremo a extremo "
        "el núcleo comercial y transaccional del sistema de juguetería. Este ciclo comprendió "
        "la integración secuencial del proceso de ventas: desde la creación del pedido por el cliente "
        "o el operador, la selección de artículos con aplicación automática de escalas de precios "
        "y validación de disponibilidad física de stock en tiempo real (RN-01), hasta el flujo "
        "de autorización de descuentos especiales superiores al 10% por parte del rol Supervisor (RN-07), "
        "la generación de la venta formal a partir de pedidos en estado APROBADO, el registro de cobros "
        "parciales o totales con control estricto de saldo pendiente (RN-09), y el descuento físico "
        "inmediato en el kardex de inventario únicamente al liquidar el saldo a cero (RN-03)."
    )
    add_body_p(
        doc,
        "Adicionalmente, el alcance de este incremento incluyó la construcción de una bitácora de auditoría "
        "inmutable protegida por disparadores a nivel de motor de base de datos contra borrados y modificaciones "
        "(RN-14), dotada de capacidades de búsqueda multicriterio y visor amigable de comparativa JSON, "
        "así como el desarrollo del módulo contable-operativo de Informes de Inventario. Dicho módulo "
        "proporciona el Informe de Kardex Físico y Trazabilidad con indicadores clave de rendimiento (KPIs), "
        "y el Informe de Valoración Total de Inventario basado en el método de Costo Promedio Ponderado (CPP), "
        "obtenido dinámicamente sobre compras recibidas sin alterar la estructura base del catálogo de productos, "
        "junto con exportación limpia a formato CSV compatible con hojas de cálculo y un diseño de impresión "
        "horizontal de alta densidad adaptado a papel blanco puro."
    )

    # =========================================================================
    # 2. PRODUCT BACKLOG ACTUALIZADO (Tabla 1)
    # =========================================================================
    add_heading_apa(doc, "2. Product Backlog Actualizado", 1)
    add_body_p(
        doc,
        "En la Tabla 1 se expone el estado consolidado del Product Backlog general del proyecto "
        "al cierre del Sprint 3. Se observa la conclusión exitosa de las 17 historias de usuario "
        "planificadas para los primeros tres sprints (HU-01 a HU-05 en el Sprint 1; HU-06 a HU-11 "
        "en el Sprint 2; y HU-12 a HU-17 en el presente Sprint 3), restando para la cuarta iteración "
        "únicamente el Dashboard general de indicadores gerenciales y la integración final para la defensa."
    )

    add_table_caption(doc, 1, "Product Backlog General del Sistema Actualizado al Cierre del Sprint 3")
    pb_data = [
        ["ID", "Historia / Requerimiento Funcional", "Módulo", "Prioridad", "Sprint", "Estado"],
        ["HU-01", "Inicio de sesión con credenciales y emisión de sesión segura", "Autenticación", "Alta", "Sprint 1", "Completado"],
        ["HU-02", "Administración de usuarios y asignación de roles", "Usuarios", "Alta", "Sprint 1", "Completado"],
        ["HU-03", "Configuración de matriz de roles y permisos (RBAC)", "Roles", "Alta", "Sprint 1", "Completado"],
        ["HU-04", "Registro, edición y consulta de cartera de clientes", "Clientes", "Media", "Sprint 1", "Completado"],
        ["HU-05", "Gestión de catálogo de productos y escalas de precios", "Productos", "Alta", "Sprint 1", "Completado"],
        ["HU-06", "Registro, edición e inactivación lógica de proveedores", "Proveedores", "Alta", "Sprint 2", "Completado"],
        ["HU-07", "Emisión de órdenes de compra con detalle de artículos", "Compras", "Alta", "Sprint 2", "Completado"],
        ["HU-08", "Recepción de mercadería e ingreso automático a inventario", "Compras / Inv.", "Alta", "Sprint 2", "Completado"],
        ["HU-09", "Consulta de existencias actuales y configuración de stock mínimo", "Inventario", "Alta", "Sprint 2", "Completado"],
        ["HU-10", "Consulta de kardex y registro justificado de ajustes/devoluciones", "Inventario", "Media", "Sprint 2", "Completado"],
        ["HU-11", "Generación y seguimiento de alertas por nivel mínimo de stock", "Inventario", "Alta", "Sprint 2", "Completado"],
        ["HU-12", "Creación de pedidos de clientes, escalas de precio y validación de stock (RN01)", "Pedidos", "Alta", "Sprint 3", "Completado"],
        ["HU-13", "Control de estados del pedido y autorización de descuentos especiales (RN07)", "Pedidos", "Alta", "Sprint 3", "Completado"],
        ["HU-14", "Facturación de pedidos aprobados y bloqueo de pedidos no autorizados", "Ventas", "Alta", "Sprint 3", "Completado"],
        ["HU-15", "Registro de pagos parciales/totales y salida automática de stock (RN03/RN09)", "Pagos", "Alta", "Sprint 3", "Completado"],
        ["HU-16", "Consulta de bitácora de auditoría inmutable con comparativa JSON (RN14)", "Auditoría", "Media", "Sprint 3", "Completado"],
        ["HU-17", "Informes de Inventario: Kardex Físico y Valoración por Costo Promedio (CPP)", "Reportes", "Alta", "Sprint 3", "Completado"],
        ["HU-18", "Dashboard general ejecutivo con métricas comerciales y gráficas acumuladas", "Dashboard", "Media", "Sprint 4", "Pendiente"]
    ]
    t_pb = doc.add_table(rows=len(pb_data), cols=6)
    for r_i, row in enumerate(pb_data):
        for c_i, val in enumerate(row):
            t_pb.cell(r_i, c_i).text = val
    format_apa_table(t_pb)

    # =========================================================================
    # 3. HISTORIAS DE USUARIO Y CRITERIOS DE ACEPTACIÓN DEL SPRINT 3 (Tabla 2)
    # =========================================================================
    add_heading_apa(doc, "3. Historias de Usuario y Criterios de Aceptación del Sprint 3", 1)
    add_body_p(
        doc,
        "En la Tabla 2 se desglosan formalmente las seis historias de usuario ejecutadas "
        "en el Sprint 3, redactadas bajo la estructura estándar 'Como [rol], quiero [funcionalidad] "
        "para [beneficio esperado]', acompañadas de sus respectivos criterios de aceptación "
        "técnicos y verificables."
    )

    add_table_caption(doc, 2, "Especificación Exhaustiva de Historias de Usuario y Criterios de Aceptación (Sprint 3)")
    hu_data = [
        ["ID", "Enunciado de la Historia de Usuario", "Criterios de Aceptación Verificables"],
        [
            "HU-12",
            "Como Vendedor u Operador, quiero registrar pedidos de clientes seleccionando productos con aplicación automática de escalas de precios por volumen y validando existencias disponibles en tiempo real, para cotizar oportunamente y evitar compromisos sin inventario físico.",
            "1. La escala de precios se aplica automáticamente según la cantidad: menudeo (1), trío (3), media docena (6), docena (12), caja (25), bulto (50), mayorista (100), distribuidor (500), máster (1000) e industrial (10000).\n"
            "2. El sistema valida estrictamente que la cantidad solicitada no exceda inventario.stock_actual; si supera la existencia, se rechaza la operación con código HTTP 409 y mensaje explícito (RN-01).\n"
            "3. El pedido se guarda inicialmente en estado CREADO con cálculo dinámico de subtotal y total.\n"
            "4. Permite agregar observaciones y porcentaje de descuento extra por renglón."
        ],
        [
            "HU-13",
            "Como Supervisor, quiero gestionar los estados del pedido y autorizar o rechazar solicitudes con descuento especial mayor al límite permitido (10%), para resguardar los márgenes de utilidad del negocio exigiendo una justificación formal obligatoria.",
            "1. Si el pedido tiene descuento extra menor o igual al 10%, al ejecutarse el envío transiciona directamente a estado APROBADO sin requerir visto bueno adicional.\n"
            "2. Si algún renglón o el pedido global posee descuento extra mayor al 10%, el envío retiene el pedido en estado PENDIENTE_APROBACION con bandera requiere_autorizacion = 1 (RN-07).\n"
            "3. Intentos de autorización por usuarios con rol Operador son bloqueados con código HTTP 403 Forbidden.\n"
            "4. La autorización o rechazo por el Supervisor exige ingresar motivo_descuento_especial obligatorio y registra el identificador del supervisor."
        ],
        [
            "HU-14",
            "Como Cajero u Operador de facturación, quiero generar ventas a partir de pedidos en estado APROBADO, para emitir el comprobante formal de factura transfiriendo íntegramente los productos y precios pactados.",
            "1. Únicamente los pedidos en estado APROBADO pueden facturarse; pedidos en PENDIENTE_APROBACION, EN_PROCESO o CANCELADO son rechazados con HTTP 409.\n"
            "2. Al facturar, el sistema genera la cabecera en la tabla ventas con correlativo único autoincremental FACT-XXXX y copia cada renglón en ventas_detalle.\n"
            "3. La venta se inicializa en estado PENDIENTE con saldo_pendiente igual al total facturado.\n"
            "4. El pedido origen transiciona automáticamente a estado EN_PROCESO."
        ],
        [
            "HU-15",
            "Como Cajero o Administrador, quiero registrar pagos parciales o totales vinculados a facturas emitidas mediante diversas formas de cobro, para amortizar la deuda y disparar automáticamente la salida física de inventario al liquidar el saldo a cero.",
            "1. Permite pagos mediante EFECTIVO, TARJETA_DEBITO, TARJETA_CREDITO y TRANSFERENCIA con registro de referencia bancaria cuando aplique.\n"
            "2. El sistema impide pagos con montos superiores al saldo_pendiente de la venta (RN-09), retornando HTTP 409.\n"
            "3. Mientras saldo_pendiente > 0, la venta permanece PENDIENTE y las existencias físicas se mantienen intactas en bodega.\n"
            "4. Al registrarse el pago que deja saldo_pendiente = 0, la venta pasa a COMPLETADA, el pedido a COMPLETADO y se insertan movimientos de SALIDA en el kardex descontando el inventario físico (RN-03).\n"
            "5. Una venta COMPLETADA es inmutable y no admite modificaciones ni anulaciones (RN-08)."
        ],
        [
            "HU-16",
            "Como Administrador o Auditor, quiero consultar la bitácora de auditoría inmutable del sistema mediante filtros avanzados multicriterio y visualización comparativa de cambios, para garantizar la trazabilidad legal y operativa de todas las transacciones.",
            "1. La tabla auditoria almacena usuario, módulo, acción, tabla afectada, ID de registro, dirección IP, timestamps y estados JSON anterior y nuevo.\n"
            "2. Disparadores SQL BEFORE UPDATE y BEFORE DELETE bloquean estrictamente cualquier alteración o borrado de registros de auditoría (RN-14).\n"
            "3. Interfaz con filtros reactivos por usuario, módulo, acción, identificador de registro y rango de fechas con componentes propios del sistema.\n"
            "4. Visualizador interactivo estructurado con vista amigable de cambios de atributos clave."
        ],
        [
            "HU-17",
            "Como Administrador, Contador o Encargado de Bodega, quiero generar los Informes de Inventario (Kardex Físico y Trazabilidad, y Valoración Total por Costo Promedio Ponderado), con exportación a CSV e impresión horizontal formal sobre papel blanco puro, para auditar existencias y conocer el patrimonio contable del negocio.",
            "1. Informe 1 (Kardex): Presenta trazabilidad de movimientos (ENTRADA, SALIDA, AJUSTE, DEVOLUCION), 4 tarjetas KPI y fila de balance condicional al filtrar por producto específico.\n"
            "2. Informe 2 (Valoración): Calcula dinámicamente el Costo Promedio Ponderado (CPP) sobre compras recibidas, Valor Comercial a menudeo Nivel 1, Margen Bruto Potencial y porcentaje de participación por SKU sin alterar la tabla productos.\n"
            "3. Prefijo monetario estricto 'Q ' con dos decimales en todas las métricas de valor y costo.\n"
            "4. Exportación limpia a CSV con codificación UTF-8 BOM y valores numéricos puros para hojas de cálculo.\n"
            "5. Reglas de impresión y exportación a PDF (@media print) con fondo blanco puro (#FFFFFF), supresión total de texturas/patrones decorativos y tabla tabular responsive."
        ]
    ]
    t_hu = doc.add_table(rows=len(hu_data), cols=3)
    for r_i, row in enumerate(hu_data):
        for c_i, val in enumerate(row):
            t_hu.cell(r_i, c_i).text = val
    format_apa_table(t_hu)

    # =========================================================================
    # 4. SPRINT BACKLOG Y DISTRIBUCIÓN KANBAN DEL EQUIPO (Tablas 3 y 4 + Fig 1)
    # =========================================================================
    add_heading_apa(doc, "4. Sprint Backlog y Distribución Kanban del Equipo", 1)
    add_body_p(
        doc,
        "El esfuerzo técnico del Sprint 3 fue distribuido de manera equitativa entre los tres "
        "integrantes del equipo de ingeniería (Noé, Raúl y Kevin), cubriendo las tres capas "
        "de la arquitectura: la capa de base de datos relacional y lógica declarativa (triggers y vistas SQL), "
        "la capa de servicios y controladores de la API REST en Node.js/Express con seguridad RBAC, "
        "y la capa de presentación en React con componentes propios del sistema. "
        "En la Tabla 3 se detalla el Sprint Backlog técnico con las 12 tareas ejecutadas, y en la "
        "Tabla 4 se presenta la distribución final del tablero Kanban al cierre de la iteración."
    )

    add_table_caption(doc, 3, "Sprint Backlog Técnico y Asignación de Tareas del Sprint 3")
    sb_data = [
        ["Código", "Tarea Técnica de Ingeniería", "HU Rel.", "Responsable", "Estimación (h)", "Estado Final"],
        ["TK-01", "Modelado relacional y creación de tablas pedidos, pedidos_detalle, ventas, ventas_detalle, pagos, auditoria y configuraciones", "HU-12 a HU-16", "Noé", "5", "Completado"],
        ["TK-02", "Programación de triggers trg_pedidos_bi/bu, trg_ventas_bu, trg_pagos_ai, trg_auditoria_bu/bd e inmutabilidad de kardex", "HU-12, HU-15, HU-16", "Noé", "7", "Completado"],
        ["TK-03", "Diseño de subconsultas analíticas para Costo Promedio Ponderado (CPP), vista v_kardex y optimización de índices", "HU-17", "Noé", "4", "Completado"],
        ["TK-04", "Desarrollo de API REST de Pedidos (schema Zod, servicio maestro-detalle con escalas automáticas, envío y cancelación)", "HU-12", "Raúl", "6", "Completado"],
        ["TK-05", "Implementación del flujo de Autorización de Descuentos Especiales con control RBAC para rol Supervisor", "HU-13", "Raúl", "4", "Completado"],
        ["TK-06", "Desarrollo de API REST de Ventas (facturación desde pedidos aprobados, correlativos FACT-XXXX y cálculo de saldos)", "HU-14", "Raúl", "5", "Completado"],
        ["TK-07", "Desarrollo de API REST de Pagos (múltiples cobros, recibos REC-XXXX, validación RN-09 y salida automática de stock)", "HU-15", "Raúl", "6", "Completado"],
        ["TK-08", "Desarrollo de API REST de Auditoría y módulo de Reportes (Kardex Físico y Valoración de Inventario por CPP)", "HU-16, HU-17", "Raúl", "6", "Completado"],
        ["TK-09", "Diseño y ejecución de suite de 11 pruebas de integración automatizadas en Vitest pedidos_ventas_pagos.test.js", "HU-12 a HU-17", "Raúl", "5", "Completado"],
        ["TK-10", "Construcción de interfaz PedidosPage.jsx con selectores dinámicos, cálculo reactivo de escalas y modal de autorización", "HU-12, HU-13", "Kevin", "7", "Completado"],
        ["TK-11", "Construcción de interfaz VentasPage.jsx con modal de cobro unificado, soporte multi-pago y desglose de recibos", "HU-14, HU-15", "Kevin", "6", "Completado"],
        ["TK-12", "Construcción de AuditoriaPage.jsx y ReportesPage.jsx con FilterDropdown, SearchableSelect, exportación CSV e impresión @media print", "HU-16, HU-17", "Kevin", "7", "Completado"]
    ]
    t_sb = doc.add_table(rows=len(sb_data), cols=6)
    for r_i, row in enumerate(sb_data):
        for c_i, val in enumerate(row):
            t_sb.cell(r_i, c_i).text = val
    format_apa_table(t_sb)

    add_table_caption(doc, 4, "Tablero Kanban de Seguimiento de Tareas por Integrante al Cierre del Sprint 3")
    kb_data = [
        ["Integrante", "Por Hacer (To Do)", "En Progreso (In Progress)", "En Revisión / QA", "Completado (Done)"],
        [
            "Noé (Base de Datos y Procedimientos SQL)",
            "Ninguna al cierre",
            "Ninguna al cierre",
            "Verificación de planes de ejecución EXPLAIN para la subconsulta de Costo Promedio Ponderado",
            "TK-01: Tablas de pedidos, ventas, pagos y auditoría.\nTK-02: Triggers transaccionales de inventario y saldos.\nTK-03: Subconsultas de CPP y optimización de v_kardex."
        ],
        [
            "Raúl (Lógica de Negocio Backend y Testing)",
            "Ninguna al cierre",
            "Ninguna al cierre",
            "Ejecución de regresión integral (66 pruebas automatizadas aprobadas en Vitest)",
            "TK-04: Endpoints de pedidos y escalas de mayoreo.\nTK-05: Autorización de descuentos especiales (>10%).\nTK-06: Facturación formal maestro-detalle.\nTK-07: Cobros y salida automática de stock.\nTK-08: Auditoría y servicios de Kardex y CPP.\nTK-09: Suite pedidos_ventas_pagos.test.js."
        ],
        [
            "Kevin (Interfaz React, UX y Reportes)",
            "Ninguna al cierre",
            "Ninguna al cierre",
            "Validación visual de responsividad en impresión PDF sobre Chrome y Edge",
            "TK-10: Pantalla PedidosPage.jsx y modal de autorizaciones.\nTK-11: Pantalla VentasPage.jsx y modal de cobro multi-recibo.\nTK-12: AuditoriaPage.jsx e Informes de Inventario en ReportesPage.jsx con CSV y @media print."
        ]
    ]
    t_kb = doc.add_table(rows=len(kb_data), cols=5)
    for r_i, row in enumerate(kb_data):
        for c_i, val in enumerate(row):
            t_kb.cell(r_i, c_i).text = val
    format_apa_table(t_kb)

    add_placeholder_box(
        doc,
        1,
        "Tablero Kanban del Sprint 3",
        "Insertar captura del tablero Kanban del equipo (Trello, Jira o GitHub Projects) mostrando el flujo de las 12 tarjetas técnicas completadas por Noé, Raúl y Kevin."
    )

    # =========================================================================
    # 5. MODELO DE DATOS Y FORMULACIÓN DE INFORMES (Tabla 5)
    # =========================================================================
    add_heading_apa(doc, "5. Modelo de Datos y Formulación de Informes del Sprint 3", 1)
    add_body_p(
        doc,
        "La arquitectura de datos relacional para el tercer incremento funcional integró las entidades "
        "comerciales, los registros de trazabilidad y las consultas analíticas de reportería contable. "
        "En la Tabla 5 se detallan las tablas creadas y enriquecidas durante el Sprint 3, indicando sus "
        "claves primarias, foráneas, restricciones de integridad y la lógica de formulación de los informes."
    )

    add_table_caption(doc, 5, "Estructura Relacional y Consultas Analíticas del Incremento del Sprint 3")
    md_data = [
        ["Tabla / Vista", "Clave Primaria", "Claves Foráneas", "Columnas Principales, Restricciones y Reglas"],
        [
            "pedidos",
            "id_pedido",
            "id_cliente -> clientes\nid_usuario -> usuarios\nid_usuario_autorizo -> usuarios",
            "numero_pedido (UNIQUE, PED-XXXX), estado ENUM('CREADO', 'PENDIENTE_APROBACION', 'APROBADO', 'EN_PROCESO', 'COMPLETADO', 'CANCELADO'), subtotal DECIMAL(12,2), total DECIMAL(12,2), requiere_autorizacion BOOLEAN, motivo_descuento_especial TEXT, fecha_creacion, fecha_autorizacion."
        ],
        [
            "pedidos_detalle",
            "id_pedido_detalle",
            "id_pedido -> pedidos\nid_producto -> productos\nid_escala_aplicada -> escalas_precio",
            "cantidad INT UNSIGNED CHECK (cantidad > 0), precio_escala DECIMAL(10,2), porcentaje_descuento_extra DECIMAL(5,2) DEFAULT 0.00, subtotal STORED (cantidad * precio_escala * (1 - porcentaje_descuento_extra/100)), UNIQUE(id_pedido, id_producto)."
        ],
        [
            "ventas",
            "id_venta",
            "id_pedido -> pedidos\nid_cliente -> clientes\nid_usuario -> usuarios",
            "numero_factura (UNIQUE, FACT-XXXX), estado ENUM('PENDIENTE', 'COMPLETADA', 'ANULADA'), total DECIMAL(12,2) CHECK (total > 0), saldo_pendiente DECIMAL(12,2) CHECK (saldo_pendiente >= 0), fecha_venta, fecha_anulacion, motivo_anulacion."
        ],
        [
            "ventas_detalle",
            "id_venta_detalle",
            "id_venta -> ventas\nid_producto -> productos",
            "cantidad INT UNSIGNED CHECK (cantidad > 0), precio_unitario DECIMAL(10,2) CHECK (precio_unitario > 0), porcentaje_descuento DECIMAL(5,2), subtotal STORED, UNIQUE(id_venta, id_producto)."
        ],
        [
            "pagos",
            "id_pago",
            "id_venta -> ventas\nid_usuario -> usuarios",
            "numero_recibo (UNIQUE, REC-XXXX), monto DECIMAL(12,2) CHECK (monto > 0), metodo_pago ENUM('EFECTIVO', 'TARJETA_DEBITO', 'TARJETA_CREDITO', 'TRANSFERENCIA'), referencia_pago VARCHAR(100), fecha_pago."
        ],
        [
            "auditoria",
            "id_auditoria",
            "id_usuario -> usuarios",
            "modulo VARCHAR(50), accion VARCHAR(50), tabla_afectada VARCHAR(50), registro_id INT, estado_anterior JSON, estado_nuevo JSON, direccion_ip VARCHAR(45), fecha_hora TIMESTAMP. Protegida con triggers contra UPDATE y DELETE."
        ],
        [
            "configuraciones",
            "id_config",
            "N/A",
            "clave VARCHAR(50) UNIQUE (ej. 'DESCUENTO_MAX_VENDEDOR'), valor VARCHAR(100) (por defecto '10'), descripcion TEXT, categoria VARCHAR(50)."
        ],
        [
            "v_kardex (Vista)",
            "id_movimiento",
            "id_producto, id_usuario",
            "Vista analítica que unifica movimientos_inventario, productos, categorias y usuarios exponiendo SKU, producto, tipo_movimiento, documento_tipo, documento_id, stock_anterior, cantidad, stock_posterior, usuario y fecha_hora."
        ],
        [
            "Consulta Analítica: Valoración Total (CPP)",
            "N/A (Consulta Agregada)",
            "productos, compras_detalle, compras, escalas_precio",
            "Calcula el Costo Promedio Ponderado como COALESCE(SUM(cd.subtotal) / NULLIF(SUM(cd.cantidad), 0), 0.00) sobre compras con estado='RECIBIDA'. Precio Menudeo desde escalas_precio (cantidad_minima=1, activo=1). No modifica la tabla productos."
        ]
    ]
    t_md = doc.add_table(rows=len(md_data), cols=4)
    for r_i, row in enumerate(md_data):
        for c_i, val in enumerate(row):
            t_md.cell(r_i, c_i).text = val
    format_apa_table(t_md)

    add_body_p(
        doc,
        "Un aspecto arquitectónico fundamental radicó en no alterar la tabla base productos para añadir "
        "columnas redundantes de costo. El costo promedio ponderado se obtiene dinámicamente evaluando "
        "el historial real de abastecimiento: la sumatoria de subtotales de compras recibidas dividida entre "
        "el total de unidades ingresadas. En productos sin historial de compras registrado, la consulta "
        "aplica un fallback contable hacia el costo de la última compra registrada mediante funciones de "
        "ventana ROW_NUMBER() OVER (PARTITION BY cd.id_producto ORDER BY c.fecha_recepcion DESC), o en su "
        "defecto 0.00, asegurando precisión financiera sin redundancia de datos."
    )

    # =========================================================================
    # 6. DIAGRAMAS ACTUALIZADOS DEL SISTEMA (Figuras 2, 3, 4 y 5)
    # =========================================================================
    add_heading_apa(doc, "6. Diagramas Actualizados del Sistema", 1)
    add_body_p(
        doc,
        "En esta sección se presentan los diagramas de modelado que sustentan la comprensión "
        "arquitectónica y funcional del tercer incremento: el diagrama de casos de uso comercial, "
        "la máquina de estados del pedido, el diagrama de secuencia del proceso comercial integral "
        "y el modelo entidad-relación actualizado al Sprint 3."
    )

    add_placeholder_box(
        doc,
        2,
        "Diagrama de Casos de Uso del Sprint 3",
        "Insertar imagen del diagrama de casos de uso mostrando a los actores Administrador, Supervisor y Operador/Vendedor interactuando con Crear Pedido, Aplicar Escala de Precios, Autorizar Descuento Especial, Facturar Venta, Registrar Pagos, Consultar Bitácora de Auditoría y Emitir Informes de Inventario."
    )

    add_placeholder_box(
        doc,
        3,
        "Diagrama de Máquina de Estados del Pedido",
        "Insertar imagen del diagrama de estados ilustrando las transiciones del ciclo de vida del pedido: CREADO -> PENDIENTE_APROBACION (si descuento > 10%) -> APROBADO (por autorización de supervisor o descuento <= 10%) -> EN_PROCESO (al emitirse la factura de venta) -> COMPLETADO (al liquidar el saldo total) o CANCELADO."
    )

    add_placeholder_box(
        doc,
        4,
        "Diagrama de Secuencia del Proceso Comercial Completo",
        "Insertar imagen del diagrama de secuencia representando la interacción: Cliente/Operador -> PedidosController/Service -> Verificación de Stock (RN01) -> Evaluación de Descuento (RN07) -> Supervisor (Autorización) -> VentasService (Facturación) -> PagosService (Cobro parcial/total RN09) -> MySQL Triggers (Salida física Kardex RN03) -> Auditoría Inmutable (RN14)."
    )

    add_placeholder_box(
        doc,
        5,
        "Modelo Entidad-Relación Actualizado al Sprint 3",
        "Insertar imagen del diagrama Entidad-Relación completo destacando las relaciones entre clientes, pedidos, pedidos_detalle, ventas, ventas_detalle, pagos, auditoria, productos, escalas_precio, inventario, movimientos_inventario y compras_detalle."
    )

    # =========================================================================
    # 7. REGLAS DE NEGOCIO Y RESTRICCIONES POR ROL (Tablas 6 y 7)
    # =========================================================================
    add_heading_apa(doc, "7. Reglas de Negocio y Restricciones por Rol", 1)
    add_body_p(
        doc,
        "Para garantizar la solidez transaccional y la disciplina operativa, el equipo formalizó "
        "siete reglas de negocio críticas para el flujo de pedidos, ventas, pagos y auditoría, "
        "respaldadas por una matriz de control de acceso basado en roles (RBAC). "
        "En la Tabla 6 se describen las reglas de negocio implementadas y en la Tabla 7 se presenta "
        "la matriz de permisos para los roles Administrador, Supervisor y Operador."
    )

    add_table_caption(doc, 6, "Catálogo de Reglas de Negocio Implementadas en el Sprint 3")
    rn_data = [
        ["Código", "Nombre de la Regla", "Mecanismo de Implementación (BD / Backend)", "Comportamiento ante Incumplimiento"],
        [
            "RN-01",
            "Prohibición de venta sin inventario suficiente",
            "Evaluación previa en PedidosService.crear/agregarDetalle y en trg_pedidos_bi comparando cantidad con inventario.stock_actual.",
            "Operación rechazada con código HTTP 409 (BUSINESS_RULE_VIOLATION) impidiendo comprometer stock inexistente."
        ],
        [
            "RN-03",
            "Disminución automática de inventario al liquidar venta",
            "Trigger trg_pagos_ai detecta cuando saldo_pendiente llega a 0.00 e inserta movimientos de tipo SALIDA en movimientos_inventario.",
            "Descuento automático de existencias físicas en bodega e inserción inmediata de trazabilidad en el kardex."
        ],
        [
            "RN-06",
            "Prohibición de facturar ventas sin renglones de producto",
            "Validación obligatoria en VentasService.crear verificando que el pedido asociado posea al menos un detalle activo.",
            "Rechazo de la petición con HTTP 400 Bad Request / 409 Conflict impidiendo emitir facturas vacías."
        ],
        [
            "RN-07",
            "Autorización obligatoria para descuentos mayores al 10%",
            "Evaluación en PedidosService.enviar contra configuraciones.DESCUENTO_MAX_VENDEDOR. Retiene en PENDIENTE_APROBACION si supera el umbral.",
            "El pedido queda retenido y solo puede ser desbloqueado por un usuario con rol Supervisor o Administrador con motivo documentado."
        ],
        [
            "RN-08",
            "Inmutabilidad de ventas completadas",
            "Validaciones en VentasService.anular y trigger trg_ventas_bu impidiendo anular o modificar ventas en estado COMPLETADA.",
            "Transacción abortada con código HTTP 409 indicando que una factura finalizada y liquidada no admite alteraciones."
        ],
        [
            "RN-09",
            "Prohibición de pagos superiores al saldo pendiente",
            "Evaluación en PagosService.crear y trigger trg_pagos_bi verificando que monto <= ventas.saldo_pendiente.",
            "Rechazo de la transacción con HTTP 409 evitando saldos negativos o inconsistencias en cuentas por cobrar."
        ],
        [
            "RN-14",
            "Inmutabilidad de la bitácora de auditoría",
            "Disparadores SQL BEFORE UPDATE y BEFORE DELETE sobre la tabla auditoria emitiendo SIGNAL SQLSTATE '45000'.",
            "Bloqueo absoluto a nivel de motor de base de datos ante cualquier intento de edición o borrado físico de la auditoría."
        ]
    ]
    t_rn = doc.add_table(rows=len(rn_data), cols=4)
    for r_i, row in enumerate(rn_data):
        for c_i, val in enumerate(row):
            t_rn.cell(r_i, c_i).text = val
    format_apa_table(t_rn)

    add_table_caption(doc, 7, "Matriz de Restricciones y Permisos por Rol (RBAC) para el Sprint 3")
    rbac_data = [
        ["Operación / Módulo Funcional", "Administrador", "Supervisor", "Operador / Cajero", "Fundamento de Control de Seguridad"],
        ["Crear y editar pedidos de clientes (HU-12)", "Permitido", "Permitido", "Permitido", "Permite la cotización y captura ágil de pedidos en sala de ventas."],
        ["Enviar pedido con descuento <= 10%", "Permitido", "Permitido", "Permitido", "Pasa automáticamente a estado APROBADO sin fricción administrativa."],
        ["Autorizar descuento especial > 10% (HU-13)", "Permitido", "Permitido", "Bloqueado (403)", "Protección de márgenes; el vendedor no puede auto-aprobarse descuentos."],
        ["Facturar pedido en estado APROBADO (HU-14)", "Permitido", "Permitido", "Permitido", "Cualquier cajero puede facturar si el pedido cuenta con aprobación formal."],
        ["Facturar pedido no aprobado o cancelado", "Bloqueado (409)", "Bloqueado (409)", "Bloqueado (409)", "Regla estricta del sistema para todos los roles."],
        ["Registrar pagos y amortizaciones (HU-15)", "Permitido", "Permitido", "Permitido", "Habilita el cobro en caja en efectivo, tarjetas o transferencias."],
        ["Anular venta en estado PENDIENTE", "Permitido", "Permitido", "Bloqueado (403)", "La anulación de documentos fiscales exige jerarquía supervisora."],
        ["Consultar bitácora de auditoría (HU-16)", "Permitido", "Permitido", "Bloqueado (403)", "Información confidencial reservada para auditoría y gerencia."],
        ["Generar Informes de Inventario (HU-17)", "Permitido", "Permitido", "Bloqueado (403)", "Los informes de valoración y kardex implican datos financieros sensibles."]
    ]
    t_rbac = doc.add_table(rows=len(rbac_data), cols=5)
    for r_i, row in enumerate(rbac_data):
        for c_i, val in enumerate(row):
            t_rbac.cell(r_i, c_i).text = val
    format_apa_table(t_rbac)

    # =========================================================================
    # 8. BITÁCORA DE DECISIONES TÉCNICAS DEL SPRINT 3 (Tabla 8)
    # =========================================================================
    add_heading_apa(doc, "8. Bitácora de Decisiones Técnicas del Sprint 3", 1)
    add_body_p(
        doc,
        "Durante el desarrollo del Sprint 3, el equipo afrontó disyuntivas arquitectónicas y de diseño "
        "que fueron resueltas mediante consenso técnico. En la Tabla 8 se documentan las cuatro decisiones "
        "más significativas adoptadas entre el 19 y el 23 de octubre de 2026."
    )

    add_table_caption(doc, 8, "Bitácora de Decisiones Técnicas y Arquitectónicas del Sprint 3")
    dec_data = [
        ["Fecha", "Situación o Desafío Técnico", "Decisión Tomada", "Justificación Técnica y de Negocio", "Resultado Obtenido"],
        [
            "19/10/2026",
            "La tabla productos no contaba con columna de costo fijo y se requería valuar el inventario mediante Costo Promedio Ponderado.",
            "Calcular el CPP dinámicamente mediante subconsultas SQL agregadas sobre compras_detalle recibidas sin alterar la tabla productos.",
            "Evita redundancia, anomalías de actualización y respeta la inmutabilidad de la estructura base del sistema ya evaluada en entregas previas.",
            "Cálculo contable exacto, ponderado por volúmenes y costos reales de compra, con tiempo de respuesta inferior a 40 ms."
        ],
        [
            "20/10/2026",
            "Definir el momento exacto en el que el inventario debe descontarse: ¿al crear el pedido, al facturar o al pagar?",
            "El pedido reserva intención pero no descuenta; la venta emite comprobante; la salida física en kardex se ejecuta al liquidar saldo_pendiente = 0.",
            "En ventas a crédito o con pagos diferidos, la mercadería permanece bajo custodia de la empresa hasta su cancelación total, evitando fugas contables.",
            "Disparo automático en trigger trg_pagos_ai que mantiene cuadrado el kardex con el dinero efectivamente ingresado a caja."
        ],
        [
            "21/10/2026",
            "Garantizar que la bitácora de auditoría no pueda ser vulnerada ni limpiada por usuarios con credenciales administrativas.",
            "Implementar disparadores SQL trg_auditoria_bu y trg_auditoria_bd que emiten SIGNAL SQLSTATE '45000' bloqueando UPDATE y DELETE.",
            "Cumplimiento del principio de no repudio y trazabilidad forense exigido en normativas de control interno y auditoría de sistemas.",
            "La tabla auditoria se tornó estrictamente inmutable; cualquier intento de borrado es repelido directamente por el motor MySQL."
        ],
        [
            "22/10/2026",
            "Los desplegables del informe de inventario usaban etiquetas HTML nativas y la impresión a PDF arrastraba el fondo crema y la textura de la aplicación.",
            "Sustituir los selectores por FilterDropdown y SearchableSelect, y aplicar un reseteo global en @media print con fondo blanco puro y densidad tabular.",
            "Los informes ejecutivos deben imprimirse sobre papel blanco impoluto sin consumir tinta innecesaria y con responsividad horizontal en landscape.",
            "Interfaz totalmente homologada con el diseño del sistema y generación de documentos PDF limpios, formales y legibles para gerencia."
        ]
    ]
    t_dec = doc.add_table(rows=len(dec_data), cols=5)
    for r_i, row in enumerate(dec_data):
        for c_i, val in enumerate(row):
            t_dec.cell(r_i, c_i).text = val
    format_apa_table(t_dec)

    # =========================================================================
    # 9. MATRIZ DE TRAZABILIDAD Y CASOS DE PRUEBA AUTOMATIZADOS (Tablas 9 y 10)
    # =========================================================================
    add_heading_apa(doc, "9. Matriz de Trazabilidad y Casos de Prueba Automatizados", 1)
    add_body_p(
        doc,
        "La verificación de la calidad del incremento se fundamentó en una estrategia de pruebas "
        "automatizadas de integración utilizando el framework Vitest y Supertest sobre la base de datos "
        "de pruebas. En la Tabla 9 se presenta la matriz de trazabilidad entre requerimientos, historias, "
        "criterios y pruebas, y en la Tabla 10 se expone el detalle de los 11 casos de prueba ejecutados "
        "en backend/tests/pedidos_ventas_pagos.test.js."
    )

    add_table_caption(doc, 9, "Matriz de Trazabilidad de Requerimientos y Casos de Prueba (Sprint 3)")
    traza_data = [
        ["Req. Funcional", "Historia de Usuario", "Criterio de Aceptación", "Caso de Prueba Asociado", "Estado de Verificación"],
        ["RF-07: Gestión de Pedidos", "HU-12", "Escalas automáticas por volumen", "CP-01", "Aprobado (100%)"],
        ["RF-07: Validación de Existencias", "HU-12", "Bloqueo por falta de stock (RN-01)", "CP-02", "Aprobado (100%)"],
        ["RF-08: Aprobación de Pedidos", "HU-13", "Aprobación directa con descuento <= 10%", "CP-03", "Aprobado (100%)"],
        ["RF-08: Descuentos Especiales", "HU-13", "Retención por descuento > 10% (RN-07)", "CP-04", "Aprobado (100%)"],
        ["RF-08: Seguridad y Autorización", "HU-13", "Rechazo 403 a Operador y visto bueno de Supervisor", "CP-05", "Aprobado (100%)"],
        ["RF-09: Facturación de Ventas", "HU-14", "Bloqueo a pedidos no aprobados o cancelados", "CP-06", "Aprobado (100%)"],
        ["RF-09: Generación de Factura", "HU-14", "Copia íntegra de líneas y transición a EN_PROCESO", "CP-07", "Aprobado (100%)"],
        ["RF-10: Control de Pagos", "HU-15", "Rechazo de sobrepago a saldo pendiente (RN-09)", "CP-08", "Aprobado (100%)"],
        ["RF-10: Liquidación y Salida", "HU-15", "Cobro total y salida automática en kardex (RN-03)", "CP-09", "Aprobado (100%)"],
        ["RF-09: Inmutabilidad de Venta", "HU-15", "Bloqueo de alteración en venta finalizada (RN-08)", "CP-10", "Aprobado (100%)"],
        ["RF-11: Auditoría y Reportes", "HU-16, HU-17", "Registro en bitácora e integridad de consultas", "CP-11", "Aprobado (100%)"]
    ]
    t_traza = doc.add_table(rows=len(traza_data), cols=5)
    for r_i, row in enumerate(traza_data):
        for c_i, val in enumerate(row):
            t_traza.cell(r_i, c_i).text = val
    format_apa_table(t_traza)

    add_table_caption(doc, 10, "Detalle de los 11 Casos de Prueba Automatizados Ejecutados (Vitest)")
    cp_data = [
        ["ID", "Historia / Regla", "Descripción y Datos de Entrada", "Resultado Esperado", "Resultado Obtenido", "Estado"],
        [
            "CP-01",
            "HU-12",
            "Crear pedido con 12 unidades de producto con escalas configuradas y consultar subtotal.",
            "Aplica automáticamente escala de docena (Q70.00 c/u) con subtotal calculado en Q840.00 y estado CREADO.",
            "HTTP 201; precio_escala=70.00, subtotal=840.00 y estado CREADO.",
            "Aprobado"
        ],
        [
            "CP-02",
            "HU-12 / RN-01",
            "Intentar crear pedido solicitando 150 unidades teniendo únicamente 50 unidades en stock.",
            "Rechazo con HTTP 409 (BUSINESS_RULE_VIOLATION) indicando 'Inventario insuficiente'.",
            "HTTP 409; mensaje capturado correctamente e inserción abortada.",
            "Aprobado"
        ],
        [
            "CP-03",
            "HU-13",
            "Crear pedido con 6 unidades y 5% de descuento extra, y enviarlo.",
            "El pedido pasa directamente a APROBADO con requiere_autorizacion = 0 y total con descuento aplicado.",
            "HTTP 200 en patch enviar; estado=APROBADO y total=456.00.",
            "Aprobado"
        ],
        [
            "CP-04",
            "HU-13 / RN-07",
            "Crear pedido con 6 unidades y 15% de descuento extra (> 10%), y enviarlo.",
            "El pedido queda retenido en PENDIENTE_APROBACION con requiere_autorizacion = 1.",
            "HTTP 200 en patch enviar; estado=PENDIENTE_APROBACION y bandera activa.",
            "Aprobado"
        ],
        [
            "CP-05",
            "HU-13",
            "Operador intenta autorizar pedido retenido; posteriormente Supervisor autoriza con motivo formal.",
            "Operador recibe HTTP 403 Forbidden; Supervisor recibe HTTP 200 pasando el pedido a APROBADO.",
            "Operador bloqueado (403); Supervisor autoriza y registra supervisor_nombre.",
            "Aprobado"
        ],
        [
            "CP-06",
            "HU-14",
            "Intentar facturar un pedido en PENDIENTE_APROBACION y luego un pedido en CANCELADO.",
            "Ambos intentos son rechazados con HTTP 409 indicando que solo pedidos APROBADOS pueden facturarse.",
            "HTTP 409 recibido en ambos escenarios bloqueando facturación no autorizada.",
            "Aprobado"
        ],
        [
            "CP-07",
            "HU-14",
            "Facturar pedido aprobado en CP-03 (pedidoDescNormalId).",
            "Crea venta PENDIENTE con número FACT-XXXX, copia líneas, y transiciona pedido a EN_PROCESO.",
            "HTTP 201; venta creada con saldo=456.00 y pedido en estado EN_PROCESO.",
            "Aprobado"
        ],
        [
            "CP-08",
            "HU-15 / RN-09",
            "Intentar registrar un pago de Q500.00 sobre la factura cuyo saldo pendiente es Q456.00.",
            "Rechazo con HTTP 409 indicando 'El pago no puede ser mayor al saldo pendiente'.",
            "HTTP 409 recibido; saldo pendiente y estado se mantienen intactos.",
            "Aprobado"
        ],
        [
            "CP-09",
            "HU-15 / RN-03",
            "Registrar abono parcial de Q200.00 (verificar stock intacto) y luego pago final de Q256.00.",
            "Abono mantiene venta PENDIENTE y stock en 50; pago final pasa venta a COMPLETADA, pedido a COMPLETADO y descuenta 6 unidades (stock=44) con movimiento SALIDA.",
            "Transiciones verificadas al 100%: stock=44 y registro SALIDA en kardex.",
            "Aprobado"
        ],
        [
            "CP-10",
            "HU-15 / RN-08",
            "Intentar anular (PATCH /api/ventas/:id/anular) la venta completada en el paso anterior.",
            "Rechazo con HTTP 409 indicando que una venta finalizada es inmutable.",
            "HTTP 409 recibido; venta protegida contra alteraciones.",
            "Aprobado"
        ],
        [
            "CP-11",
            "HU-16, HU-17",
            "Consultar endpoints de auditoría (/api/auditoria) y reportes de ventas e inventario con token de Administrador.",
            "Retorna HTTP 200 con registros de auditoría de pedidos, ventas y pagos, y métricas de ventas agregadas.",
            "HTTP 200 con metadatos completos y trazabilidad verificada.",
            "Aprobado"
        ]
    ]
    t_cp = doc.add_table(rows=len(cp_data), cols=6)
    for r_i, row in enumerate(cp_data):
        for c_i, val in enumerate(row):
            t_cp.cell(r_i, c_i).text = val
    format_apa_table(t_cp)

    # =========================================================================
    # 10. EVIDENCIA DE CEREMONIA DAILY SCRUM POR DÍA (Tablas 11, 12, 13 y 14 + Fig 6)
    # =========================================================================
    add_heading_apa(doc, "10. Evidencia de Ceremonia Daily Scrum por Día", 1)
    add_body_p(
        doc,
        "Siguiendo el marco de trabajo Scrum, tras la reunión de Sprint Planning celebrada el lunes "
        "19 de octubre de 2026, el equipo llevó a cabo sesiones diarias de sincronización (Daily Scrum) "
        "del martes 20 al viernes 23 de octubre de 2026. En cada ceremonia, los integrantes respondieron "
        "a las tres preguntas reglamentarias para detectar desvíos e impedimentos a tiempo. "
        "A continuación se documentan las cuatro sesiones individuales en las Tablas 11, 12, 13 y 14."
    )

    # Tabla 11: Martes 20/10/2026
    add_table_caption(doc, 11, "Ceremonia Daily Scrum – Sesión 1: Martes 20 de octubre de 2026")
    ds1_data = [
        ["Integrante", "¿Qué hice ayer (Lunes 19/10)?", "¿Qué voy a hacer hoy (Martes 20/10)?", "¿Tengo algún impedimento o bloqueo?"],
        [
            "Noé (Base de Datos)",
            "Participé en el Sprint Planning y diseñé el esquema preliminar de tablas para pedidos, ventas, pagos y auditoría.",
            "Crear las tablas pedidos, pedidos_detalle, ventas, ventas_detalle, pagos y auditoria en MySQL con claves foráneas e índices.",
            "Ninguno. Esquema validado con el equipo."
        ],
        [
            "Raúl (Backend)",
            "Participé en la definición del Sprint Goal y establecí las rutas y schemas Zod para pedidos y escalas de precios.",
            "Desarrollar el servicio PedidosService.crear con selección automática de escalas de precios (1 a 10000 unidades).",
            "Ninguno. Los contratos de entrada y salida quedaron claros."
        ],
        [
            "Kevin (Frontend)",
            "Participé en el Sprint Planning y diseñé el flujo visual para la captura de pedidos y cotizaciones en React.",
            "Construir la estructura inicial de PedidosPage.jsx con selectores de clientes y tabla interactiva de productos.",
            "Esperando la confirmación de la estructura JSON del detalle de pedido devuelta por la API."
        ]
    ]
    t_ds1 = doc.add_table(rows=len(ds1_data), cols=4)
    for r_i, row in enumerate(ds1_data):
        for c_i, val in enumerate(row):
            t_ds1.cell(r_i, c_i).text = val
    format_apa_table(t_ds1)

    # Tabla 12: Miércoles 21/10/2026
    add_table_caption(doc, 12, "Ceremonia Daily Scrum – Sesión 2: Miércoles 21 de octubre de 2026")
    ds2_data = [
        ["Integrante", "¿Qué hice ayer (Martes 20/10)?", "¿Qué voy a hacer hoy (Miércoles 21/10)?", "¿Tengo algún impedimento o bloqueo?"],
        [
            "Noé (Base de Datos)",
            "Tablas creadas en la base de datos; agregué la tabla configuraciones para el umbral de descuento del 10%.",
            "Programar triggers de validación: trg_pedidos_bi para stock disponible (RN01) y trg_auditoria_bu/bd para inmutabilidad (RN14).",
            "Requería confirmar si la anulación de pedidos debía disparar movimiento en kardex; se acordó que no, solo ventas pagadas."
        ],
        [
            "Raúl (Backend)",
            "Servicio de creación de pedidos funcionando con escalas automáticas; implementé la validación de inventario.",
            "Implementar la lógica de envío de pedidos: retención en PENDIENTE_APROBACION si descuento > 10% y endpoint de autorización.",
            "Ninguno. El manejo de roles Supervisor/Operador se integró con el middleware requirePermission."
        ],
        [
            "Kevin (Frontend)",
            "PedidosPage.jsx conectada para crear pedidos en estado CREADO y visualizar subtotales calculados.",
            "Desarrollar el modal de Autorización de Descuentos para supervisores y la bandeja de pedidos pendientes de aprobación.",
            "Ninguno. Las pruebas locales de envío y retención respondieron según lo previsto."
        ]
    ]
    t_ds2 = doc.add_table(rows=len(ds2_data), cols=4)
    for r_i, row in enumerate(ds2_data):
        for c_i, val in enumerate(row):
            t_ds2.cell(r_i, c_i).text = val
    format_apa_table(t_ds2)

    # Tabla 13: Jueves 22/10/2026
    add_table_caption(doc, 13, "Ceremonia Daily Scrum – Sesión 3: Jueves 22 de octubre de 2026")
    ds3_data = [
        ["Integrante", "¿Qué hice ayer (Miércoles 21/10)?", "¿Qué voy a hacer hoy (Jueves 22/10)?", "¿Tengo algún impedimento o bloqueo?"],
        [
            "Noé (Base de Datos)",
            "Triggers de pedidos y auditoría inmutable funcionando; programé trg_pagos_ai para salida de stock.",
            "Diseñar las consultas analíticas de Costo Promedio Ponderado sobre compras recibidas y ajustar la vista v_kardex.",
            "Detecté que si un producto no tenía compras recibidas podía devolver null; agregué fallback a última compra o 0.00."
        ],
        [
            "Raúl (Backend)",
            "Endpoints de facturación (/api/ventas) y cobro multi-pago (/api/pagos) terminados con validación RN09.",
            "Construir los servicios de Auditoría y Reportes (Kardex y Valoración por CPP) y comenzar la suite de 11 pruebas.",
            "Ninguno. Las consultas analíticas de Noé se integraron fluidamente en ReportesService."
        ],
        [
            "Kevin (Frontend)",
            "Construí VentasPage.jsx con visualización de facturas, saldo pendiente y modal de cobro con múltiples formas de pago.",
            "Construir AuditoriaPage.jsx con filtros y visor JSON, y comenzar la pantalla de Informes de Inventario ReportesPage.jsx.",
            "Los desplegables iniciales eran selects nativos; debo reemplazarlos con FilterDropdown y SearchableSelect."
        ]
    ]
    t_ds3 = doc.add_table(rows=len(ds3_data), cols=4)
    for r_i, row in enumerate(ds3_data):
        for c_i, val in enumerate(row):
            t_ds3.cell(r_i, c_i).text = val
    format_apa_table(t_ds3)

    # Tabla 14: Viernes 23/10/2026
    add_table_caption(doc, 14, "Ceremonia Daily Scrum – Sesión 4: Viernes 23 de octubre de 2026")
    ds4_data = [
        ["Integrante", "¿Qué hice ayer (Jueves 22/10)?", "¿Qué voy a hacer hoy (Viernes 23/10)?", "¿Tengo algún impedimento o bloqueo?"],
        [
            "Noé (Base de Datos)",
            "Consultas de Valoración Total y Kardex verificadas en MySQL; base de datos de test sincronizada con jugueteria_test.",
            "Acompañar la ejecución de la suite de pruebas automatizadas y validar integridad referencial en escenarios límite.",
            "Ninguno. Todas las restricciones de motor operan con estabilidad."
        ],
        [
            "Raúl (Backend)",
            "Servicios de Auditoría y Reportes terminados; escribí los 11 casos de prueba en pedidos_ventas_pagos.test.js.",
            "Ejecutar y certificar la aprobación del 100% de las pruebas en Vitest y apoyar en la revisión de endpoints con frontend.",
            "Ninguno. Los 11 casos de prueba pasaron exitosamente en verde."
        ],
        [
            "Kevin (Frontend)",
            "Sustituí los desplegables por FilterDropdown y SearchableSelect; estilicé el @media print eliminando fondos y patrones.",
            "Verificar npm run build en producción, probar exportación CSV en Excel y tomar las capturas de demostración para el informe.",
            "Ninguno. La compilación de Vite finalizó limpia y la impresión en PDF sale en fondo blanco puro."
        ]
    ]
    t_ds4 = doc.add_table(rows=len(ds4_data), cols=4)
    for r_i, row in enumerate(ds4_data):
        for c_i, val in enumerate(row):
            t_ds4.cell(r_i, c_i).text = val
    format_apa_table(t_ds4)

    add_placeholder_box(
        doc,
        6,
        "Evidencia de Sesión Daily Scrum del Equipo",
        "Insertar captura de pantalla de la reunión de sincronización diaria del equipo (videollamada en Google Meet, Teams o registro en Discord/Slack) sostenida durante el Sprint 3."
    )

    # =========================================================================
    # 11. REVISIÓN DEL SPRINT Y EVIDENCIA FUNCIONAL (Figuras 7 a 15)
    # =========================================================================
    add_heading_apa(doc, "11. Revisión del Sprint (Sprint Review) y Evidencia Funcional", 1)
    add_body_p(
        doc,
        "El viernes 23 de octubre de 2026 se llevó a cabo la ceremonia de Revisión del Sprint "
        "(Sprint Review), donde el equipo presentó el incremento funcional final ante los criterios "
        "de la Definición de Terminado (DoD): código integrado en la rama principal, cero errores de linting, "
        "compilación exitosa en React (Vite) y el 100% de las pruebas automatizadas aprobadas (66 pruebas "
        "en 7 suites). Todas las historias de usuario comprometidas (HU-12 a HU-17) fueron validadas y aceptadas. "
        "A continuación se disponen los espacios para las evidencias visuales de cada funcionalidad sustantiva."
    )

    add_placeholder_box(
        doc,
        7,
        "Creación de Pedido con Escala de Mayoreo Automática (HU-12, HU-14)",
        "Insertar captura de PedidosPage mostrando la selección de cliente, la adición de artículos por volumen y la aplicación automática del precio mayorista por escala."
    )

    add_placeholder_box(
        doc,
        8,
        "Bloqueo de Pedido por Falta de Stock Disponible - RN01 (HU-12)",
        "Insertar captura del mensaje de error reactivo o notificación Toast en PedidosPage bloqueando el intento de pedir más unidades de las existentes en bodega."
    )

    add_placeholder_box(
        doc,
        9,
        "Pedido Retenido en PENDIENTE_APROBACION por Descuento > 10% - RN07 (HU-13)",
        "Insertar captura del listado de pedidos mostrando un pedido con descuento del 15% retenido con insignia amarilla de 'Pendiente de Aprobación'."
    )

    add_placeholder_box(
        doc,
        10,
        "Autorización de Descuento Especial por Rol Supervisor (HU-13)",
        "Insertar captura del modal de autorización en sesión de usuario Supervisor ingresando el motivo formal de aprobación y confirmando el paso a estado APROBADO."
    )

    add_placeholder_box(
        doc,
        11,
        "Facturación y Registro de Pago con Saldo en Cero (HU-14, HU-15)",
        "Insertar captura de VentasPage mostrando la factura emitida FACT-XXXX, el registro del cobro en el modal y la actualización de saldo pendiente a Q0.00."
    )

    add_placeholder_box(
        doc,
        12,
        "Salida Física Automática Reflejada en Kardex de Inventario - RN03 (HU-15)",
        "Insertar captura del Kardex de Inventario mostrando el renglón de movimiento tipo SALIDA con referencia a la factura liquidada y la disminución de existencia."
    )

    add_placeholder_box(
        doc,
        13,
        "Trazabilidad en Bitácora de Auditoría con Comparativa JSON - RN14 (HU-16)",
        "Insertar captura de AuditoriaPage mostrando el registro de la venta/pago y el visualizador estructurado comparando el estado anterior y el estado nuevo."
    )

    add_placeholder_box(
        doc,
        14,
        "Informe 1: Kardex Físico y Trazabilidad con Tarjetas KPI (HU-17)",
        "Insertar captura de la pestaña Kardex Físico en ReportesPage mostrando las 4 tarjetas de indicadores (Entradas, Salidas, Variación, Movimientos) y la tabla filtrable."
    )

    add_placeholder_box(
        doc,
        15,
        "Informe 2: Valoración Total de Inventario por Costo Promedio (CPP) (HU-17)",
        "Insertar captura de la pestaña Valoración Total mostrando el Costo Promedio Ponderado, Valor Comercial Menudeo, Margen Potencial, botón de exportación CSV e impresión PDF."
    )

    # =========================================================================
    # 12. RETROSPECTIVA DEL SPRINT (Tabla 15)
    # =========================================================================
    add_heading_apa(doc, "12. Retrospectiva del Sprint (Sprint Retrospective)", 1)
    add_body_p(
        doc,
        "Al concluir formalmente la entrega, el equipo integrado por Raúl, Noé y Kevin ejecutó "
        "la sesión de Retrospectiva del Sprint 3 para evaluar la dinámica de trabajo, la madurez técnica "
        "y los aprendizajes adquiridos. Las conclusiones y compromisos de mejora hacia el Sprint 4 final "
        "se resumen en la Tabla 15."
    )

    add_table_caption(doc, 15, "Matriz de Retrospectiva del Equipo al Cierre del Sprint 3")
    ret_data = [
        ["Dimensión de Análisis", "Hallazgos y Observaciones del Equipo", "Acciones de Mejora para el Sprint 4 Final"],
        [
            "¿Qué salió bien?",
            "1. La sincronización de estados del pedido (CREADO -> PENDIENTE_APROBACION -> APROBADO -> EN_PROCESO -> COMPLETADO) se integró limpiamente con el ciclo de vida de ventas y pagos.\n"
            "2. La formulación matemática de Costo Promedio Ponderado directamente en consultas SQL evitó alterar la estructura de la base de datos y mantuvo los reportes en tiempo real.\n"
            "3. La adopción de componentes propios (FilterDropdown, SearchableSelect) y la estilización estricta de @media print elevaron notablemente la calidad estética y funcional de los informes.",
            "Replicar el estándar de componentes propios y diseño de alta densidad en el Dashboard general ejecutivo del Sprint 4."
        ],
        [
            "¿Qué salió mal o presentó dificultades?",
            "1. Inicialmente los desplegables de filtros en reportes se construyeron con etiquetas select nativas, rompiendo la armonía visual del sistema.\n"
            "2. La impresión inicial arrastraba el fondo crema y la textura decorativa de la aplicación web, lo que requirió una reescritura minuciosa de las reglas globales de medios de impresión.\n"
            "3. La lógica de salida de inventario generó debate sobre si debía ocurrir al facturar o al liquidar el pago; se resolvió a favor de la liquidación total para resguardar la mercadería.",
            "Definir las especificaciones de impresión y exportación documental desde el inicio del diseño de interfaces para evitar re-trabajos en estilos de medios."
        ],
        [
            "¿Qué debemos mejorar para el Sprint 4 Final?",
            "1. Planificar con anticipación la agregación de métricas analíticas (gráficas temporales de ventas, productos estrella y rotación) para optimizar las consultas del Dashboard.\n"
            "2. Preparar los datos semilla (seeders) finales con un volumen representativo de transacciones históricas que permitan lucir las gráficas en la defensa del proyecto.",
            "Programar una sesión de diseño de consultas agregadas al iniciar el Sprint 4 y consolidar un guion integral de defensa técnica que recorra todo el sistema."
        ]
    ]
    t_ret = doc.add_table(rows=len(ret_data), cols=3)
    for r_i, row in enumerate(ret_data):
        for c_i, val in enumerate(row):
            t_ret.cell(r_i, c_i).text = val
    format_apa_table(t_ret)

    # Guardar documento
    out_dir = "docs/sprint-3"
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "Entrega_3_Sprint_3_APA7.docx")
    doc.save(out_path)
    print(f"[OK] Documento APA 7 generado exitosamente en: {os.path.abspath(out_path)}")

if __name__ == "__main__":
    build_document()
