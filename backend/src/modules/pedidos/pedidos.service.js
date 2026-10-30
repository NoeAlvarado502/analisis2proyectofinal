import { pool } from '../../db/pool.js';
import { withUser } from '../../db/withUser.js';

export class PedidosService {
  /**
   * Lista pedidos con filtros opcionales y paginación
   */
  static async listar({ q, id_cliente, estado, requiere_autorizacion, fecha_desde, fecha_hasta, page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;
    const params = [];
    const whereConditions = [];

    if (q && q.trim() !== '') {
      whereConditions.push('(p.numero_pedido LIKE ? OR c.nombre_razon_social LIKE ? OR c.identificacion LIKE ?)');
      const term = `%${q.trim()}%`;
      params.push(term, term, term);
    }

    if (id_cliente) {
      whereConditions.push('p.id_cliente = ?');
      params.push(parseInt(id_cliente, 10));
    }

    if (estado && estado.trim() !== '') {
      whereConditions.push('p.estado = ?');
      params.push(estado.trim());
    }

    if (requiere_autorizacion !== undefined && requiere_autorizacion !== null && requiere_autorizacion !== '') {
      const reqVal = (requiere_autorizacion === true || requiere_autorizacion === 'true' || requiere_autorizacion === 1 || requiere_autorizacion === '1') ? 1 : 0;
      whereConditions.push('p.requiere_autorizacion = ?');
      params.push(reqVal);
    }

    if (fecha_desde) {
      whereConditions.push('p.fecha_creacion >= ?');
      params.push(fecha_desde.includes(' ') ? fecha_desde : `${fecha_desde} 00:00:00`);
    }

    if (fecha_hasta) {
      whereConditions.push('p.fecha_creacion <= ?');
      params.push(fecha_hasta.includes(' ') ? fecha_hasta : `${fecha_hasta} 23:59:59`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM pedidos p
       JOIN clientes c ON c.id_cliente = p.id_cliente
       ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await pool.execute(
      `SELECT p.id_pedido, p.numero_pedido, p.id_cliente,
              c.nombre_razon_social AS cliente_nombre, c.identificacion AS cliente_identificacion,
              p.id_usuario_vendedor, uv.nombre_completo AS vendedor_nombre,
              p.id_usuario_supervisor, us.nombre_completo AS supervisor_nombre,
              p.estado, p.subtotal, p.descuento_total, p.total,
              p.requiere_autorizacion, p.motivo_descuento_especial, p.observaciones,
              p.fecha_creacion, p.fecha_autorizacion, p.updated_at
       FROM pedidos p
       JOIN clientes c ON c.id_cliente = p.id_cliente
       JOIN usuarios uv ON uv.id_usuario = p.id_usuario_vendedor
       LEFT JOIN usuarios us ON us.id_usuario = p.id_usuario_supervisor
       ${whereClause}
       ORDER BY p.id_pedido DESC
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
   * Sugiere el siguiente correlativo PED-XXXX y consulta el descuento máximo sin autorización
   */
  static async sugerirNumero() {
    const [rows] = await pool.execute(
      `SELECT numero_pedido FROM pedidos WHERE numero_pedido LIKE 'PED-%'`
    );

    let maxNum = 0;
    for (const r of rows) {
      const match = r.numero_pedido.match(/^PED-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    const sugerencia = `PED-${String(maxNum + 1).padStart(4, '0')}`;

    const [cfgRows] = await pool.execute(
      `SELECT valor FROM configuraciones WHERE clave = 'DESCUENTO_MAX_SIN_AUTORIZACION'`
    );
    const descuento_max = cfgRows.length > 0 ? parseFloat(cfgRows[0].valor) : 10.0;

    return {
      sugerencia,
      descuento_max_sin_autorizacion: descuento_max
    };
  }

  /**
   * Obtiene un pedido completo por su ID con sus detalles y escalas aplicadas
   */
  static async obtenerPorId(id) {
    const [rows] = await pool.execute(
      `SELECT p.id_pedido, p.numero_pedido, p.id_cliente,
              c.nombre_razon_social AS cliente_nombre, c.identificacion AS cliente_identificacion,
              c.email AS cliente_email, c.telefono AS cliente_telefono,
              p.id_usuario_vendedor, uv.nombre_completo AS vendedor_nombre,
              p.id_usuario_supervisor, us.nombre_completo AS supervisor_nombre,
              p.estado, p.subtotal, p.descuento_total, p.total,
              p.requiere_autorizacion, p.motivo_descuento_especial, p.observaciones,
              p.fecha_creacion, p.fecha_autorizacion, p.updated_at
       FROM pedidos p
       JOIN clientes c ON c.id_cliente = p.id_cliente
       JOIN usuarios uv ON uv.id_usuario = p.id_usuario_vendedor
       LEFT JOIN usuarios us ON us.id_usuario = p.id_usuario_supervisor
       WHERE p.id_pedido = ?`,
      [id]
    );

    if (rows.length === 0) {
      const err = new Error('Pedido no encontrado');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const pedido = rows[0];

    const [detalles] = await pool.execute(
      `SELECT pd.id_pedido_detalle, pd.id_pedido, pd.id_producto,
              pr.codigo_sku, pr.nombre AS producto_nombre,
              pd.id_escala_aplicada, ep.cantidad_minima AS escala_cantidad_minima,
              pd.cantidad, pd.precio_escala, pd.porcentaje_descuento_extra,
              pd.monto_descuento_extra, pd.subtotal, COALESCE(i.stock_actual, 0) AS stock_actual
       FROM pedidos_detalle pd
       JOIN productos pr ON pr.id_producto = pd.id_producto
       LEFT JOIN inventario i ON i.id_producto = pd.id_producto
       LEFT JOIN escalas_precio ep ON ep.id_escala = pd.id_escala_aplicada
       WHERE pd.id_pedido = ?
       ORDER BY pd.id_pedido_detalle ASC`,
      [id]
    );

    pedido.detalles = detalles;
    return pedido;
  }

  /**
   * Registra un nuevo pedido y sus líneas de detalle
   */
  static async crear({ numero_pedido, id_cliente, observaciones, motivo_descuento_especial, detalles, enviar_inmediatamente }, currentUserId, ip = null) {
    let finalNumero = numero_pedido;
    if (!finalNumero || typeof finalNumero !== 'string' || finalNumero.trim() === '') {
      const sug = await PedidosService.sugerirNumero();
      finalNumero = sug.sugerencia;
    }

    // Validar cliente existente y activo
    const [cfgRows] = await pool.execute(
      `SELECT valor FROM configuraciones WHERE clave = 'DESCUENTO_MAX_SIN_AUTORIZACION'`
    );
    const descMax = cfgRows.length > 0 ? parseFloat(cfgRows[0].valor) : 10.0;
    if (
      Array.isArray(detalles) &&
      detalles.some((d) => Number(d.porcentaje_descuento_extra || 0) > descMax) &&
      (!motivo_descuento_especial || !String(motivo_descuento_especial).trim())
    ) {
      const err = new Error(`El descuento supera el límite configurado (${descMax}%). Es obligatorio indicar el motivo del descuento especial`);
      err.statusCode = 422;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }
    const [clienteRows] = await pool.execute(
      'SELECT activo FROM clientes WHERE id_cliente = ?',
      [id_cliente]
    );

    if (clienteRows.length === 0) {
      const err = new Error('El cliente especificado no existe');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    if (!clienteRows[0].activo) {
      const err = new Error('No se pueden crear pedidos para un cliente inactivo');
      err.statusCode = 400;
      err.code = 'CLIENT_INACTIVE';
      throw err;
    }

    const insertId = await withUser(currentUserId, async (conn) => {
      if (!numero_pedido || typeof numero_pedido !== 'string' || numero_pedido.trim() === '') {
        const [pedRows] = await conn.execute(
          `SELECT numero_pedido FROM pedidos WHERE numero_pedido REGEXP '^PED-[0-9]+$' ORDER BY CAST(SUBSTRING(numero_pedido, 5) AS UNSIGNED) DESC LIMIT 1 FOR UPDATE`
        );
        let nextPed = 1;
        if (pedRows.length > 0) {
          const match = pedRows[0].numero_pedido.match(/^PED-(\d+)$/i);
          if (match) nextPed = parseInt(match[1], 10) + 1;
        }
        finalNumero = `PED-${String(nextPed).padStart(4, '0')}`;
      }
      const [pedidoRes] = await conn.execute(
        `INSERT INTO pedidos (numero_pedido, id_cliente, id_usuario_vendedor, observaciones, motivo_descuento_especial)
         VALUES (?, ?, ?, ?, ?)`,
        [finalNumero, id_cliente, currentUserId, observaciones || null, motivo_descuento_especial || null]
      );
      /*
        `INSERT INTO pedidos (numero_pedido, id_cliente, id_usuario_vendedor, observaciones, motivo_descuento_especial)
         VALUES (?, ?, ?, ?, ?)`,
        [finalNumero, id_cliente, currentUserId, observaciones || null, motivo_descuento_especial || null]
      );
      /*
      );
      */
      const pedidoId = pedidoRes.insertId;

      for (const item of detalles) {
        await conn.execute(
          `INSERT INTO pedidos_detalle (id_pedido, id_producto, cantidad, porcentaje_descuento_extra)
           VALUES (?, ?, ?, ?)`,
          [pedidoId, item.id_producto, item.cantidad, item.porcentaje_descuento_extra || 0]
        );
      }

      if (enviar_inmediatamente) {
        await conn.execute('CALL sp_enviar_pedido(?)', [pedidoId]);
      }

      return pedidoId;
    }, ip);

    return await this.obtenerPorId(insertId);
  }

  /**
   * Actualiza observaciones, motivo y líneas de detalle mientras esté en estado CREADO
   */
  static async actualizar(id, { observaciones, motivo_descuento_especial, detalles }, currentUserId, ip = null) {
    const pedido = await this.obtenerPorId(id);

    if (pedido.estado !== 'CREADO') {
      const err = new Error(`Solo se puede modificar un pedido en estado CREADO (estado actual: ${pedido.estado})`);
      err.statusCode = 409;
      err.code = 'INVALID_STATE';
      throw err;
    }

    await withUser(currentUserId, async (conn) => {
      // Validar descuento contra configuración dinámica
      const [cfgRows] = await conn.execute(
        `SELECT valor FROM configuraciones WHERE clave = 'DESCUENTO_MAX_SIN_AUTORIZACION'`
      );
      const descMax = cfgRows.length > 0 ? parseFloat(cfgRows[0].valor) : 10.0;
      const lineasValidar = detalles && detalles.length > 0 ? detalles : pedido.detalles || [];
      if (
        lineasValidar.some((d) => Number(d.porcentaje_descuento_extra || 0) > descMax) &&
        (!motivo_descuento_especial || !String(motivo_descuento_especial).trim())
      ) {
        const err = new Error(`El descuento supera el límite configurado (${descMax}%). Es obligatorio indicar el motivo del descuento especial`);
        err.statusCode = 422;
        err.code = 'VALIDATION_ERROR';
        throw err;
      }
      await conn.execute(
        `UPDATE pedidos SET observaciones = ?, motivo_descuento_especial = ? WHERE id_pedido = ?`,
        [observaciones || null, motivo_descuento_especial || null, id]
      );

      if (detalles && detalles.length > 0) {
        await conn.execute('DELETE FROM pedidos_detalle WHERE id_pedido = ?', [id]);
        for (const item of detalles) {
          await conn.execute(
            `INSERT INTO pedidos_detalle (id_pedido, id_producto, cantidad, porcentaje_descuento_extra)
             VALUES (?, ?, ?, ?)`,
            [id, item.id_producto, item.cantidad, item.porcentaje_descuento_extra || 0]
          );
        }
      }
    }, ip);

    return await this.obtenerPorId(id);
  }

  /**
   * Transiciona el pedido de CREADO a APROBADO o PENDIENTE_APROBACION mediante sp_enviar_pedido
   */
  static async enviar(id, currentUserId, ip = null, motivo_descuento_especial = undefined) {
    const pedido = await this.obtenerPorId(id);

    if (pedido.estado !== 'CREADO') {
      const err = new Error(`Solo un pedido en estado CREADO puede enviarse (estado actual: ${pedido.estado})`);
      err.statusCode = 409;
      err.code = 'INVALID_STATE';
      throw err;
    }

    await withUser(currentUserId, async (conn) => {
      const [cfgRows] = await conn.execute(
        `SELECT valor FROM configuraciones WHERE clave = 'DESCUENTO_MAX_SIN_AUTORIZACION'`
      );
      const descMax = cfgRows.length > 0 ? parseFloat(cfgRows[0].valor) : 10;
      const requiereNota = (pedido.detalles || []).some((d) => Number(d.porcentaje_descuento_extra || 0) > descMax);
      const finalMotivo =
        motivo_descuento_especial !== undefined && String(motivo_descuento_especial).trim() !== ''
          ? String(motivo_descuento_especial).trim()
          : pedido.motivo_descuento_especial;

      if (requiereNota && (!finalMotivo || String(finalMotivo).trim().length < 5)) {
        const err = new Error('Debe ingresar una justificación cuando el descuento supera el porcentaje máximo permitido');
        err.statusCode = 422;
        err.code = 'VALIDATION_ERROR';
        throw err;
      }

      if (motivo_descuento_especial !== undefined && String(motivo_descuento_especial).trim() !== '') {
        await conn.execute('UPDATE pedidos SET motivo_descuento_especial = ? WHERE id_pedido = ?', [
          String(motivo_descuento_especial).trim(),
          id
        ]);
      }
      await conn.execute('CALL sp_enviar_pedido(?)', [id]);
    }, ip);

    return await this.obtenerPorId(id);
  }

  /**
   * Autoriza el descuento especial pasando de PENDIENTE_APROBACION a APROBADO mediante sp_autorizar_pedido
   */
  static async autorizar(id, motivo_descuento_especial, currentUserId, ip = null) {
    const pedido = await this.obtenerPorId(id);

    if (pedido.estado !== 'PENDIENTE_APROBACION') {
      const err = new Error(`El pedido no esta pendiente de aprobacion (estado actual: ${pedido.estado})`);
      err.statusCode = 409;
      err.code = 'INVALID_STATE';
      throw err;
    }

    await withUser(currentUserId, async (conn) => {
      await conn.execute('CALL sp_autorizar_pedido(?, ?, ?)', [id, currentUserId, motivo_descuento_especial]);
    }, ip);

    return await this.obtenerPorId(id);
  }

  /**
   * Cancela el pedido
   */
  static async cancelar(id, currentUserId, permissions = [], ip = null) {
    const pedido = await this.obtenerPorId(id);

    if (pedido.estado === 'COMPLETADO' || pedido.estado === 'CANCELADO') {
      const err = new Error(`Un pedido ${pedido.estado} no puede modificarse`);
      err.statusCode = 409;
      err.code = 'INVALID_STATE';
      throw err;
    }

    const hasCancelarPerm = permissions.includes('pedidos.cancelar');
    if (!hasCancelarPerm) {
      if (!permissions.includes('pedidos.crear') || pedido.estado !== 'CREADO') {
        const err = new Error('Acceso denegado: no cuenta con el permiso requerido para cancelar este pedido');
        err.statusCode = 403;
        err.code = 'FORBIDDEN';
        throw err;
      }
    }

    await withUser(currentUserId, async (conn) => {
      await conn.execute("UPDATE pedidos SET estado = 'CANCELADO' WHERE id_pedido = ?", [id]);
    }, ip);

    return await this.obtenerPorId(id);
  }
}
