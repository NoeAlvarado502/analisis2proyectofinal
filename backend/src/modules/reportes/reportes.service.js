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

  /**
   * Informe 1: Kardex Físico y Trazabilidad
   * Fuente principal: Vista v_kardex haciendo JOIN con productos
   */
  static async kardex({
    fecha_desde,
    fecha_hasta,
    id_producto,
    codigo_sku,
    id_categoria,
    tipo_movimiento,
    documento_tipo,
    orden = 'DESC',
    q
  } = {}) {
    const whereConditions = [];
    const params = [];

    if (fecha_desde) {
      whereConditions.push('k.fecha_hora >= ?');
      params.push(fecha_desde.includes(' ') ? fecha_desde : `${fecha_desde} 00:00:00`);
    }

    if (fecha_hasta) {
      whereConditions.push('k.fecha_hora <= ?');
      params.push(fecha_hasta.includes(' ') ? fecha_hasta : `${fecha_hasta} 23:59:59`);
    }

    if (id_producto && String(id_producto).trim() !== '' && String(id_producto) !== 'todos') {
      whereConditions.push('p.id_producto = ?');
      params.push(parseInt(id_producto, 10));
    } else if (codigo_sku && codigo_sku.trim() !== '') {
      whereConditions.push('p.codigo_sku = ?');
      params.push(codigo_sku.trim());
    }

    if (id_categoria && String(id_categoria).trim() !== '' && String(id_categoria) !== 'todos') {
      whereConditions.push('p.id_categoria = ?');
      params.push(parseInt(id_categoria, 10));
    }

    if (tipo_movimiento && tipo_movimiento.trim() !== '' && tipo_movimiento !== 'todos') {
      whereConditions.push('k.tipo_movimiento = ?');
      params.push(tipo_movimiento.trim());
    }

    if (documento_tipo && documento_tipo.trim() !== '' && documento_tipo !== 'todos') {
      whereConditions.push('k.documento_tipo = ?');
      params.push(documento_tipo.trim());
    }

    if (q && q.trim() !== '') {
      whereConditions.push('(k.codigo_sku LIKE ? OR k.producto LIKE ? OR k.motivo LIKE ? OR k.documento_id LIKE ? OR k.usuario LIKE ?)');
      const term = `%${q.trim()}%`;
      params.push(term, term, term, term, term);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const dir = String(orden).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const [rows] = await pool.execute(
      `SELECT k.id_movimiento, k.fecha_hora, k.codigo_sku, k.producto,
              k.tipo_movimiento, k.cantidad, k.stock_anterior, k.stock_posterior,
              k.documento_tipo, k.documento_id, k.motivo, k.usuario,
              p.id_producto, p.id_categoria, c.nombre AS categoria
       FROM v_kardex k
       JOIN productos p ON p.codigo_sku = k.codigo_sku
       JOIN categorias c ON c.id_categoria = p.id_categoria
       ${whereClause}
       ORDER BY k.fecha_hora ${dir}, k.id_movimiento ${dir}`,
      params
    );

    let total_entradas = 0;
    let total_salidas = 0;

    for (const r of rows) {
      const cant = Number(r.cantidad) || 0;
      if (r.tipo_movimiento === 'ENTRADA' || (r.tipo_movimiento === 'DEVOLUCION' && cant > 0)) {
        total_entradas += cant;
      } else if (r.tipo_movimiento === 'SALIDA') {
        total_salidas += cant;
      } else if (r.tipo_movimiento === 'AJUSTE') {
        if (cant > 0) {
          total_entradas += cant;
        } else {
          total_salidas += Math.abs(cant);
        }
      } else {
        if (cant >= 0) total_entradas += cant;
        else total_salidas += Math.abs(cant);
      }
    }

    const variacion_neta = total_entradas - total_salidas;
    const total_movimientos = rows.length;

    let saldo_inicial = null;
    let saldo_final = null;
    let producto_info = null;

    if (id_producto && String(id_producto) !== 'todos') {
      const [prodRows] = await pool.execute(
        `SELECT p.id_producto, p.codigo_sku, p.nombre, p.stock_minimo, i.stock_actual, c.nombre AS categoria
         FROM productos p
         JOIN categorias c ON c.id_categoria = p.id_categoria
         LEFT JOIN inventario i ON i.id_producto = p.id_producto
         WHERE p.id_producto = ?`,
        [parseInt(id_producto, 10)]
      );
      if (prodRows.length > 0) {
        producto_info = prodRows[0];
        if (rows.length > 0) {
          if (dir === 'ASC') {
            saldo_inicial = rows[0].stock_anterior;
            saldo_final = rows[rows.length - 1].stock_posterior;
          } else {
            saldo_inicial = rows[rows.length - 1].stock_anterior;
            saldo_final = rows[0].stock_posterior;
          }
        } else {
          saldo_inicial = producto_info.stock_actual;
          saldo_final = producto_info.stock_actual;
        }
      }
    }

    const [productosLista] = await pool.execute(
      `SELECT p.id_producto, p.codigo_sku, p.nombre, c.nombre AS categoria
       FROM productos p
       JOIN categorias c ON c.id_categoria = p.id_categoria
       WHERE p.activo = 1
       ORDER BY p.nombre ASC`
    );

    const [categoriasLista] = await pool.execute(
      'SELECT id_categoria, nombre FROM categorias ORDER BY nombre ASC'
    );

    return {
      filas: rows,
      kpis: {
        total_entradas,
        total_salidas,
        variacion_neta,
        total_movimientos
      },
      producto_seleccionado: producto_info
        ? {
            ...producto_info,
            saldo_inicial,
            saldo_final
          }
        : null,
      metadatos: {
        productos: productosLista,
        categorias: categoriasLista
      }
    };
  }

  /**
   * Informe 2: Valoración Total de Inventario
   * Costos calculados dinámicamente desde compras_detalle y compras con estado 'RECIBIDA'.
   * Precios de venta desde escalas_precio (cantidad_minima = 1, activo = 1).
   */
  static async valoracionInventario({
    id_categoria,
    id_marca,
    estado_stock = 'todos',
    activo = '1',
    q
  } = {}) {
    const whereConditions = [];
    const params = [];

    if (id_categoria && String(id_categoria).trim() !== '' && String(id_categoria) !== 'todos') {
      whereConditions.push('p.id_categoria = ?');
      params.push(parseInt(id_categoria, 10));
    }

    if (id_marca && String(id_marca).trim() !== '' && String(id_marca) !== 'todos') {
      whereConditions.push('p.id_marca = ?');
      params.push(parseInt(id_marca, 10));
    }

    if (activo !== 'todos' && activo !== '' && activo !== undefined && activo !== null) {
      whereConditions.push('p.activo = ?');
      params.push(activo === '1' || activo === true || activo === 1 ? 1 : 0);
    }

    if (q && q.trim() !== '') {
      whereConditions.push('(p.codigo_sku LIKE ? OR p.nombre LIKE ?)');
      const term = `%${q.trim()}%`;
      params.push(term, term);
    }

    if (estado_stock === 'alerta') {
      whereConditions.push('COALESCE(i.stock_actual, 0) <= p.stock_minimo');
    } else if (estado_stock === 'agotados') {
      whereConditions.push('COALESCE(i.stock_actual, 0) = 0');
    } else if (estado_stock === 'disponibles') {
      whereConditions.push('COALESCE(i.stock_actual, 0) > 0');
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const [rawRows] = await pool.execute(
      `SELECT p.id_producto,
              p.codigo_sku,
              p.nombre AS producto,
              p.stock_minimo,
              p.activo,
              c.id_categoria,
              c.nombre AS categoria,
              m.id_marca,
              COALESCE(m.nombre, 'Sin marca') AS marca,
              COALESCE(i.stock_actual, 0) AS stock_actual,
              COALESCE(ep.precio_unitario, 0.00) AS precio_menudeo,
              COALESCE(cpp.costo_promedio, 0.00) AS costo_promedio,
              COALESCE(ult_c.ultimo_costo, 0.00) AS ultimo_costo
       FROM productos p
       JOIN categorias c ON c.id_categoria = p.id_categoria
       LEFT JOIN marcas m ON m.id_marca = p.id_marca
       LEFT JOIN inventario i ON i.id_producto = p.id_producto
       LEFT JOIN escalas_precio ep ON ep.id_producto = p.id_producto AND ep.cantidad_minima = 1 AND ep.activo = 1
       LEFT JOIN (
           SELECT cd.id_producto,
                  COALESCE(SUM(cd.subtotal) / NULLIF(SUM(cd.cantidad), 0), 0.00) AS costo_promedio
           FROM compras_detalle cd
           JOIN compras comp ON comp.id_compra = cd.id_compra
           WHERE comp.estado = 'RECIBIDA'
           GROUP BY cd.id_producto
       ) cpp ON cpp.id_producto = p.id_producto
       LEFT JOIN (
           SELECT id_producto, costo_unitario AS ultimo_costo
           FROM (
               SELECT cd.id_producto, cd.costo_unitario,
                      ROW_NUMBER() OVER (PARTITION BY cd.id_producto ORDER BY COALESCE(comp.fecha_recepcion, comp.fecha_compra) DESC, comp.id_compra DESC) AS rn
               FROM compras_detalle cd
               JOIN compras comp ON comp.id_compra = cd.id_compra
               WHERE comp.estado = 'RECIBIDA'
           ) t WHERE rn = 1
       ) ult_c ON ult_c.id_producto = p.id_producto
       ${whereClause}
       ORDER BY p.nombre ASC`,
      params
    );

    let suma_valor_total_costo = 0;
    let suma_valor_total_comercial = 0;
    let suma_unidades_bodega = 0;
    let skus_alerta_agotados = 0;

    const filasConValores = rawRows.map(row => {
      const stock = Number(row.stock_actual) || 0;
      const stock_min = Number(row.stock_minimo) || 0;
      const cpp = Number(row.costo_promedio) || 0;
      const precio = Number(row.precio_menudeo) || 0;
      const ultimoCosto = Number(row.ultimo_costo) || 0;

      const valor_total_costo = Number((stock * cpp).toFixed(2));
      const valor_total_comercial = Number((stock * precio).toFixed(2));
      const utilidad_potencial = Number((valor_total_comercial - valor_total_costo).toFixed(2));
      const margen_porcentaje = valor_total_comercial > 0
        ? Number(((utilidad_potencial / valor_total_comercial) * 100).toFixed(2))
        : 0;

      suma_valor_total_costo += valor_total_costo;
      suma_valor_total_comercial += valor_total_comercial;
      suma_unidades_bodega += stock;

      if (row.activo === 1 && stock <= stock_min) {
        skus_alerta_agotados += 1;
      }

      return {
        ...row,
        stock_actual: stock,
        stock_minimo: stock_min,
        costo_promedio: Number(cpp.toFixed(2)),
        ultimo_costo: Number(ultimoCosto.toFixed(2)),
        precio_menudeo: Number(precio.toFixed(2)),
        valor_total_costo,
        valor_total_comercial,
        utilidad_potencial,
        margen_porcentaje
      };
    });

    suma_valor_total_costo = Number(suma_valor_total_costo.toFixed(2));
    suma_valor_total_comercial = Number(suma_valor_total_comercial.toFixed(2));

    const filas = filasConValores.map(row => {
      const porcentaje_participacion = suma_valor_total_costo > 0
        ? Number(((row.valor_total_costo / suma_valor_total_costo) * 100).toFixed(2))
        : 0;
      return {
        ...row,
        porcentaje_participacion
      };
    });

    const margen_bruto_potencial = Number((suma_valor_total_comercial - suma_valor_total_costo).toFixed(2));
    const porcentaje_margen_global = suma_valor_total_comercial > 0
      ? Number(((margen_bruto_potencial / suma_valor_total_comercial) * 100).toFixed(2))
      : 0;

    const [categoriasLista] = await pool.execute('SELECT id_categoria, nombre FROM categorias ORDER BY nombre ASC');
    const [marcasLista] = await pool.execute('SELECT id_marca, nombre FROM marcas ORDER BY nombre ASC');

    return {
      filas,
      kpis: {
        valor_total_costo: suma_valor_total_costo,
        valor_total_comercial: suma_valor_total_comercial,
        margen_bruto_potencial,
        porcentaje_margen_global,
        skus_alerta_agotados,
        total_unidades_bodega: suma_unidades_bodega
      },
      metadatos: {
        categorias: categoriasLista,
        marcas: marcasLista
      }
    };
  }
}
