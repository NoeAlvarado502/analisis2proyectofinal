import { pool } from '../../db/pool.js';
import { withUser } from '../../db/withUser.js';

export class ProductosService {
  /**
   * Lista productos desde la vista v_catalogo con búsqueda y paginación
   */
  static async listar({ q, id_categoria, activo, page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;
    const params = [];
    const whereConditions = [];

    if (q && q.trim() !== '') {
      whereConditions.push('(v.nombre LIKE ? OR v.codigo_sku LIKE ? OR v.categoria LIKE ?)');
      const term = `%${q.trim()}%`;
      params.push(term, term, term);
    }

    if (id_categoria) {
      whereConditions.push('p.id_categoria = ?');
      params.push(Number(id_categoria));
    }

    if (activo !== undefined && activo !== null && activo !== '') {
      whereConditions.push('v.activo = ?');
      params.push(activo === 'true' || activo === true || activo === 1 || activo === '1' ? 1 : 0);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM v_catalogo v
       JOIN productos p ON p.id_producto = v.id_producto
       ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await pool.execute(
      `SELECT v.id_producto, v.codigo_sku, v.nombre, v.categoria, v.marca,
              v.edad_minima_meses, v.precio_menudeo, v.stock_actual, v.stock_minimo, v.activo,
              p.id_categoria, p.id_marca, p.descripcion, p.advertencia_seguridad,
              (v.stock_actual <= v.stock_minimo) AS es_stock_bajo
       FROM v_catalogo v
       JOIN productos p ON p.id_producto = v.id_producto
       ${whereClause}
       ORDER BY v.id_producto DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    if (rows.length > 0) {
      const ids = rows.map((r) => r.id_producto);
      const placeholders = ids.map(() => '?').join(',');
      const [escalasRows] = await pool.execute(
        `SELECT id_producto, id_escala, cantidad_minima, precio_unitario, activo
         FROM escalas_precio
         WHERE id_producto IN (${placeholders}) AND activo = 1
         ORDER BY cantidad_minima ASC`,
        ids
      );
      const mapEscalas = new Map();
      for (const e of escalasRows) {
        if (!mapEscalas.has(e.id_producto)) mapEscalas.set(e.id_producto, []);
        mapEscalas.get(e.id_producto).push(e);
      }
      for (const r of rows) {
        r.escalas = mapEscalas.get(r.id_producto) || [];
      }
    }
    return {
      data: rows,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Obtiene el detalle de un producto con sus escalas de precio activas
   */
  static async obtenerPorId(id) {
    const [rows] = await pool.execute(
      `SELECT p.id_producto, p.codigo_sku, p.nombre, p.descripcion,
              p.id_categoria, c.nombre AS categoria,
              p.id_marca, m.nombre AS marca,
              p.edad_minima_meses, p.advertencia_seguridad,
              p.stock_minimo, p.activo, p.created_at, p.updated_at,
              COALESCE(i.stock_actual, 0) AS stock_actual,
              (COALESCE(i.stock_actual, 0) <= p.stock_minimo) AS es_stock_bajo
       FROM productos p
       JOIN categorias c ON c.id_categoria = p.id_categoria
       LEFT JOIN marcas m ON m.id_marca = p.id_marca
       LEFT JOIN inventario i ON i.id_producto = p.id_producto
       WHERE p.id_producto = ?`,
      [id]
    );

    if (rows.length === 0) {
      const err = new Error('Producto no encontrado');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const producto = rows[0];

    // Obtener escalas de precio activas ordenadas por nivel
    const [escalas] = await pool.execute(
      `SELECT id_escala, cantidad_minima, precio_unitario, activo
       FROM escalas_precio
       WHERE id_producto = ? AND activo = 1
       ORDER BY cantidad_minima ASC`,
      [id]
    );

    producto.escalas = escalas;
    producto.precio_menudeo = escalas.find(e => e.cantidad_minima === 1)?.precio_unitario || 0;

    return producto;
  }

  /**
   * Crea un producto junto con sus escalas de precios en una sola transacción auditada
   */
  static async crear(
    { codigo_sku, nombre, descripcion, id_categoria, id_marca, edad_minima_meses, advertencia_seguridad, stock_minimo, escalas },
    currentUserId,
    ip = null
  ) {
    let finalSku = codigo_sku ? String(codigo_sku).trim().toUpperCase() : '';
    if (!finalSku) {
      finalSku = await this.sugerirSku(id_categoria, id_marca);
    }

    const insertId = await withUser(currentUserId, async (conn) => {
      // 1. Insertar producto (trg_productos_ai crea inventario = 0 y audita)
      const [res] = await conn.execute(
        `INSERT INTO productos
         (codigo_sku, nombre, descripcion, id_categoria, id_marca, edad_minima_meses, advertencia_seguridad, stock_minimo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          finalSku,
          nombre,
          descripcion,
          id_categoria,
          id_marca,
          edad_minima_meses,
          advertencia_seguridad,
          stock_minimo
        ]
      );
      const newId = res.insertId;

      // 2. Insertar escalas de precio ordenadas por cantidad_minima
      const ordenadas = [...escalas].sort((a, b) => a.cantidad_minima - b.cantidad_minima);
      for (const esc of ordenadas) {
        await conn.execute(
          `INSERT INTO escalas_precio (id_producto, cantidad_minima, precio_unitario, activo)
           VALUES (?, ?, ?, 1)`,
          [newId, esc.cantidad_minima, esc.precio_unitario]
        );
      }

      return newId;
    }, ip);

    return await this.obtenerPorId(insertId);
  }

