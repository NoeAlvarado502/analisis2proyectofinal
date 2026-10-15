import { pool } from '../../db/pool.js';
import { withUser } from '../../db/withUser.js';

export class InventarioService {
  /**
   * Lista existencias de productos desde v_catalogo con faltante y alerta calculada
   */
  static async listarExistencias({ q, id_categoria, id_marca, bajo_stock, activo, page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;
    const params = [];
    const whereConditions = [];

    if (q && q.trim() !== '') {
      whereConditions.push('(p.codigo_sku LIKE ? OR p.nombre LIKE ? OR c.nombre LIKE ? OR m.nombre LIKE ?)');
      const term = `%${q.trim()}%`;
      params.push(term, term, term, term);
    }

    if (id_categoria) {
      whereConditions.push('p.id_categoria = ?');
      params.push(parseInt(id_categoria, 10));
    }

    if (id_marca) {
      whereConditions.push('p.id_marca = ?');
      params.push(parseInt(id_marca, 10));
    }

    if (activo !== undefined && activo !== null && activo !== '') {
      whereConditions.push('p.activo = ?');
      params.push(activo === 'true' || activo === true || activo === 1 || activo === '1' ? 1 : 0);
    }

    if (bajo_stock !== undefined && bajo_stock !== null && bajo_stock !== '') {
      if (bajo_stock === 'agotado') {
        whereConditions.push('i.stock_actual = 0');
      } else if (bajo_stock === 'true' || bajo_stock === true || bajo_stock === 1 || bajo_stock === '1') {
        whereConditions.push('i.stock_actual <= p.stock_minimo');
      } else if (bajo_stock === 'false' || bajo_stock === false || bajo_stock === 0 || bajo_stock === '0') {
        whereConditions.push('i.stock_actual > p.stock_minimo');
      }
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM productos p
       JOIN categorias c ON c.id_categoria = p.id_categoria
       LEFT JOIN marcas m ON m.id_marca = p.id_marca
       JOIN inventario i ON i.id_producto = p.id_producto
       ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await pool.execute(
      `SELECT p.id_producto, p.codigo_sku, p.nombre, c.nombre AS categoria, m.nombre AS marca,
              p.edad_minima_meses, e1.precio_unitario AS precio_menudeo,
              i.stock_actual, p.stock_minimo, p.activo,
              GREATEST(0, CAST(p.stock_minimo AS SIGNED) - CAST(i.stock_actual AS SIGNED)) AS faltante,
              IF(i.stock_actual <= p.stock_minimo, 1, 0) AS en_alerta
       FROM productos p
       JOIN categorias c ON c.id_categoria = p.id_categoria
       LEFT JOIN marcas m ON m.id_marca = p.id_marca
       JOIN inventario i ON i.id_producto = p.id_producto
       LEFT JOIN escalas_precio e1 ON e1.id_producto = p.id_producto
                                  AND e1.cantidad_minima = 1 AND e1.activo = 1
       ${whereClause}
       ORDER BY p.id_producto DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

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
   * Consulta el kardex con filtros y paginación
   */
  static async listarMovimientos({ q, id_producto, tipo_movimiento, documento_tipo, fecha_desde, fecha_hasta, page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;
    const params = [];
    const whereConditions = [];

    if (q && q.trim() !== '') {
      whereConditions.push('(p.codigo_sku LIKE ? OR p.nombre LIKE ? OR m.documento_id LIKE ? OR m.motivo LIKE ?)');
      const term = `%${q.trim()}%`;
      params.push(term, term, term, term);
    }

    if (id_producto) {
      whereConditions.push('m.id_producto = ?');
      params.push(parseInt(id_producto, 10));
    }

    if (tipo_movimiento && tipo_movimiento.trim() !== '') {
      whereConditions.push('m.tipo_movimiento = ?');
      params.push(tipo_movimiento.trim());
    }

    if (documento_tipo && documento_tipo.trim() !== '') {
      whereConditions.push('m.documento_tipo = ?');
      params.push(documento_tipo.trim());
    }

    if (fecha_desde) {
      whereConditions.push('m.fecha_hora >= ?');
      params.push(fecha_desde);
    }

    if (fecha_hasta) {
      whereConditions.push('m.fecha_hora <= ?');
      params.push(fecha_hasta);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM movimientos_inventario m
       JOIN productos p ON p.id_producto = m.id_producto
       ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await pool.execute(
      `SELECT m.id_movimiento, m.fecha_hora, m.id_producto, p.codigo_sku, p.nombre AS producto,
              m.tipo_movimiento, m.cantidad, m.stock_anterior, m.stock_posterior,
              m.documento_tipo, m.documento_id, m.motivo, u.nombre_completo AS usuario
       FROM movimientos_inventario m
       JOIN productos p ON p.id_producto = m.id_producto
       JOIN usuarios u ON u.id_usuario = m.id_usuario
       ${whereClause}
       ORDER BY m.id_movimiento DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

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
   * Inserta un ajuste o devolución en movimientos_inventario usando withUser
   */
  static async registrarAjuste({ id_producto, tipo_movimiento = 'AJUSTE', cantidad, motivo, documento_tipo = 'AJUSTE_FISICO', documento_id }, currentUserId, ip = null) {
    const docId = documento_id && documento_id.trim() !== ''
      ? documento_id.trim()
      : `${tipo_movimiento.substring(0, 3)}-${Date.now()}`;

    const insertId = await withUser(currentUserId, async (conn) => {
      const [res] = await conn.execute(
        `INSERT INTO movimientos_inventario
         (id_producto, id_usuario, tipo_movimiento, cantidad, documento_tipo, documento_id, motivo)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id_producto, currentUserId, tipo_movimiento, cantidad, documento_tipo, docId, motivo]
      );
      return res.insertId;
    }, ip);

    const [rows] = await pool.execute(
      `SELECT m.id_movimiento, m.fecha_hora, m.id_producto, p.codigo_sku, p.nombre AS producto,
              m.tipo_movimiento, m.cantidad, m.stock_anterior, m.stock_posterior,
              m.documento_tipo, m.documento_id, m.motivo, u.nombre_completo AS usuario
       FROM movimientos_inventario m
       JOIN productos p ON p.id_producto = m.id_producto
       JOIN usuarios u ON u.id_usuario = m.id_usuario
       WHERE m.id_movimiento = ?`,
      [insertId]
    );

    return rows[0];
  }

  /**
   * Actualiza el stock mínimo de un producto usando withUser
   */
  static async actualizarStockMinimo(id_producto, stock_minimo, currentUserId, ip = null) {
    const [prodRows] = await pool.execute(
      'SELECT id_producto, codigo_sku, nombre FROM productos WHERE id_producto = ?',
      [id_producto]
    );

    if (prodRows.length === 0) {
      const err = new Error('Producto no encontrado');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    await withUser(currentUserId, async (conn) => {
      await conn.execute(
        'UPDATE productos SET stock_minimo = ? WHERE id_producto = ?',
        [stock_minimo, id_producto]
      );
    }, ip);

    const [updated] = await pool.execute(
      `SELECT p.id_producto, p.codigo_sku, p.nombre, p.stock_minimo,
              i.stock_actual, IF(i.stock_actual <= p.stock_minimo, 1, 0) AS es_stock_bajo
       FROM productos p
       JOIN inventario i ON i.id_producto = p.id_producto
       WHERE p.id_producto = ?`,
      [id_producto]
    );

    return updated[0];
  }

  /**
   * Consulta las alertas de inventario y los productos con stock bajo
   */
  static async obtenerAlertas() {
    const [alertas] = await pool.execute(
      `SELECT a.id_alerta, a.id_producto, p.codigo_sku, p.nombre AS producto,
              c.nombre AS categoria, a.stock_al_generar, a.stock_minimo,
              i.stock_actual, a.estado, a.fecha_generacion, a.fecha_atencion
       FROM alertas_inventario a
       JOIN productos p ON p.id_producto = a.id_producto
       JOIN categorias c ON c.id_categoria = p.id_categoria
       JOIN inventario i ON i.id_producto = p.id_producto
       ORDER BY (a.estado = 'ACTIVA') DESC, a.id_alerta DESC`
    );

    const [stockBajo] = await pool.execute('SELECT * FROM v_stock_bajo');

    return {
      alertas,
      productos_stock_bajo: stockBajo,
      total_alertas_activas: alertas.filter(a => a.estado === 'ACTIVA').length
    };
  }
}
