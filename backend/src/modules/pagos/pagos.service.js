import { pool } from '../../db/pool.js';
import { withUser } from '../../db/withUser.js';

export class PagosService {
  /**
   * Lista pagos registrados con filtros y paginación
   */
  static async listar({ q, id_venta, metodo_pago, fecha_desde, fecha_hasta, page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;
    const params = [];
    const whereConditions = [];

    if (q && q.trim() !== '') {
      whereConditions.push('(pg.numero_recibo LIKE ? OR v.numero_factura LIKE ? OR c.nombre_razon_social LIKE ? OR c.identificacion LIKE ?)');
      const term = `%${q.trim()}%`;
      params.push(term, term, term, term);
    }

    if (id_venta) {
      whereConditions.push('pg.id_venta = ?');
      params.push(parseInt(id_venta, 10));
    }

    if (metodo_pago && metodo_pago.trim() !== '') {
      whereConditions.push('pg.metodo_pago = ?');
      params.push(metodo_pago.trim());
    }

    if (fecha_desde) {
      whereConditions.push('pg.fecha_pago >= ?');
      params.push(fecha_desde);
    }

    if (fecha_hasta) {
      whereConditions.push('pg.fecha_pago <= ?');
      params.push(fecha_hasta);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM pagos pg
       JOIN ventas v ON v.id_venta = pg.id_venta
       JOIN pedidos pe ON pe.id_pedido = v.id_pedido
       JOIN clientes c ON c.id_cliente = pe.id_cliente
       ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await pool.execute(
      `SELECT pg.id_pago, pg.numero_recibo, pg.id_venta, v.numero_factura,
              pe.numero_pedido, c.nombre_razon_social AS cliente_nombre,
              pg.id_usuario, u.nombre_completo AS usuario_nombre,
              pg.monto, pg.metodo_pago, pg.referencia_pago, pg.fecha_pago
       FROM pagos pg
       JOIN ventas v ON v.id_venta = pg.id_venta
       JOIN pedidos pe ON pe.id_pedido = v.id_pedido
       JOIN clientes c ON c.id_cliente = pe.id_cliente
       JOIN usuarios u ON u.id_usuario = pg.id_usuario
       ${whereClause}
       ORDER BY pg.id_pago DESC
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
   * Sugiere el siguiente correlativo REC-XXXX
   */
  static async sugerirRecibo() {
    const [rows] = await pool.execute(
      `SELECT numero_recibo
       FROM pagos
       WHERE numero_recibo LIKE 'REC-%'
       ORDER BY id_pago DESC
       LIMIT 1`
    );

    let nextNum = 1;
    if (rows.length > 0) {
      const match = rows[0].numero_recibo.match(/^REC-(\d+)$/i);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }
    const sugerencia = `REC-${String(nextNum).padStart(4, '0')}`;
    return { sugerencia };
  }

  /**
   * Obtiene un pago por su ID
   */
  static async obtenerPorId(id) {
    const [rows] = await pool.execute(
      `SELECT pg.id_pago, pg.numero_recibo, pg.id_venta, v.numero_factura,
              pe.numero_pedido, c.nombre_razon_social AS cliente_nombre,
              pg.id_usuario, u.nombre_completo AS usuario_nombre,
              pg.monto, pg.metodo_pago, pg.referencia_pago, pg.fecha_pago
       FROM pagos pg
       JOIN ventas v ON v.id_venta = pg.id_venta
       JOIN pedidos pe ON pe.id_pedido = v.id_pedido
       JOIN clientes c ON c.id_cliente = pe.id_cliente
       JOIN usuarios u ON u.id_usuario = pg.id_usuario
       WHERE pg.id_pago = ?`,
      [id]
    );

    if (rows.length === 0) {
      const err = new Error('Pago no encontrado');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    return rows[0];
  }

  /**
   * Registra un nuevo pago sobre una venta
   */
  static async crear({ id_venta, numero_recibo, monto, metodo_pago, referencia_pago }, currentUserId, ip = null) {
    let finalRecibo = numero_recibo;
    if (!finalRecibo || typeof finalRecibo !== 'string' || finalRecibo.trim() === '') {
      const sug = await PagosService.sugerirRecibo();
      finalRecibo = sug.sugerencia;
    }

    // Validar existencia de la venta
    const [ventaRows] = await pool.execute(
      'SELECT id_venta, estado, total, saldo_pendiente FROM ventas WHERE id_venta = ?',
      [id_venta]
    );

    if (ventaRows.length === 0) {
      const err = new Error('La venta especificada no existe');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const { insertId, ventaActualizada } = await withUser(currentUserId, async (conn) => {
      const [resPago] = await conn.execute(
        `INSERT INTO pagos (numero_recibo, id_venta, id_usuario, monto, metodo_pago, referencia_pago)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [finalRecibo, id_venta, currentUserId, monto, metodo_pago, referencia_pago || null]
      );

      const [vRows] = await conn.execute(
        `SELECT id_venta, numero_factura, total, saldo_pendiente, estado FROM ventas WHERE id_venta = ?`,
        [id_venta]
      );

      return {
        insertId: resPago.insertId,
        ventaActualizada: vRows[0]
      };
    }, ip);

    const pago = await this.obtenerPorId(insertId);
    return {
      pago,
      venta: ventaActualizada
    };
  }
}