  /**
   * Modifica producto y sincroniza sus escalas aplicando el patrón de la sección 1.4 punto 8
   */
  static async actualizar(
    id,
    { nombre, descripcion, id_categoria, id_marca, edad_minima_meses, advertencia_seguridad, stock_minimo, escalas },
    currentUserId,
    ip = null
  ) {
    await this.obtenerPorId(id);

    await withUser(currentUserId, async (conn) => {
      // 1. Actualizar datos base del producto (SKU inmutable por decisión de bitácora)
      await conn.execute(
        `UPDATE productos
         SET nombre = ?, descripcion = ?, id_categoria = ?, id_marca = ?,
             edad_minima_meses = ?, advertencia_seguridad = ?, stock_minimo = ?
         WHERE id_producto = ?`,
        [
          nombre,
          descripcion,
          id_categoria,
          id_marca,
          edad_minima_meses,
          advertencia_seguridad,
          stock_minimo,
          id
        ]
      );

      // 2. Patrón de actualización de escalas de la sección 1.4, punto 8:
      // (a) Desactivar todas las escalas existentes
      await conn.execute(
        `UPDATE escalas_precio SET activo = 0 WHERE id_producto = ?`,
        [id]
      );

      // (b) Insertar o reactivar cada nivel recibido (ordenados ascendentemente para respetar el trigger)
      const ordenadas = [...escalas].sort((a, b) => a.cantidad_minima - b.cantidad_minima);
      for (const esc of ordenadas) {
        await conn.execute(
          `INSERT INTO escalas_precio (id_producto, cantidad_minima, precio_unitario, activo)
           VALUES (?, ?, ?, 1)
           ON DUPLICATE KEY UPDATE precio_unitario = VALUES(precio_unitario), activo = 1`,
          [id, esc.cantidad_minima, esc.precio_unitario]
        );
      }
    }, ip);

    return await this.obtenerPorId(id);
  }

  /**
   * Inactiva o reactiva un producto (RN04: baja lógica)
   */
  static async cambiarEstado(id, activo, currentUserId, ip = null) {
    await this.obtenerPorId(id);

    await withUser(currentUserId, async (conn) => {
      await conn.execute(
        `UPDATE productos SET activo = ? WHERE id_producto = ?`,
        [activo ? 1 : 0, id]
      );
    }, ip);

    return await this.obtenerPorId(id);
  }

