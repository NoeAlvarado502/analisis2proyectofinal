import { pool } from '../../db/pool.js';

export class ReportesService {
  /**
   * Reporte de ventas filtrable con resumen consolidado
   */
  static async ventas({ fecha_desde, fecha_hasta, estado, q }) {
    const whereConditions = [];
    const params = [];

    if (fecha_desde) {
      whereConditions.push('fecha_venta >= ?');
      params.push(fecha_desde.includes(' ') ? fecha_desde : `${fecha_desde} 00:00:00`);
    }

    if (fecha_hasta) {
      whereConditions.push('fecha_venta <= ?');
      params.push(fecha_hasta.includes(' ') ? fecha_hasta : `${fecha_hasta} 23:59:59`);
    }

    if (estado && estado.trim() !== '') {
      whereConditions.push('estado = ?');
      params.push(estado.trim());
    }

    if (q && q.trim() !== '') {
      whereConditions.push('(numero_factura LIKE ? OR numero_pedido LIKE ? OR cliente LIKE ? OR vendedor LIKE ?)');
      const term = `%${q.trim()}%`;
      params.push(term, term, term, term);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const [rows] = await pool.execute(
      `SELECT id_venta, fecha_venta, numero_factura, numero_pedido,
              cliente, vendedor, subtotal, descuento, total, saldo_pendiente, estado
       FROM v_ventas_reporte
       ${whereClause}
       ORDER BY fecha_venta DESC`,
      params
    );

    let total_ventas = 0;
    let total_descuentos = 0;
    let total_saldo_pendiente = 0;
    const conteo_por_estado = {
      PENDIENTE: 0,
      COMPLETADA: 0,
      ANULADA: 0
    };

    for (const r of rows) {
      total_ventas += parseFloat(r.total) || 0;
      total_descuentos += parseFloat(r.descuento) || 0;
      total_saldo_pendiente += parseFloat(r.saldo_pendiente) || 0;
      if (conteo_por_estado[r.estado] !== undefined) {
        conteo_por_estado[r.estado] += 1;
      } else {
        conteo_por_estado[r.estado] = 1;
      }
    }

    return {
      filas: rows,
      resumen: {
        total_ventas: parseFloat(total_ventas.toFixed(2)),
        total_descuentos: parseFloat(total_descuentos.toFixed(2)),
        total_saldo_pendiente: parseFloat(total_saldo_pendiente.toFixed(2)),
        conteo_por_estado
      }
    };
  }

  /**
   * Reporte de inventario crítico (productos bajo el stock mínimo y resumen kardex)
   */
  static async inventarioCritico({ fecha_desde, fecha_hasta } = {}) {
    const [stockBajo] = await pool.execute(
      `SELECT id_producto, codigo_sku, nombre, categoria, stock_actual, stock_minimo, faltante
       FROM v_stock_bajo
       ORDER BY faltante DESC, stock_actual ASC`
    );

    const kardexWhere = [];
    const kardexParams = [];

    if (fecha_desde) {
      kardexWhere.push('fecha_hora >= ?');
      kardexParams.push(fecha_desde.includes(' ') ? fecha_desde : `${fecha_desde} 00:00:00`);
    }

    if (fecha_hasta) {
      kardexWhere.push('fecha_hora <= ?');
      kardexParams.push(fecha_hasta.includes(' ') ? fecha_hasta : `${fecha_hasta} 23:59:59`);
    }

    const whereKardexClause = kardexWhere.length > 0 ? `WHERE ${kardexWhere.join(' AND ')}` : '';

    const [movimientosResumen] = await pool.execute(
      `SELECT tipo_movimiento, COUNT(*) AS total_movimientos, COALESCE(SUM(cantidad), 0) AS total_unidades
       FROM v_kardex
       ${whereKardexClause}
       GROUP BY tipo_movimiento`,
      kardexParams
    );

    return {
      stock_bajo: stockBajo,
      movimientos_resumen: movimientosResumen
    };
  }

  /**
   * Consolidado del Dashboard con indicadores clave y gráficas
   */
  static async dashboard() {
    const [dashRows] = await pool.execute('SELECT * FROM v_dashboard');
    const [pedidosRows] = await pool.execute('SELECT * FROM v_pedidos_por_estado');
    const [ventasMesRows] = await pool.execute('SELECT * FROM v_ventas_por_mes ORDER BY mes ASC');
    const [topProdRows] = await pool.execute('SELECT * FROM v_top_productos ORDER BY ingresos DESC LIMIT 10');

    return {
      indicadores: dashRows[0] || {},
      pedidos_por_estado: pedidosRows,
      ventas_por_mes: ventasMesRows,
      top_productos: topProdRows
    };
  }
}
