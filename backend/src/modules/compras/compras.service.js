import { pool } from '../../db/pool.js';
import { withUser } from '../../db/withUser.js';

export class ComprasService {
  /**
   * Lista compras con filtros opcionales y paginación
   */
  static async listar({ q, id_proveedor, estado, fecha_desde, fecha_hasta, page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;
    const params = [];
    const whereConditions = [];

    if (q && q.trim() !== '') {
      whereConditions.push('(c.numero_comprobante LIKE ? OR pr.razon_social LIKE ? OR pr.identificacion_fiscal LIKE ?)');
      const term = `%${q.trim()}%`;
      params.push(term, term, term);
    }

    if (id_proveedor) {
      whereConditions.push('c.id_proveedor = ?');
      params.push(parseInt(id_proveedor, 10));
    }

    if (estado && estado.trim() !== '') {
      whereConditions.push('c.estado = ?');
      params.push(estado.trim());
    }

    if (fecha_desde) {
      whereConditions.push('c.fecha_compra >= ?');
      params.push(fecha_desde.includes(' ') ? fecha_desde : `${fecha_desde} 00:00:00`);
    }

    if (fecha_hasta) {
      whereConditions.push('c.fecha_compra <= ?');
      params.push(fecha_hasta.includes(' ') ? fecha_hasta : `${fecha_hasta} 23:59:59`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM compras c
       JOIN proveedores pr ON pr.id_proveedor = c.id_proveedor
       ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await pool.execute(
      `SELECT c.id_compra, c.numero_comprobante, c.id_proveedor, pr.razon_social AS proveedor_nombre,
              pr.identificacion_fiscal AS proveedor_identificacion, c.id_usuario,
              u.nombre_completo AS usuario_registro, c.id_usuario_recepcion,
              ur.nombre_completo AS usuario_recepcion, c.estado, c.total,
              c.observaciones, c.fecha_compra, c.fecha_recepcion, c.updated_at
       FROM compras c
       JOIN proveedores pr ON pr.id_proveedor = c.id_proveedor
       JOIN usuarios u ON u.id_usuario = c.id_usuario
       LEFT JOIN usuarios ur ON ur.id_usuario = c.id_usuario_recepcion
       ${whereClause}
       ORDER BY c.id_compra DESC
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
   * Sugiere el siguiente correlativo para número de comprobante COMP-XXXX
   */
  static async sugerirComprobante() {
    const [rows] = await pool.execute(
      `SELECT numero_comprobante FROM compras WHERE numero_comprobante LIKE 'COMP-%'`
    );

    let maxNum = 0;
    for (const r of rows) {
      const match = r.numero_comprobante.match(/^COMP-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    const sugerencia = `COMP-${String(maxNum + 1).padStart(4, '0')}`;
    return { sugerencia };
  }

  /**
   * Obtiene una compra por ID con su cabecera y el listado de detalles
   */
  static async obtenerPorId(id) {
    const [comprasRows] = await pool.execute(
      `SELECT c.id_compra, c.numero_comprobante, c.id_proveedor, pr.razon_social AS proveedor_nombre,
              pr.identificacion_fiscal AS proveedor_identificacion, c.id_usuario,
              u.nombre_completo AS usuario_registro, c.id_usuario_recepcion,
              ur.nombre_completo AS usuario_recepcion, c.estado, c.total,
              c.observaciones, c.fecha_compra, c.fecha_recepcion, c.updated_at
       FROM compras c
       JOIN proveedores pr ON pr.id_proveedor = c.id_proveedor
       JOIN usuarios u ON u.id_usuario = c.id_usuario
       LEFT JOIN usuarios ur ON ur.id_usuario = c.id_usuario_recepcion
       WHERE c.id_compra = ?`,
      [id]
    );

    if (comprasRows.length === 0) {
      const err = new Error('Compra no encontrada');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const compra = comprasRows[0];

    const [detalles] = await pool.execute(
      `SELECT cd.id_compra_detalle, cd.id_compra, cd.id_producto,
              p.codigo_sku, p.nombre AS producto_nombre,
              cd.cantidad, cd.costo_unitario, cd.subtotal
       FROM compras_detalle cd
       JOIN productos p ON p.id_producto = cd.id_producto
       WHERE cd.id_compra = ?
       ORDER BY cd.id_compra_detalle ASC`,
      [id]
    );

    compra.detalles = detalles;
    return compra;
  }

  /**
   * Registra una nueva compra y sus detalles usando withUser
   */
  static async crear({ numero_comprobante, id_proveedor, observaciones, detalles, recibir_inmediatamente }, currentUserId, permissions = [], ip = null) {
    let finalComprobante = numero_comprobante;
    if (!finalComprobante || typeof finalComprobante !== 'string' || finalComprobante.trim() === '') {
      const sug = await ComprasService.sugerirComprobante();
      finalComprobante = sug.sugerencia;
    }

    // Validar existencia y estado activo del proveedor
    const [provRows] = await pool.execute(
      'SELECT activo FROM proveedores WHERE id_proveedor = ?',
      [id_proveedor]
    );

    if (provRows.length === 0) {
      const err = new Error('El proveedor especificado no existe');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (!provRows[0].activo) {
      const err = new Error('No se pueden registrar compras a un proveedor inactivo');
      err.statusCode = 400;
      err.code = 'PROVIDER_INACTIVE';
      throw err;
    }

    if (recibir_inmediatamente && !permissions.includes('compras.recibir')) {
      const err = new Error('No cuenta con el permiso compras.recibir para recibir la compra inmediatamente');
      err.statusCode = 403;
      err.code = 'FORBIDDEN';
      throw err;
    }

    const insertId = await withUser(currentUserId, async (conn) => {
      if (!numero_comprobante || typeof numero_comprobante !== 'string' || numero_comprobante.trim() === '') {
        const [compRows] = await conn.execute(
          `SELECT numero_comprobante FROM compras WHERE numero_comprobante REGEXP '^COMP-[0-9]+$' ORDER BY CAST(SUBSTRING(numero_comprobante, 6) AS UNSIGNED) DESC LIMIT 1 FOR UPDATE`
        );
        let nextComp = 1;
        if (compRows.length > 0) {
          const match = compRows[0].numero_comprobante.match(/^COMP-(\d+)$/i);
          if (match) nextComp = parseInt(match[1], 10) + 1;
        }
        finalComprobante = `COMP-${String(nextComp).padStart(4, '0')}`;
      }
      const [compraRes] = await conn.execute(
        `INSERT INTO compras (numero_comprobante, id_proveedor, id_usuario, observaciones)
         VALUES (?, ?, ?, ?)`,
        [finalComprobante, id_proveedor, currentUserId, observaciones || null]
      );
      const compraId = compraRes.insertId;

      for (const item of detalles) {
        await conn.execute(
          `INSERT INTO compras_detalle (id_compra, id_producto, cantidad, costo_unitario)
           VALUES (?, ?, ?, ?)`,
          [compraId, item.id_producto, item.cantidad, item.costo_unitario]
        );
      }

      if (recibir_inmediatamente) {
        await conn.execute(
          `UPDATE compras
           SET estado = 'RECIBIDA', id_usuario_recepcion = ?
           WHERE id_compra = ?`,
          [currentUserId, compraId]
        );
      }

      return compraId;
    }, ip);

    return await this.obtenerPorId(insertId);
  }

  /**
   * Actualiza observaciones y detalles de una compra en estado REGISTRADA
   */
  static async actualizar(id, { observaciones, detalles }, currentUserId, ip = null) {
    const compra = await this.obtenerPorId(id);

    if (compra.estado !== 'REGISTRADA') {
      const err = new Error(`Una compra en estado ${compra.estado} no puede modificarse`);
      err.statusCode = 409;
      err.code = 'INVALID_STATE';
      throw err;
    }

    await withUser(currentUserId, async (conn) => {
      await conn.execute(
        `UPDATE compras SET observaciones = ? WHERE id_compra = ?`,
        [observaciones || null, id]
      );

      if (detalles && detalles.length > 0) {
        await conn.execute(`DELETE FROM compras_detalle WHERE id_compra = ?`, [id]);
        for (const item of detalles) {
          await conn.execute(
            `INSERT INTO compras_detalle (id_compra, id_producto, cantidad, costo_unitario)
             VALUES (?, ?, ?, ?)`,
            [id, item.id_producto, item.cantidad, item.costo_unitario]
          );
        }
      }
    }, ip);

    return await this.obtenerPorId(id);
  }

  /**
   * Marca una compra como RECIBIDA, lo cual dispara la entrada de inventario vía trigger
   */
  static async recibir(id, currentUserId, ip = null) {
    const compra = await this.obtenerPorId(id);

    if (compra.estado !== 'REGISTRADA') {
      const err = new Error(`Solo se puede recibir una compra en estado REGISTRADA (estado actual: ${compra.estado})`);
      err.statusCode = 409;
      err.code = 'INVALID_STATE';
      throw err;
    }

    await withUser(currentUserId, async (conn) => {
      await conn.execute(
        `UPDATE compras
         SET estado = 'RECIBIDA', id_usuario_recepcion = ?
         WHERE id_compra = ?`,
        [currentUserId, id]
      );
    }, ip);

    return await this.obtenerPorId(id);
  }

  /**
   * Marca una compra como ANULADA (solo si está REGISTRADA)
   */
  static async anular(id, currentUserId, ip = null) {
    const compra = await this.obtenerPorId(id);

    if (compra.estado !== 'REGISTRADA') {
      const err = new Error(`Solo se puede anular una compra en estado REGISTRADA (estado actual: ${compra.estado})`);
      err.statusCode = 409;
      err.code = 'INVALID_STATE';
      throw err;
    }

    await withUser(currentUserId, async (conn) => {
      await conn.execute(
        `UPDATE compras SET estado = 'ANULADA' WHERE id_compra = ?`,
        [id]
      );
    }, ip);

    return await this.obtenerPorId(id);
  }

  /**
   * Obtiene el último costo unitario registrado para un producto en compras previas
   */
  static async obtenerUltimoCosto(id_producto) {
    const [rows] = await pool.execute(
      `SELECT cd.costo_unitario
       FROM compras_detalle cd
       JOIN compras c ON c.id_compra = cd.id_compra
       WHERE cd.id_producto = ? AND c.estado != 'ANULADA'
       ORDER BY c.id_compra DESC
       LIMIT 1`,
      [Number(id_producto)]
    );

    if (rows.length > 0) {
      return parseFloat(rows[0].costo_unitario);
    }

    const [prodRows] = await pool.execute(
      `SELECT precio_menudeo FROM v_catalogo WHERE id_producto = ? LIMIT 1`,
      [Number(id_producto)]
    );

    if (prodRows.length > 0 && prodRows[0].precio_menudeo) {
      return Math.round(parseFloat(prodRows[0].precio_menudeo) * 0.6 * 100) / 100;
    }

    return null;
  }
}