  // ==========================================
  // CATEGORÍAS Y MARCAS
  // ==========================================
  static async listarCategorias() {
    const [rows] = await pool.execute(
      `SELECT id_categoria, nombre, descripcion, activo
       FROM categorias
       ORDER BY nombre ASC`
    );
    return rows;
  }

  static async crearCategoria({ nombre, descripcion }) {
    const [res] = await pool.execute(
      `INSERT INTO categorias (nombre, descripcion) VALUES (?, ?)`,
      [nombre, descripcion]
    );
    const [created] = await pool.execute(
      `SELECT id_categoria, nombre, descripcion, activo FROM categorias WHERE id_categoria = ?`,
      [res.insertId]
    );
    return created[0];
  }

  static async listarMarcas() {
    const [rows] = await pool.execute(
      `SELECT id_marca, nombre, activo
       FROM marcas
       ORDER BY nombre ASC`
    );
    return rows;
  }

  static async crearMarca({ nombre }) {
    const [res] = await pool.execute(
      `INSERT INTO marcas (nombre) VALUES (?)`,
      [nombre]
    );
    const [created] = await pool.execute(
      `SELECT id_marca, nombre, activo FROM marcas WHERE id_marca = ?`,
      [res.insertId]
    );
    return created[0];
  }

  /**
   * Genera código de 3 letras normalizado para la categoría
   */
  static generarCodigoCategoria(nombre) {
    if (!nombre) return 'JUG';
    const clean = nombre
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
    return (clean.slice(0, 3) || 'JUG').padEnd(3, 'X');
  }

  /**
   * Genera código de 2 a 4 caracteres para la marca (o GEN para genérica)
   */
  static generarCodigoMarca(nombre) {
    if (!nombre || nombre.toLowerCase().includes('gen')) return 'GEN';
    const cleanText = nombre
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
    const words = cleanText.split(/\s+/).filter(Boolean);
    if (words.length > 1) {
      const initials = words.map(w => w[0].toUpperCase()).join('').replace(/[^A-Z0-9]/g, '');
      if (initials.length >= 2 && initials.length <= 4) return initials;
    }
    const clean = cleanText.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return (clean.slice(0, 3) || 'MAR').padEnd(3, 'X');
  }

  /**
   * Sugiere el siguiente código SKU correlativo según categoría y marca
   */
  static async sugerirSku(id_categoria, id_marca = null) {
    let catNombre = 'Juguetes';
    if (id_categoria) {
      const [cats] = await pool.execute(
        'SELECT nombre FROM categorias WHERE id_categoria = ?',
        [id_categoria]
      );
      if (cats.length > 0) catNombre = cats[0].nombre;
    }

    let marcaNombre = 'Genérica';
    if (id_marca) {
      const [marcas] = await pool.execute(
        'SELECT nombre FROM marcas WHERE id_marca = ?',
        [id_marca]
      );
      if (marcas.length > 0) marcaNombre = marcas[0].nombre;
    }

    const catCode = this.generarCodigoCategoria(catNombre);
    const marcaCode = this.generarCodigoMarca(marcaNombre);
    const prefix = `${catCode}-${marcaCode}`;

    // Obtener todos los productos para encontrar el mayor correlativo global entre todos los registros existentes
    const [rows] = await pool.execute(`SELECT id_producto, codigo_sku FROM productos`);

    let maxNum = 0;
    for (const r of rows) {
      if (r.id_producto && r.id_producto > maxNum) {
        maxNum = r.id_producto;
      }
      if (r.codigo_sku) {
        const match = String(r.codigo_sku).match(/(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }
    }

    const nextCorrelativo = String(maxNum + 1).padStart(3, '0');
    return `${prefix}-${nextCorrelativo}`;
  }
}
