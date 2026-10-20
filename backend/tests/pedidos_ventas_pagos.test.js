import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/db/pool.js';

describe('Sprint 3: Pedidos, Estados, Aprobaciones de Descuento, Ventas, Pagos, Auditoría y Reportes', () => {
  let adminToken;
  let supervisorToken;
  let operadorToken;

  const timestamp = Date.now();
  let testClienteId;
  let testProductoId;
  let testSku;

  let pedidoEscalaId;
  let pedidoDescNormalId;
  let pedidoDescuentoEspecialId;
  let ventaPruebaId;
  let facturaPrueba;
  let totalVentaPrueba;

  beforeAll(async () => {
    // 1. Obtener tokens para Administrador, Supervisor y Operador
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

    // 2. Crear un cliente activo para las pruebas
    const resCli = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({
        nombre_razon_social: `Juguetes del Norte S.A. ${timestamp}`,
        identificacion: `NIT-${timestamp}`,
        telefono: '5555-1234',
        email: `cliente_${timestamp}@juguetesdelnorte.com`,
        direccion: 'Zona 1, Quetzaltenango'
      });
    expect(resCli.status).toBe(201);
    testClienteId = resCli.body.data.id_cliente;

    // 3. Crear un producto exclusivo con escalas de precio de 1 a 10000
    testSku = `SKU-SP3-${timestamp}`;
    const resProd = await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        codigo_sku: testSku,
        nombre: `Pista de Carreras Sprint 3 ${timestamp}`,
        descripcion: 'Producto para pruebas de pedidos y ventas',
        id_categoria: 1, // Vehículos
        id_marca: 1,     // Hot Wheels
        edad_minima_meses: 48,
        stock_minimo: 5,
        escalas: [
          { cantidad_minima: 1, precio_unitario: 100.00 },
          { cantidad_minima: 3, precio_unitario: 95.00 },
          { cantidad_minima: 6, precio_unitario: 80.00 },
          { cantidad_minima: 12, precio_unitario: 70.00 },
          { cantidad_minima: 25, precio_unitario: 65.00 },
          { cantidad_minima: 50, precio_unitario: 60.00 },
          { cantidad_minima: 100, precio_unitario: 55.00 },
          { cantidad_minima: 500, precio_unitario: 50.00 },
          { cantidad_minima: 1000, precio_unitario: 45.00 },
          { cantidad_minima: 10000, precio_unitario: 40.00 }
        ]
      });
    expect(resProd.status).toBe(201);
    testProductoId = resProd.body.data.id_producto;

    // 4. Crear un proveedor y abastecer stock inicial (50 unidades) vía compra recibida
    const resProv = await request(app)
      .post('/api/proveedores')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        identificacion_fiscal: `NIT-PRV-${timestamp}`,
        razon_social: `Importadora Central ${timestamp}`,
        contacto_nombre: 'Manuel Estrada',
        telefono: '2222-3333',
        email: `prov_${timestamp}@central.com`
      });
    expect(resProv.status).toBe(201);
    const testProvId = resProv.body.data.id_proveedor;

    const resCompra = await request(app)
      .post('/api/compras')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        numero_comprobante: `COMP-SP3-${timestamp}`,
        id_proveedor: testProvId,
        observaciones: 'Stock para pruebas de pedidos Sprint 3',
        detalles: [
          { id_producto: testProductoId, cantidad: 50, costo_unitario: 35.00 }
        ],
        recibir_inmediatamente: true
      });
    expect(resCompra.status).toBe(201);

    // Verificar stock inicial en BD (debe ser 50)
    const [invRows] = await pool.execute('SELECT stock_actual FROM inventario WHERE id_producto = ?', [testProductoId]);
    expect(invRows[0].stock_actual).toBe(50);
  });

  // ============================================================================
  // TEST 1: Crear un pedido con inventario suficiente y verificar escala mayoreo
  // ============================================================================
  it('1. Crea un pedido con inventario suficiente y aplica automáticamente escala de mayoreo', async () => {
    // Pedir 12 unidades (debe aplicar escala de 12 a Q70.00 c/u, subtotal = 12 * 70 = 840.00)
    const res = await request(app)
      .post('/api/pedidos')
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({
        id_cliente: testClienteId,
        observaciones: 'Pedido para validar escala de 12 unidades',
        detalles: [
          { id_producto: testProductoId, cantidad: 12, porcentaje_descuento_extra: 0 }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.data.id_pedido).toBeDefined();
    expect(res.body.data.estado).toBe('CREADO');
    expect(parseFloat(res.body.data.subtotal)).toBe(840.00);
    expect(parseFloat(res.body.data.total)).toBe(840.00);
    expect(res.body.data.detalles).toHaveLength(1);
    expect(parseFloat(res.body.data.detalles[0].precio_escala)).toBe(70.00);
    expect(res.body.data.detalles[0].id_escala_aplicada).toBeDefined();

    pedidoEscalaId = res.body.data.id_pedido;
  });

  // ============================================================================
  // TEST 2: Intentar crear o agregar detalle mayor al stock_actual (RN01)
  // ============================================================================
  it('2. Rechaza crear o actualizar pedido con cantidad mayor al inventario disponible (RN01)', async () => {
    // Stock actual es 50, intentamos pedir 150 unidades
    const resExceso = await request(app)
      .post('/api/pedidos')
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({
        id_cliente: testClienteId,
        observaciones: 'Intento de pedir más del stock existente',
        detalles: [
          { id_producto: testProductoId, cantidad: 150, porcentaje_descuento_extra: 0 }
        ]
      });

    expect(resExceso.status).toBe(409);
    expect(resExceso.body.error.code).toBe('BUSINESS_RULE_VIOLATION');
    expect(resExceso.body.error.message).toContain('Inventario insuficiente');
  });

  // ============================================================================
  // TEST 3: Enviar pedido con descuento <= 10% pasa directo a APROBADO
  // ============================================================================
  it('3. Enviar un pedido con descuento extra <= 10% pasa directamente a estado APROBADO', async () => {
    // Pedir 6 unidades (escala Q80.00) con 5% de descuento extra
    // Subtotal: 6 * 80 = 480.00. Descuento 5%: 24.00. Total: 456.00
    const resCrear = await request(app)
      .post('/api/pedidos')
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({
        id_cliente: testClienteId,
        observaciones: 'Pedido con 5% de descuento normal',
        detalles: [
          { id_producto: testProductoId, cantidad: 6, porcentaje_descuento_extra: 5 }
        ]
      });
    expect(resCrear.status).toBe(201);
    pedidoDescNormalId = resCrear.body.data.id_pedido;

    // Enviar pedido
    const resEnviar = await request(app)
      .patch(`/api/pedidos/${pedidoDescNormalId}/enviar`)
      .set('Authorization', `Bearer ${operadorToken}`);

    expect(resEnviar.status).toBe(200);
    expect(resEnviar.body.data.estado).toBe('APROBADO');
    expect(resEnviar.body.data.requiere_autorizacion).toBe(0);
    expect(parseFloat(resEnviar.body.data.total)).toBe(456.00);
  });

  // ============================================================================
  // TEST 4: Enviar pedido con descuento > 10% queda PENDIENTE_APROBACION (RN07)
  // ============================================================================
  it('4. Enviar un pedido con descuento extra > 10% queda retenido en PENDIENTE_APROBACION (RN07)', async () => {
    // Pedir 6 unidades (Q80.00) con 15% de descuento extra (> 10%)
    const resCrear = await request(app)
      .post('/api/pedidos')
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({
        id_cliente: testClienteId,
        observaciones: 'Pedido con 15% de descuento especial',
        detalles: [
          { id_producto: testProductoId, cantidad: 6, porcentaje_descuento_extra: 15 }
        ]
      });
    expect(resCrear.status).toBe(201);
    pedidoDescuentoEspecialId = resCrear.body.data.id_pedido;

    // Enviar pedido
    const resEnviar = await request(app)
      .patch(`/api/pedidos/${pedidoDescuentoEspecialId}/enviar`)
      .set('Authorization', `Bearer ${operadorToken}`);

    expect(resEnviar.status).toBe(200);
    expect(resEnviar.body.data.estado).toBe('PENDIENTE_APROBACION');
    expect(resEnviar.body.data.requiere_autorizacion).toBe(1);
  });

  // ============================================================================
  // TEST 5: Operador no puede autorizar (403), Supervisor sí puede autorizar
  // ============================================================================
  it('5. Operador recibe 403 al intentar autorizar descuento; Supervisor autoriza exitosamente', async () => {
    // Operador intenta autorizar
    const resOp = await request(app)
      .patch(`/api/pedidos/${pedidoDescuentoEspecialId}/autorizar`)
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({ motivo_descuento_especial: 'Operador intentando auto-autorizarse' });

    expect(resOp.status).toBe(403);
    expect(resOp.body.error.code).toBe('FORBIDDEN');

    // Supervisor autoriza
    const resSup = await request(app)
      .patch(`/api/pedidos/${pedidoDescuentoEspecialId}/autorizar`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ motivo_descuento_especial: 'Autorizado por ser cliente frecuente de volumen' });

    expect(resSup.status).toBe(200);
    expect(resSup.body.data.estado).toBe('APROBADO');
    expect(resSup.body.data.motivo_descuento_especial).toBe('Autorizado por ser cliente frecuente de volumen');
    expect(resSup.body.data.supervisor_nombre).toBeDefined();
  });

  // ============================================================================
  // TEST 6: Bloqueo de facturación a pedidos no aprobados (PENDIENTE_APROBACION o CANCELADO)
  // ============================================================================
  it('6. Bloquea facturar un pedido que no esté APROBADO (PENDIENTE_APROBACION o CANCELADO)', async () => {
    // 6a. Crear pedido con 20% y enviarlo -> queda en PENDIENTE_APROBACION
    const resPend = await request(app)
      .post('/api/pedidos')
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({
        id_cliente: testClienteId,
        enviar_inmediatamente: true,
        detalles: [{ id_producto: testProductoId, cantidad: 3, porcentaje_descuento_extra: 20 }]
      });
    expect(resPend.status).toBe(201);
    expect(resPend.body.data.estado).toBe('PENDIENTE_APROBACION');

    const resFacturaPend = await request(app)
      .post('/api/ventas')
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({ id_pedido: resPend.body.data.id_pedido });

    expect(resFacturaPend.status).toBe(409);
    expect(resFacturaPend.body.error.code).toBe('BUSINESS_RULE_VIOLATION');
    expect(resFacturaPend.body.error.message).toContain('Solo un pedido APROBADO puede facturarse');

    // 6b. Crear pedido y cancelarlo
    const resCanc = await request(app)
      .post('/api/pedidos')
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({
        id_cliente: testClienteId,
        detalles: [{ id_producto: testProductoId, cantidad: 1, porcentaje_descuento_extra: 0 }]
      });
    const cancelId = resCanc.body.data.id_pedido;

    const resCancelOp = await request(app)
      .patch(`/api/pedidos/${cancelId}/cancelar`)
      .set('Authorization', `Bearer ${operadorToken}`);
    expect(resCancelOp.status).toBe(200);
    expect(resCancelOp.body.data.estado).toBe('CANCELADO');

    const resFacturaCanc = await request(app)
      .post('/api/ventas')
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({ id_pedido: cancelId });

    expect(resFacturaCanc.status).toBe(409);
    expect(resFacturaCanc.body.error.message).toContain('Un pedido CANCELADO no puede facturarse');
  });

  // ============================================================================
  // TEST 7: Generar venta desde pedido APROBADO pasa pedido a EN_PROCESO
  // ============================================================================
  it('7. Genera venta desde pedido APROBADO, copia detalles y transiciona pedido a EN_PROCESO', async () => {
    // Usamos el pedido aprobado en Test 3 (pedidoDescNormalId)
    const resVenta = await request(app)
      .post('/api/ventas')
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({ id_pedido: pedidoDescNormalId });

    expect(resVenta.status).toBe(201);
    expect(resVenta.body.data.id_venta).toBeDefined();
    expect(resVenta.body.data.estado).toBe('PENDIENTE');
    expect(parseFloat(resVenta.body.data.saldo_pendiente)).toBe(456.00);
    expect(parseFloat(resVenta.body.data.total)).toBe(456.00);
    expect(resVenta.body.data.detalles).toHaveLength(1);
    expect(resVenta.body.data.detalles[0].id_producto).toBe(testProductoId);

    ventaPruebaId = resVenta.body.data.id_venta;
    facturaPrueba = resVenta.body.data.numero_factura;
    totalVentaPrueba = parseFloat(resVenta.body.data.total);

    // Verificar que el pedido pasó a estado EN_PROCESO
    const resPedido = await request(app)
      .get(`/api/pedidos/${pedidoDescNormalId}`)
      .set('Authorization', `Bearer ${operadorToken}`);

    expect(resPedido.body.data.estado).toBe('EN_PROCESO');
  });

  // ============================================================================
  // TEST 8: Rechazar pago mayor al saldo_pendiente (RN09)
  // ============================================================================
  it('8. Rechaza registrar un pago mayor al saldo_pendiente de la venta (RN09)', async () => {
    // Saldo pendiente es 456.00, intentamos pagar 500.00
    const resSobrepago = await request(app)
      .post('/api/pagos')
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({
        id_venta: ventaPruebaId,
        monto: 500.00,
        metodo_pago: 'EFECTIVO'
      });

    expect(resSobrepago.status).toBe(409);
    expect(resSobrepago.body.error.code).toBe('BUSINESS_RULE_VIOLATION');
    expect(resSobrepago.body.error.message).toContain('El pago no puede ser mayor al saldo pendiente');
  });

  // ============================================================================
  // TEST 9: Pagos parcial y total: venta COMPLETADA, pedido COMPLETADO y salida kardex (RN03)
  // ============================================================================
  it('9. Pago parcial mantiene venta PENDIENTE y stock intacto; pago restante liquida y descuenta inventario (RN03)', async () => {
    // Verificar stock previo (50 unidades)
    const [invPrev] = await pool.execute('SELECT stock_actual FROM inventario WHERE id_producto = ?', [testProductoId]);
    expect(invPrev[0].stock_actual).toBe(50);

    // 1. Pago parcial: Q200.00
    const resPago1 = await request(app)
      .post('/api/pagos')
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({
        id_venta: ventaPruebaId,
        monto: 200.00,
        metodo_pago: 'TRANSFERENCIA',
        referencia_pago: 'TRANSF-001'
      });

    expect(resPago1.status).toBe(201);
    expect(parseFloat(resPago1.body.data.pago.monto)).toBe(200.00);
    expect(resPago1.body.data.venta.estado).toBe('PENDIENTE');
    expect(parseFloat(resPago1.body.data.venta.saldo_pendiente)).toBe(256.00);

    // Stock sigue intacto (50)
    const [invMedio] = await pool.execute('SELECT stock_actual FROM inventario WHERE id_producto = ?', [testProductoId]);
    expect(invMedio[0].stock_actual).toBe(50);

    // 2. Pago final del saldo restante: Q256.00
    const resPago2 = await request(app)
      .post('/api/pagos')
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({
        id_venta: ventaPruebaId,
        monto: 256.00,
        metodo_pago: 'EFECTIVO'
      });

    expect(resPago2.status).toBe(201);
    expect(resPago2.body.data.venta.estado).toBe('COMPLETADA');
    expect(parseFloat(resPago2.body.data.venta.saldo_pendiente)).toBe(0.00);

    // Verificar que el pedido pasó a COMPLETADO
    const resPed = await request(app)
      .get(`/api/pedidos/${pedidoDescNormalId}`)
      .set('Authorization', `Bearer ${operadorToken}`);
    expect(resPed.body.data.estado).toBe('COMPLETADO');

    // Verificar que el stock disminuyó en 6 unidades (50 - 6 = 44) (RN03)
    const [invFinal] = await pool.execute('SELECT stock_actual FROM inventario WHERE id_producto = ?', [testProductoId]);
    expect(invFinal[0].stock_actual).toBe(44);

    // Verificar movimiento de salida en inventario
    const [movs] = await pool.execute(
      `SELECT * FROM movimientos_inventario
       WHERE documento_id = ? AND tipo_movimiento = 'SALIDA'`,
      [facturaPrueba]
    );
    expect(movs).toHaveLength(1);
    expect(movs[0].cantidad).toBe(6);
    expect(movs[0].documento_tipo).toBe('VENTA');
  });

  // ============================================================================
  // TEST 10: Inmutabilidad de venta COMPLETADA (RN08)
  // ============================================================================
  it('10. Impide modificar o anular una venta COMPLETADA por principio de inmutabilidad (RN08)', async () => {
    // Intentar anular la venta completada
    const resAnular = await request(app)
      .patch(`/api/ventas/${ventaPruebaId}/anular`)
      .set('Authorization', `Bearer ${operadorToken}`);

    expect(resAnular.status).toBe(409);
    expect(resAnular.body.error.code).toBe('BUSINESS_RULE_VIOLATION');
    expect(resAnular.body.error.message).toContain('Una venta finalizada no puede modificarse');
  });

  // ============================================================================
  // TEST 11: Auditoría inmutable y reporte de ventas
  // ============================================================================
  it('11. Consulta auditoría y reporte de ventas, verificando registros de bitácora e inmutabilidad', async () => {
    // 11a. Consultar bitácora de auditoría como Administrador
    const resAud = await request(app)
      .get('/api/auditoria')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(resAud.status).toBe(200);
    expect(resAud.body.data.length).toBeGreaterThan(0);
    expect(resAud.body.meta.modulos).toBeDefined();
    expect(resAud.body.meta.modulos).toContain('Pedidos');
    expect(resAud.body.meta.modulos).toContain('Ventas');
    expect(resAud.body.meta.modulos).toContain('Pagos');

    // 11b. Consultar reporte de ventas
    const resRep = await request(app)
      .get('/api/reportes/ventas')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(resRep.status).toBe(200);
    expect(resRep.body.data.filas.length).toBeGreaterThan(0);
    expect(resRep.body.data.resumen.total_ventas).toBeGreaterThan(0);
    expect(resRep.body.data.resumen.conteo_por_estado.COMPLETADA).toBeGreaterThanOrEqual(1);

    // 11c. Consultar reporte de inventario crítico y dashboard
    const resCritico = await request(app)
      .get('/api/reportes/inventario-critico')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resCritico.status).toBe(200);
    expect(resCritico.body.data.stock_bajo).toBeDefined();

    const resDash = await request(app)
      .get('/api/reportes/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resDash.status).toBe(200);
    expect(resDash.body.data.indicadores).toBeDefined();

    // 11d. Prohibición de editar o borrar la auditoría (triggers trg_auditoria_bu y trg_auditoria_bd)
    await expect(
      pool.execute("UPDATE auditoria SET modulo = 'HACK' WHERE id_auditoria = 1")
    ).rejects.toThrow(/La auditoria no puede modificarse/);

    await expect(
      pool.execute('DELETE FROM auditoria WHERE id_auditoria = 1')
    ).rejects.toThrow(/La auditoria no puede eliminarse/);
  });
});
