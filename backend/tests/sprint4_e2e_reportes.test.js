import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/db/pool.js';

describe('Sprint 4: Suite de Pruebas E2E - Dashboard, Reportes Financieros/Operativos y Configuraciones del Negocio', () => {
  let adminToken;
  let supervisorToken;
  let operadorToken;

  const timestamp = Date.now();
  let testClienteId;
  let testProveedorId;
  let testProductoId;
  let testSku;

  beforeAll(async () => {
    // 1. Iniciar sesión con los 3 roles del sistema
    const loginAdmin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@jugueteria.local', password: 'Admin1234!' });
    adminToken = loginAdmin.body.data.token;

    const loginSup = await request(app)
      .post('/api/auth/login')
      .send({ email: 'supervisor@jugueteria.local', password: 'Admin1234!' });
    supervisorToken = loginSup.body.data.token;

    const loginOp = await request(app)
      .post('/api/auth/login')
      .send({ email: 'operador@jugueteria.local', password: 'Admin1234!' });
    operadorToken = loginOp.body.data.token;

    // 2. Crear Cliente de prueba
    const resCli = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({
        nombre_razon_social: `Cliente Sprint 4 ${timestamp}`,
        identificacion: `NIT-${timestamp}`,
        telefono: '5555-4444',
        email: `cliente_s4_${timestamp}@quetzal.com`,
        direccion: 'Ciudad de Guatemala, Zona 10'
      });
    expect(resCli.status).toBe(201);
    testClienteId = resCli.body.data.id_cliente;

    // 3. Crear Proveedor de prueba
    const resProv = await request(app)
      .post('/api/proveedores')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        razon_social: `Distribuidora Juguetes Global ${timestamp}`,
        identificacion_fiscal: `NIT-PROV-${timestamp}`,
        contacto_nombre: 'Carlos Gerente',
        telefono: '+502 2222-3333',
        email: `prov_${timestamp}@global.com`,
        direccion: 'Carretera a El Salvador km 14'
      });
    expect(resProv.status).toBe(201);
    testProveedorId = resProv.body.data.id_proveedor;

    // 4. Crear Producto de prueba con stock inicial 0 y escala menudeo
    testSku = `SKU-S4-${timestamp}`;
    const resProd = await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        codigo_sku: testSku,
        nombre: `Pista de Carreras Quetzal Turbo ${timestamp}`,
        id_categoria: 1, // Vehículos
        id_marca: 1,
        edad_minima_meses: 36,
        stock_minimo: 10,
        escalas: [
          { cantidad_minima: 1, precio_unitario: 150.00 },
          { cantidad_minima: 12, precio_unitario: 120.00 }
        ]
      });
    expect(resProd.status).toBe(201);
    testProductoId = resProd.body.data.id_producto;
  });

  // PRUEBA 1: Consulta y modificación del parámetro DESCUENTO_MAX_SIN_AUTORIZACION
  it('1. Consulta y modifica parámetro DESCUENTO_MAX_SIN_AUTORIZACION con validación de rol (RN07) y auditoría automática (trg_config_au)', async () => {
    // 1a. Listar parámetros autenticado
    const resList = await request(app)
      .get('/api/configuraciones')
      .set('Authorization', `Bearer ${operadorToken}`);
    expect(resList.status).toBe(200);
    expect(Array.isArray(resList.body.data)).toBe(true);

    // 1b. Operador intenta modificar y recibe 403 Forbidden
    const resOp = await request(app)
      .put('/api/configuraciones/DESCUENTO_MAX_SIN_AUTORIZACION')
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({ valor: '15.00' });
    expect(resOp.status).toBe(403);

    // 1c. Administrador intenta valor inválido fuera de 0-100 y recibe 400 Bad Request
    const resInvalid = await request(app)
      .put('/api/configuraciones/DESCUENTO_MAX_SIN_AUTORIZACION')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ valor: '125.00' });
    expect(resInvalid.status).toBe(400);

    // 1d. Administrador actualiza exitosamente a 12.00%
    const resAdmin = await request(app)
      .put('/api/configuraciones/DESCUENTO_MAX_SIN_AUTORIZACION')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ valor: '12.00' });
    expect(resAdmin.status).toBe(200);
    expect(resAdmin.body.data.valor).toBe('12.00');

    // 1e. Verificar que el trigger trg_config_au registró el cambio en auditoria
    const [auditRows] = await pool.execute(
      `SELECT modulo, accion, id_registro, detalle_anterior, detalle_nuevo
       FROM auditoria
       WHERE modulo = 'Configuración' AND id_registro = 'DESCUENTO_MAX_SIN_AUTORIZACION'
       ORDER BY id_auditoria DESC LIMIT 1`
    );
    expect(auditRows.length).toBe(1);
    expect(auditRows[0].accion).toBe('Modificación');

    // 1f. Restaurar a 10.00%
    await request(app)
      .put('/api/configuraciones/DESCUENTO_MAX_SIN_AUTORIZACION')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ valor: '10.00' });
  });

  // PRUEBA 2: Flujo E2E Completo de Defensa
  it('2. Flujo E2E Completo de Defensa: Compra recibida (+stock) -> Pedido con descuento retenido -> Autorización Supervisor -> Facturación -> Pago total (-stock y cierre) -> Auditoría', async () => {
    // 2a. Registrar orden de compra de 40 unidades a Q 80.00 cada una
    const resCompra = await request(app)
      .post('/api/compras')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        numero_comprobante: `COMP-S4-${timestamp}`,
        id_proveedor: testProveedorId,
        observaciones: 'Abastecimiento para defensa final Sprint 4',
        detalles: [
          {
            id_producto: testProductoId,
            cantidad: 40,
            costo_unitario: 80.00
          }
        ]
      });
    expect(resCompra.status).toBe(201);
    const idCompra = resCompra.body.data.id_compra;

    // 2b. Recibir mercadería (compras.recibir): sube automáticamente el stock a 40
    const resRecibir = await request(app)
      .put(`/api/compras/${idCompra}/recibir`)
      .set('Authorization', `Bearer ${supervisorToken}`);
    expect(resRecibir.status).toBe(200);

    const [stockCheck1] = await pool.execute(
      'SELECT stock_actual FROM inventario WHERE id_producto = ?',
      [testProductoId]
    );
    expect(stockCheck1[0].stock_actual).toBe(40);

    // 2c. Operador crea Pedido de 15 unidades con 14% de descuento extra (> 10% RN07)
    const resPedido = await request(app)
      .post('/api/pedidos')
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({
        id_cliente: testClienteId,
        observaciones: 'Pedido para cliente mayorista con descuento especial',
        motivo_descuento_especial: 'Promoción especial aprobada por gerencia de ventas',
        detalles: [
          {
            id_producto: testProductoId,
            cantidad: 15,
            porcentaje_descuento_extra: 14.00
          }
        ]
      });
    expect(resPedido.status).toBe(201);
    const idPedido = resPedido.body.data.id_pedido;

    // 2d. Enviar pedido: requiere_autorizacion = true y estado pasa a PENDIENTE_APROBACION
    const resEnviar = await request(app)
      .put(`/api/pedidos/${idPedido}/enviar`)
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({ motivo_descuento_especial: 'Promoción especial aprobada por gerencia de ventas' });
    expect(resEnviar.status).toBe(200);
    expect(resEnviar.body.data.estado).toBe('PENDIENTE_APROBACION');

    // 2e. Supervisor autoriza el pedido
    const resAuth = await request(app)
      .put(`/api/pedidos/${idPedido}/autorizar`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ motivo_descuento_especial: 'Autorizado para cierre de mes' });
    expect(resAuth.status).toBe(200);
    expect(resAuth.body.data.estado).toBe('APROBADO');

    // 2f. Facturar venta desde pedido aprobado
    const resVenta = await request(app)
      .post('/api/ventas')
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({
        id_pedido: idPedido,
        numero_factura: `FAC-S4-${timestamp}`,
        observaciones: 'Factura emitida para defensa final'
      });
    expect(resVenta.status).toBe(201);
    const idVenta = resVenta.body.data.id_venta;
    const totalVenta = parseFloat(resVenta.body.data.total);

    // 2g. Registrar Pago Total: Liquida saldo y reduce automáticamente inventario (40 - 15 = 25)
    const resPago = await request(app)
      .post('/api/pagos')
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({
        id_venta: idVenta,
        monto: totalVenta,
        metodo_pago: 'EFECTIVO'
      });
    expect(resPago.status).toBe(201);
    expect(resPago.body.data.venta.estado).toBe('COMPLETADA');
    expect(parseFloat(resPago.body.data.venta.saldo_pendiente)).toBe(0);

    const [stockCheck2] = await pool.execute(
      'SELECT stock_actual FROM inventario WHERE id_producto = ?',
      [testProductoId]
    );
    expect(stockCheck2[0].stock_actual).toBe(25);

    // 2h. Verificar que en la bitácora de auditoría existen registros de este ciclo
    const numComprobante = `COMP-S4-${timestamp}`;
    const numFactura = `FAC-S4-${timestamp}`;
    const numPedido = resPedido.body.data.numero_pedido;

    const [auditCiclo] = await pool.execute(
      `SELECT modulo, accion, id_registro FROM auditoria
       WHERE id_registro IN (?, ?, ?)`,
      [numComprobante, numPedido, numFactura]
    );
    expect(auditCiclo.length).toBeGreaterThan(0);
  });

  // PRUEBA 3: Verificación de GET /api/reportes/dashboard
  it('3. GET /api/reportes/dashboard devuelve los 6 indicadores de negocio, series de gráficas y listas de acción', async () => {
    const res = await request(app)
      .get('/api/reportes/dashboard')
      .set('Authorization', `Bearer ${operadorToken}`);

    expect(res.status).toBe(200);
    const d = res.body.data;

    // 6 indicadores
    expect(d.indicadores).toBeDefined();
    expect(d.indicadores.ventas_del_mes).toBeDefined();
    expect(d.indicadores.compras_del_mes).toBeDefined();
    expect(d.indicadores.pedidos_pendientes_aprobacion).toBeDefined();
    expect(d.indicadores.productos_en_alerta).toBeDefined();
    expect(d.indicadores.por_cobrar).toBeDefined();
    expect(d.indicadores.clientes_activos).toBeDefined();

    // Series de gráficas
    expect(Array.isArray(d.ventas_por_mes)).toBe(true);
    expect(Array.isArray(d.top_productos)).toBe(true);
    expect(Array.isArray(d.pedidos_por_estado)).toBe(true);

    // Listas para paneles de acción
    expect(Array.isArray(d.alertas_stock)).toBe(true);
    expect(Array.isArray(d.pedidos_pendientes)).toBe(true);
  });

  // PRUEBA 4: Verificación del Informe 1 (Kardex) y Informe 2 (Valoración CPP)
  it('4. Informe 1 (Kardex Físico) y Informe 2 (Valoración de Inventario CPP) calculan costo ponderado y utilidad potencial', async () => {
    // Kardex
    const resKardex = await request(app)
      .get('/api/reportes/kardex')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .query({ id_producto: testProductoId });

    expect(resKardex.status).toBe(200);
    expect(resKardex.body.data.filas).toBeDefined();
    expect(resKardex.body.data.kpis).toBeDefined();
    expect(resKardex.body.data.kpis.total_entradas).toBeGreaterThanOrEqual(40);
    expect(resKardex.body.data.kpis.total_salidas).toBeGreaterThanOrEqual(15);
    expect(resKardex.body.data.kpis.variacion_neta).toBe(
      resKardex.body.data.kpis.total_entradas - resKardex.body.data.kpis.total_salidas
    );

    // Valoración de Inventario (CPP)
    const resVal = await request(app)
      .get('/api/reportes/valoracion')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .query({ q: testSku });

    expect(resVal.status).toBe(200);
    expect(resVal.body.data.filas).toBeDefined();
    const prodVal = resVal.body.data.filas.find((f) => f.codigo_sku === testSku);
    expect(prodVal).toBeDefined();
    expect(prodVal.costo_promedio).toBe(80.00); // CPP de la compra recibida a Q 80
    expect(prodVal.precio_menudeo).toBe(150.00);
    expect(prodVal.valor_total_costo).toBe(25 * 80.00); // 2000.00
    expect(prodVal.valor_total_comercial).toBe(25 * 150.00); // 3750.00
    expect(prodVal.utilidad_potencial).toBe(3750.00 - 2000.00); // 1750.00
    expect(resVal.body.data.kpis.valor_total_costo).toBeGreaterThan(0);
  });

  // PRUEBA 5: Verificación del Informe 3 (Ventas) y Informe 4 (Compras)
  it('5. Informe 3 (Ventas y Cobranza) e Informe 4 (Compras y Abastecimiento) filtran por fechas y devuelven 4 KPIs normalizados', async () => {
    const hoy = new Date().toISOString().slice(0, 10);

    // Informe 3: Ventas
    const resVentas = await request(app)
      .get('/api/reportes/ventas')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ fecha_inicio: hoy, fecha_fin: hoy });

    expect(resVentas.status).toBe(200);
    expect(Array.isArray(resVentas.body.data.filas)).toBe(true);
    expect(resVentas.body.data.kpis).toBeDefined();
    expect(resVentas.body.data.kpis.total_facturado_completadas).toBeGreaterThanOrEqual(0);
    expect(resVentas.body.data.kpis.total_descuentos).toBeDefined();
    expect(resVentas.body.data.kpis.total_saldo_pendiente).toBeDefined();
    expect(resVentas.body.data.kpis.total_facturas).toBe(resVentas.body.data.filas.length);

    // Informe 4: Compras
    const resCompras = await request(app)
      .get('/api/reportes/compras')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ fecha_inicio: hoy, fecha_fin: hoy });

    expect(resCompras.status).toBe(200);
    expect(Array.isArray(resCompras.body.data.filas)).toBe(true);
    expect(resCompras.body.data.kpis).toBeDefined();
    expect(resCompras.body.data.kpis.monto_recibidas).toBeGreaterThanOrEqual(0);
    expect(resCompras.body.data.kpis.compras_pendientes).toBeDefined();
    expect(resCompras.body.data.kpis.ordenes_anuladas).toBeDefined();
    expect(resCompras.body.data.kpis.total_documentos).toBe(resCompras.body.data.filas.length);
  });

  // PRUEBA 6: Exportación de datos y consistencia de totales contables
  it('6. Validación de consistencia contable: coincidencia de totales de detalle con totales de cabecera en ventas y compras', async () => {
    // Comprobar que en compras recibidas la suma de subtotales coincide con el total de cabecera
    const [checkCompras] = await pool.execute(`
      SELECT c.id_compra, c.total, COALESCE(SUM(cd.subtotal), 0) AS suma_detalles
      FROM compras c
      JOIN compras_detalle cd ON cd.id_compra = c.id_compra
      WHERE c.estado = 'RECIBIDA'
      GROUP BY c.id_compra, c.total
      HAVING ABS(c.total - suma_detalles) > 0.05
    `);
    expect(checkCompras.length).toBe(0);

    // Comprobar que en ventas completadas el saldo_pendiente es estrictamente 0
    const [checkVentas] = await pool.execute(`
      SELECT id_venta, saldo_pendiente
      FROM ventas
      WHERE estado = 'COMPLETADA' AND saldo_pendiente > 0
    `);
    expect(checkVentas.length).toBe(0);
  });
});
