import { pool } from '../../db/pool.js';
import { withUser } from '../../db/withUser.js';

export class VentasService {
  /**
   * Lista ventas con filtros avanzados y paginación
   */
  static async listar({ q, estado, id_cliente, con_saldo_pendiente, fecha_desde, fecha_hasta, page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;
    const params = [];
    const whereConditions = [];

    if (q && q.trim() !== '') {
      whereConditions.push('(v.numero_factura LIKE ? OR pe.numero_pedido LIKE ? OR c.nombre_razon_social LIKE ? OR c.identificacion LIKE ?)');
      const term = `%${q.trim()}%`;
      params.push(term, term, term, term);
    }

    if (estado && estado.trim() !== '') {
      whereConditions.push('v.estado = ?');
      params.push(estado.trim());
    }

    if (id_cliente) {
      whereConditions.push('pe.id_cliente = ?');
      params.push(parseInt(id_cliente, 10));
    }

    if (con_saldo_pendiente === true || con_saldo_pendiente === 'true' || con_saldo_pendiente === 1 || con_saldo_pendiente === '1') {
      whereConditions.push('v.saldo_pendiente > 0');
    }

    if (fecha_desde) {
      whereConditions.push('v.fecha_venta >= ?');
      params.push(fecha_desde);
    }

    if (fecha_hasta) {
      whereConditions.push('v.fecha_venta <= ?');
      params.push(fecha_hasta);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM ventas v
       JOIN pedidos pe ON pe.id_pedido = v.id_pedido
       JOIN clientes c ON c.id_cliente = pe.id_cliente
       ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await pool.execute(
      `SELECT v.id_venta, v.numero_factura, v.id_pedido, pe.numero_pedido,
              pe.id_cliente, c.nombre_razon_social AS cliente_nombre, c.identificacion AS cliente_identificacion,
              v.id_usuario, u.nombre_completo AS usuario_nombre,
              v.estado, v.subtotal, v.descuento, v.total, v.saldo_pendiente,
              v.fecha_venta, v.updated_at
       FROM ventas v
       JOIN pedidos pe ON pe.id_pedido = v.id_pedido
       JOIN clientes c ON c.id_cliente = pe.id_cliente
       JOIN usuarios u ON u.id_usuario = v.id_usuario
       ${whereClause}
       ORDER BY v.id_venta DESC
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
   * Sugiere el siguiente correlativo FAC-XXXX
   */
  static async sugerirFactura() {
    const [rows] = await pool.execute(
      `SELECT numero_factura
       FROM ventas
       WHERE numero_factura LIKE 'FAC-%'
       ORDER BY id_venta DESC
       LIMIT 1`
    );

    let nextNum = 1;
    if (rows.length > 0) {
      const match = rows[0].numero_factura.match(/^FAC-(\d+)$/i);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }
    const sugerencia = `FAC-${String(nextNum).padStart(4, '0')}`;
    return { sugerencia };
  }

  /**
   * Obtiene la venta con su cabecera, detalles y lista de pagos asociados
   */
  static async obtenerPorId(id) {
    const [rows] = await pool.execute(
      `SELECT v.id_venta, v.numero_factura, v.id_pedido, pe.numero_pedido,
              pe.id_cliente, c.nombre_razon_social AS cliente_nombre, c.identificacion AS cliente_identificacion,
              c.email AS cliente_email, c.telefono AS cliente_telefono,
              v.id_usuario, u.nombre_completo AS usuario_nombre,
              v.estado, v.subtotal, v.descuento, v.total, v.saldo_pendiente,
              v.fecha_venta, v.updated_at
       FROM ventas v
       JOIN pedidos pe ON pe.id_pedido = v.id_pedido
       JOIN clientes c ON c.id_cliente = pe.id_cliente
       JOIN usuarios u ON u.id_usuario = v.id_usuario
       WHERE v.id_venta = ?`,
      [id]
    );

    if (rows.length === 0) {
      const err = new Error('Venta no encontrada');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const venta = rows[0];

    const [detalles] = await pool.execute(
      `SELECT vd.id_venta_detalle, vd.id_venta, vd.id_producto,
              p.codigo_sku, p.nombre AS producto_nombre,
              vd.cantidad, vd.precio_unitario, vd.descuento_aplicado, vd.subtotal
       FROM ventas_detalle vd
       JOIN productos p ON p.id_producto = vd.id_producto
       WHERE vd.id_venta = ?
       ORDER BY vd.id_venta_detalle ASC`,
      [id]
    );

    const [pagos] = await pool.execute(
      `SELECT pg.id_pago, pg.numero_recibo, pg.id_venta, pg.id_usuario,
              u.nombre_completo AS usuario_nombre, pg.monto, pg.metodo_pago,
              pg.referencia_pago, pg.fecha_pago
       FROM pagos pg
       JOIN usuarios u ON u.id_usuario = pg.id_usuario
       WHERE pg.id_venta = ?
       ORDER BY pg.id_pago ASC`,
      [id]
    );

    venta.detalles = detalles;
    venta.pagos = pagos;
    return venta;
  }

  /**
   * Genera una venta a partir de un pedido APROBADO, con opción a pago inicial
   */
  static async crear({ id_pedido, numero_factura, pago_inicial }, currentUserId, permissions = [], ip = null) {
    let finalFactura = numero_factura;
    if (!finalFactura || typeof finalFactura !== 'string' || finalFactura.trim() === '') {
      const sug = await VentasService.sugerirFactura();
      finalFactura = sug.sugerencia;
    }

    if (pago_inicial && pago_inicial.monto > 0) {
      if (!permissions.includes('pagos.registrar')) {
        const err = new Error('No cuenta con el permiso pagos.registrar para asentar el pago inicial');
        err.statusCode = 403;
        err.code = 'FORBIDDEN';
        throw err;
      }
    }

    const insertId = await withUser(currentUserId, async (conn) => {
      const [ventaRes] = await conn.execute(
        `INSERT INTO ventas (numero_factura, id_pedido, id_usuario)
         VALUES (?, ?, ?)`,
        [finalFactura, id_pedido, currentUserId]
      );
      const ventaId = ventaRes.insertId;

      if (pago_inicial && pago_inicial.monto > 0) {
        const [recRows] = await conn.execute(
          `SELECT numero_recibo FROM pagos WHERE numero_recibo LIKE 'REC-%' ORDER BY id_pago DESC LIMIT 1`
        );
        let nextRec = 1;
        if (recRows.length > 0) {
          const match = recRows[0].numero_recibo.match(/^REC-(\d+)$/i);
          if (match) nextRec = parseInt(match[1], 10) + 1;
        }
        const numero_recibo = `REC-${String(nextRec).padStart(4, '0')}`;

        await conn.execute(
          `INSERT INTO pagos (numero_recibo, id_venta, id_usuario, monto, metodo_pago, referencia_pago)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [numero_recibo, ventaId, currentUserId, pago_inicial.monto, pago_inicial.metodo_pago, pago_inicial.referencia_pago || null]
        );
      }

      return ventaId;
    }, ip);

    return await this.obtenerPorId(insertId);
  }

  /**
   * Anula una venta (únicamente permitido por triggers si está PENDIENTE y sin pagos)
   */
  static async anular(id, currentUserId, ip = null) {
    await this.obtenerPorId(id);

    await withUser(currentUserId, async (conn) => {
      await conn.execute("UPDATE ventas SET estado = 'ANULADA' WHERE id_venta = ?", [id]);
    }, ip);

    return await this.obtenerPorId(id);
  }
}
