import os
from PIL import Image, ImageDraw, ImageFont

def draw_use_case_diagram():
    width, height = 1800, 1100
    img = Image.new('RGB', (width, height), color='#FFFFFF')
    draw = ImageDraw.Draw(img)

    font_title = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 32)
    font_sub = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 20)
    font_actor = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 20)
    font_uc = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 17)
    font_desc = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 14)

    # Header
    draw.text((60, 40), "Diagrama de Casos de Uso Inicial — Sprint 1", fill='#0F2E59', font=font_title)
    draw.text((60, 85), "Sistema de Gestión y Control de Inventario · Juguetería Quetzal", fill='#64748B', font=font_sub)

    # System Boundary Box
    sys_x1, sys_y1, sys_x2, sys_y2 = 420, 150, 1420, 1040
    draw.rectangle([sys_x1, sys_y1, sys_x2, sys_y2], fill='#F8FAFC', outline='#0284C7', width=3)
    draw.rectangle([sys_x1, sys_y1, sys_x2, sys_y1 + 45], fill='#E0F2FE')
    draw.text((sys_x1 + 25, sys_y1 + 12), "Límite del Sistema: Juguetería Quetzal (Sprint 1 - Incremento Base)", fill='#0369A1', font=font_actor)

    # Actors definition: (name, role, x, y)
    actors = [
        {"name": "Administrador", "desc": "Control total / RBAC", "x": 160, "y": 280, "color": "#7C3AED"},
        {"name": "Supervisor", "desc": "Catálogo y Precios", "x": 160, "y": 620, "color": "#0284C7"},
        {"name": "Operador", "desc": "Ventas y Clientes", "x": 160, "y": 880, "color": "#059669"},
        {"name": "Docente Evaluador", "desc": "Auditoría y Pruebas", "x": 1580, "y": 550, "color": "#EA580C"}
    ]

    def draw_actor(act):
        ax, ay = act["x"], act["y"]
        c = act["color"]
        # Actor stick figure
        draw.ellipse([ax - 22, ay - 60, ax + 22, ay - 16], fill='#FFFFFF', outline=c, width=3) # head
        draw.line([ax, ay - 16, ax, ay + 25], fill=c, width=3) # body
        draw.line([ax - 30, ay - 2, ax + 30, ay - 2], fill=c, width=3) # arms
        draw.line([ax, ay + 25, ax - 25, ay + 65], fill=c, width=3) # left leg
        draw.line([ax, ay + 25, ax + 25, ay + 65], fill=c, width=3) # right leg

        bbox = font_actor.getbbox(act["name"])
        tw = bbox[2] - bbox[0]
        draw.text((ax - tw // 2, ay + 75), act["name"], fill='#0F172A', font=font_actor)
        
        d_bbox = font_desc.getbbox(act["desc"])
        dw = d_bbox[2] - d_bbox[0]
        draw.text((ax - dw // 2, ay + 98), act["desc"], fill='#64748B', font=font_desc)

    for a in actors:
        draw_actor(a)

    # Use Cases inside system boundary
    use_cases = [
        {"id": "CU01", "name": "Iniciar Sesión (Login JWT)", "x": 580, "y": 230, "w": 320, "h": 65, "actors": ["Administrador", "Supervisor", "Operador", "Docente Evaluador"]},
        {"id": "CU02", "name": "Gestionar Usuarios y Asignar Rol", "x": 1020, "y": 230, "w": 350, "h": 65, "actors": ["Administrador", "Docente Evaluador"]},
        {"id": "CU03", "name": "Matriz de Roles y Permisos", "x": 580, "y": 360, "w": 340, "h": 65, "actors": ["Administrador", "Docente Evaluador"]},
        {"id": "CU04", "name": "Validar Restricción 403 (RBAC)", "x": 1020, "y": 360, "w": 350, "h": 65, "actors": ["Docente Evaluador", "Operador"]},
        {"id": "CU05", "name": "Gestionar Clientes y Validar NIT", "x": 580, "y": 510, "w": 340, "h": 65, "actors": ["Administrador", "Operador", "Docente Evaluador"]},
        {"id": "CU06", "name": "Consultar Clientes (Solo Lectura)", "x": 1020, "y": 510, "w": 350, "h": 65, "actors": ["Supervisor"]},
        {"id": "CU07", "name": "Crear y Modificar Productos", "x": 580, "y": 660, "w": 340, "h": 65, "actors": ["Administrador", "Supervisor", "Docente Evaluador"]},
        {"id": "CU08", "name": "Calcular Escalas de Precio Auto", "x": 1020, "y": 660, "w": 350, "h": 65, "actors": ["Administrador", "Supervisor"]},
        {"id": "CU09", "name": "Consultar Catálogo y Stock Mínimo", "x": 580, "y": 810, "w": 340, "h": 65, "actors": ["Administrador", "Supervisor", "Operador", "Docente Evaluador"]},
        {"id": "CU10", "name": "Registro de Auditoría Automática", "x": 1020, "y": 810, "w": 350, "h": 65, "actors": ["Administrador", "Docente Evaluador"]}
    ]

    actor_coords = {
        "Administrador": (160 + 35, 280),
        "Supervisor": (160 + 35, 620),
        "Operador": (160 + 35, 880),
        "Docente Evaluador": (1580 - 35, 550)
    }

    # Draw use case capsules
    for uc in use_cases:
        x, y, w, h = uc["x"], uc["y"], uc["w"], uc["h"]
        # Drop shadow
        draw.rounded_rectangle([x + 3, y + 3, x + w + 3, y + h + 3], radius=32, fill='#E2E8F0')
        # Main capsule
        draw.rounded_rectangle([x, y, x + w, y + h], radius=32, fill='#FFFFFF', outline='#0284C7', width=2)
        # Text
        txt = f"{uc['id']}: {uc['name']}"
        bbox = font_uc.getbbox(txt)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]
        draw.text((x + (w - tw) // 2, y + (h - th) // 2 - 2), txt, fill='#0F172A', font=font_uc)

    # Draw lines connecting actors to use cases
    for uc in use_cases:
        x, y, w, h = uc["x"], uc["y"], uc["w"], uc["h"]
        uc_left = (x, y + h // 2)
        uc_right = (x + w, y + h // 2)

        for act_name in uc["actors"]:
            ax, ay = actor_coords[act_name]
            target = uc_left if ax < sys_x1 else uc_right
            color = '#94A3B8' if act_name != 'Docente Evaluador' else '#F97316'
            draw.line([ax, ay, target[0], target[1]], fill=color, width=2)

    os.makedirs('docs/sprint-1/evidencias', exist_ok=True)
    img.save('docs/sprint-1/evidencias/diagrama_casos_uso.png', quality=95)
    print("Use case diagram saved successfully!")

def draw_er_diagram():
    width, height = 2000, 1300
    img = Image.new('RGB', (width, height), color='#FFFFFF')
    draw = ImageDraw.Draw(img)

    font_title = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 32)
    font_sub = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 20)
    font_tbl_title = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 16)
    font_col = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 13)
    font_pk = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 12)

    # Header
    draw.text((60, 40), "Modelo Entidad-Relación Inicial — Sprint 1 (Base de Datos MySQL)", fill='#0F2E59', font=font_title)
    draw.text((60, 85), "Esquema relacional con integridad referencial, vistas de inventario y triggers de auditoría", fill='#64748B', font=font_sub)

    # Tables to draw:
    tables = [
        {
            "name": "ROLES", "x": 60, "y": 160, "w": 280,
            "cols": [
                ("PK", "id_rol", "INT UNSIGNED AUTO_INC"),
                ("", "nombre", "VARCHAR(50) NOT NULL"),
                ("", "descripcion", "VARCHAR(255)"),
                ("", "activo", "TINYINT(1) DEFAULT 1")
            ]
        },
        {
            "name": "PERMISOS", "x": 60, "y": 420, "w": 280,
            "cols": [
                ("PK", "id_permiso", "INT UNSIGNED AUTO_INC"),
                ("", "modulo", "VARCHAR(50) NOT NULL"),
                ("", "codigo", "VARCHAR(100) UNIQUE"),
                ("", "nombre", "VARCHAR(100) NOT NULL"),
                ("", "descripcion", "VARCHAR(255)")
            ]
        },
        {
            "name": "ROL_PERMISOS", "x": 60, "y": 750, "w": 280,
            "cols": [
                ("PK,FK", "id_rol", "INT UNSIGNED"),
                ("PK,FK", "id_permiso", "INT UNSIGNED"),
                ("", "fecha_asignacion", "TIMESTAMP")
            ]
        },
        {
            "name": "USUARIOS", "x": 450, "y": 160, "w": 340,
            "cols": [
                ("PK", "id_usuario", "INT UNSIGNED AUTO_INC"),
                ("FK", "id_rol", "INT UNSIGNED NOT NULL"),
                ("", "nombre_completo", "VARCHAR(150) NOT NULL"),
                ("", "email", "VARCHAR(100) UNIQUE"),
                ("", "password_hash", "VARCHAR(255) NOT NULL"),
                ("", "activo", "TINYINT(1) DEFAULT 1"),
                ("", "creado_en", "TIMESTAMP")
            ]
        },
        {
            "name": "CLIENTES", "x": 450, "y": 550, "w": 340,
            "cols": [
                ("PK", "id_cliente", "INT UNSIGNED AUTO_INC"),
                ("", "tipo_cliente", "ENUM('FINAL','MAYORISTA')"),
                ("", "nombre_razon_social", "VARCHAR(150) NOT NULL"),
                ("", "identificacion", "VARCHAR(30) UNIQUE NULL"),
                ("", "telefono", "VARCHAR(20)"),
                ("", "email", "VARCHAR(100)"),
                ("", "activo", "TINYINT(1) DEFAULT 1"),
                ("", "creado_en", "TIMESTAMP")
            ]
        },
        {
            "name": "CATEGORIAS", "x": 920, "y": 160, "w": 280,
            "cols": [
                ("PK", "id_categoria", "INT UNSIGNED AUTO_INC"),
                ("", "nombre", "VARCHAR(100) NOT NULL"),
                ("", "descripcion", "TEXT"),
                ("", "activo", "TINYINT(1) DEFAULT 1")
            ]
        },
        {
            "name": "MARCAS", "x": 920, "y": 420, "w": 280,
            "cols": [
                ("PK", "id_marca", "INT UNSIGNED AUTO_INC"),
                ("", "nombre", "VARCHAR(100) NOT NULL"),
                ("", "activo", "TINYINT(1) DEFAULT 1")
            ]
        },
        {
            "name": "PRODUCTOS", "x": 1300, "y": 160, "w": 360,
            "cols": [
                ("PK", "id_producto", "INT UNSIGNED AUTO_INC"),
                ("", "codigo_sku", "VARCHAR(50) UNIQUE NOT NULL"),
                ("", "nombre", "VARCHAR(150) NOT NULL"),
                ("FK", "id_categoria", "INT UNSIGNED"),
                ("FK", "id_marca", "INT UNSIGNED"),
                ("", "stock_minimo", "INT NOT NULL DEFAULT 5"),
                ("", "edad_minima_meses", "SMALLINT UNSIGNED"),
                ("", "activo", "TINYINT(1) DEFAULT 1"),
                ("", "creado_en", "TIMESTAMP")
            ]
        },
        {
            "name": "ESCALAS_PRECIO", "x": 1300, "y": 560, "w": 360,
            "cols": [
                ("PK", "id_escala", "INT UNSIGNED AUTO_INC"),
                ("FK", "id_producto", "INT UNSIGNED NOT NULL"),
                ("", "cantidad_minima", "INT NOT NULL (1..10000)"),
                ("", "precio_unitario", "DECIMAL(12,2) NOT NULL"),
                ("", "activo", "TINYINT(1) DEFAULT 1"),
                ("", "creado_en", "TIMESTAMP")
            ]
        },
        {
            "name": "INVENTARIO (Resumen)", "x": 1300, "y": 880, "w": 360,
            "cols": [
                ("PK", "id_inventario", "INT UNSIGNED AUTO_INC"),
                ("FK", "id_producto", "INT UNSIGNED NOT NULL"),
                ("", "stock_actual", "INT NOT NULL DEFAULT 0"),
                ("", "stock_comprometido", "INT NOT NULL DEFAULT 0"),
                ("", "stock_disponible", "INT GENERATED STORED"),
                ("", "actualizado_en", "TIMESTAMP")
            ]
        },
        {
            "name": "AUDITORIA (Global)", "x": 450, "y": 920, "w": 340,
            "cols": [
                ("PK", "id_auditoria", "BIGINT UNSIGNED AUTO_INC"),
                ("", "tabla", "VARCHAR(50) NOT NULL"),
                ("", "operacion", "ENUM('INSERT','UPDATE',...)"),
                ("FK", "id_usuario", "INT UNSIGNED NULL"),
                ("", "registro_id", "VARCHAR(50) NOT NULL"),
                ("", "valores_previos", "JSON NULL"),
                ("", "valores_nuevos", "JSON NULL"),
                ("", "fecha_hora", "TIMESTAMP NOT NULL")
            ]
        }
    ]

    tbl_coords = {}

    for t in tables:
        x, y, w = t["x"], t["y"], t["w"]
        header_h = 36
        row_h = 24
        total_h = header_h + len(t["cols"]) * row_h + 10
        tbl_coords[t["name"]] = {"x": x, "y": y, "w": w, "h": total_h, "cx": x + w // 2, "cy": y + total_h // 2}

        # Shadow
        draw.rounded_rectangle([x + 3, y + 3, x + w + 3, y + total_h + 3], radius=10, fill='#E2E8F0')
        # Body
        draw.rounded_rectangle([x, y, x + w, y + total_h], radius=10, fill='#FFFFFF', outline='#0F2E59', width=2)
        # Header bar
        draw.rounded_rectangle([x, y, x + w, y + header_h], radius=10, fill='#0F2E59')
        draw.rectangle([x, y + 20, x + w, y + header_h], fill='#0F2E59')
        draw.text((x + 14, y + 8), t["name"], fill='#FFFFFF', font=font_tbl_title)

        curr_y = y + header_h + 6
        for pk_badge, col_name, col_type in t["cols"]:
            # Badge
            if "PK" in pk_badge:
                draw.rounded_rectangle([x + 8, curr_y, x + 34, curr_y + 18], radius=4, fill='#FEE2E2', outline='#DC2626')
                draw.text((x + 11, curr_y + 1), "PK", fill='#DC2626', font=font_pk)
            elif "FK" in pk_badge:
                draw.rounded_rectangle([x + 8, curr_y, x + 34, curr_y + 18], radius=4, fill='#DBEAFE', outline='#2563EB')
                draw.text((x + 11, curr_y + 1), "FK", fill='#2563EB', font=font_pk)
            
            # Name
            draw.text((x + 40, curr_y), col_name, fill='#0F172A', font=font_col)
            # Type
            type_bbox = font_col.getbbox(col_type)
            tw = type_bbox[2] - type_bbox[0]
            draw.text((x + w - tw - 12, curr_y), col_type, fill='#64748B', font=font_col)
            curr_y += row_h

    # Relations to connect with lines
    relations = [
        ("ROLES", "USUARIOS", "1 : N"),
        ("ROLES", "ROL_PERMISOS", "1 : N"),
        ("PERMISOS", "ROL_PERMISOS", "1 : N"),
        ("CATEGORIAS", "PRODUCTOS", "1 : N"),
        ("MARCAS", "PRODUCTOS", "1 : N"),
        ("PRODUCTOS", "ESCALAS_PRECIO", "1 : N"),
        ("PRODUCTOS", "INVENTARIO (Resumen)", "1 : 1"),
        ("USUARIOS", "AUDITORIA (Global)", "1 : N")
    ]

    for src, dst, label in relations:
        s = tbl_coords[src]
        d = tbl_coords[dst]
        # Line from source right or bottom to dest left or top
        if s["x"] < d["x"]:
            p1 = (s["x"] + s["w"], s["y"] + 60)
            p2 = (d["x"], d["y"] + 60)
        else:
            p1 = (s["x"] + s["w"] // 2, s["y"] + s["h"])
            p2 = (d["x"] + d["w"] // 2, d["y"])
        
        draw.line([p1[0], p1[1], p2[0], p2[1]], fill='#2563EB', width=2)
        mid_x = (p1[0] + p2[0]) // 2
        mid_y = (p1[1] + p2[1]) // 2
        draw.rounded_rectangle([mid_x - 25, mid_y - 12, mid_x + 25, mid_y + 12], radius=4, fill='#EFF6FF', outline='#3B82F6')
        draw.text((mid_x - 18, mid_y - 8), label, fill='#1D4ED8', font=font_pk)

    os.makedirs('docs/sprint-1/evidencias', exist_ok=True)
    img.save('docs/sprint-1/evidencias/modelo_entidad_relacion.png', quality=95)
    print("ER diagram saved successfully!")

if __name__ == '__main__':
    draw_use_case_diagram()
    draw_er_diagram()
