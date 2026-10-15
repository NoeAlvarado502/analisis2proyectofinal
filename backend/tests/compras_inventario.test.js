import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/db/pool.js';

describe('Sprint 2: Proveedores, Compras, Recepción, Inventario, Movimientos y Alertas', () => {
  let adminToken;
  let supervisorToken;
  let operadorToken;

  const timestamp = Date.now();
  let testProveedorId;
  let testProductoId;
  let testCompraId;
  let testCompraComprobante;

  beforeAll(async () => {
    // 1. Obtener tokens para diferentes roles
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

    // 2. Crear un producto de prueba exclusivo con stock inicial 0
    const prodRes = await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        codigo_sku: `SPRINT2-${timestamp}`,
        nombre: `Juguete Robot Sprint 2 ${timestamp}`,
        descripcion: 'Producto para pruebas de compras e inventario',
        id_categoria: 1, // Vehículos
        id_marca: 1,     // Hot Wheels
        edad_minima_meses: 36,
        advertencias: 'Piezas pequeñas',
        stock_minimo: 10,
        escalas: [
          { cantidad_minima: 1, precio_unitario: 100.00 },
          { cantidad_minima: 3, precio_unitario: 95.00 },
          { cantidad_minima: 6, precio_unitario: 90.00 },
          { cantidad_minima: 12, precio_unitario: 85.00 },
          { cantidad_minima: 25, precio_unitario: 80.00 },
          { cantidad_minima: 50, precio_unitario: 75.00 },
          { cantidad_minima: 100, precio_unitario: 70.00 },
          { cantidad_minima: 500, precio_unitario: 65.00 },
          { cantidad_minima: 1000, precio_unitario: 60.00 },
          { cantidad_minima: 10000, precio_unitario: 50.00 }
        ]
      });

    expect(prodRes.status).toBe(201);
    testProductoId = prodRes.body.data.id_producto;
  });

  // ============================================================================
  // CASO 1: Crear un proveedor y validar rechazo de NIT duplicado
  // ============================================================================
  it('1. Permite crear un proveedor y rechaza NIT duplicado con error 409', async () => {
    const nitUnico = `NIT-${timestamp}`;

    const resCrear = await request(app)
      .post('/api/proveedores')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        identificacion_fiscal: nitUnico,
        razon_social: `Distribuidora Juguetes GT ${timestamp}`,
        contacto_nombre: 'Carlos López',
        telefono: '5555-4321',
        email: `proveedor_${timestamp}@juguetes.com`,
        direccion: 'Zona 10, Ciudad de Guatemala'
      });

    expect(resCrear.status).toBe(201);
    expect(resCrear.body.data.id_proveedor).toBeDefined();
    expect(resCrear.body.data.identificacion_fiscal).toBe(nitUnico);
    expect(resCrear.body.data.activo).toBe(1);
    testProveedorId = resCrear.body.data.id_proveedor;

    // Intentar crear nuevamente con el mismo NIT
    const resDuplicado = await request(app)
      .post('/api/proveedores')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        identificacion_fiscal: nitUnico,
        razon_social: 'Empresa Clon Duplicada S.A.',
        contacto_nombre: 'Pedro Duplicado',
        telefono: '1111-2222',
        email: 'clon@empresa.com'
      });

    expect(resDuplicado.status).toBe(409);
    expect(resDuplicado.body.error.code).toBe('DUPLICATE_ENTRY');
    expect(resDuplicado.body.error.message).toContain('identificación');
  });

  // ============================================================================
  // CASO 2: Registrar una compra en estado REGISTRADA y verificar que el stock no sube
  // ============================================================================
  it('2. Registra compra en estado REGISTRADA con detalle y verifica que el stock no aumenta aún', async () => {
    // Consultar stock antes de la compra
    const invAntes = await request(app)
      .get('/api/inventario')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .query({ q: `SPRINT2-${timestamp}` });

    expect(invAntes.status).toBe(200);
    const stockAntes = invAntes.body.data[0].stock_actual;
    expect(stockAntes).toBe(0);

    // Sugerir comprobante
    const resSugerencia = await request(app)
      .get('/api/compras/sugerir-comprobante')
      .set('Authorization', `Bearer ${supervisorToken}`);
    expect(resSugerencia.status).toBe(200);
    expect(resSugerencia.body.data.sugerencia).toMatch(/^COMP-\d+$/);

    testCompraComprobante = `COMP-TST-${timestamp}`;

    const resCompra = await request(app)
      .post('/api/compras')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        numero_comprobante: testCompraComprobante,
        id_proveedor: testProveedorId,
        observaciones: 'Compra de prueba Sprint 2',
        detalles: [
          {
            id_producto: testProductoId,
            cantidad: 50,
            costo_unitario: 35.00
          }
        ]
      });

    expect(resCompra.status).toBe(201);
    expect(resCompra.body.data.estado).toBe('REGISTRADA');
    expect(Number(resCompra.body.data.total)).toBe(1750.00);
    expect(resCompra.body.data.detalles).toHaveLength(1);
    expect(resCompra.body.data.detalles[0].cantidad).toBe(50);
    testCompraId = resCompra.body.data.id_compra;

    // El stock no debe haber cambiado
    const invDespues = await request(app)
      .get('/api/inventario')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .query({ q: `SPRINT2-${timestamp}` });

    expect(invDespues.status).toBe(200);
    expect(invDespues.body.data[0].stock_actual).toBe(0);
  });

  // ============================================================================
  // CASO 3: Recibir la compra y comprobar que stock_actual aumenta y genera ENTRADA (RN02)
  // ============================================================================
  it('3. Recibe la compra, aumenta inventario.stock_actual y registra ENTRADA en kardex (RN02)', async () => {
    const resRecibir = await request(app)
      .patch(`/api/compras/${testCompraId}/recibir`)
      .set('Authorization', `Bearer ${supervisorToken}`);

    expect(resRecibir.status).toBe(200);
    expect(resRecibir.body.data.estado).toBe('RECIBIDA');
    expect(resRecibir.body.data.id_usuario_recepcion).toBeDefined();

    // Comprobar que el inventario aumentó en 50 unidades
    const invRecibido = await request(app)
      .get('/api/inventario')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .query({ q: `SPRINT2-${timestamp}` });

    expect(invRecibido.status).toBe(200);
    expect(invRecibido.body.data[0].stock_actual).toBe(50);

    // Comprobar kardex (movimientos_inventario)
    const resKardex = await request(app)
      .get('/api/inventario/movimientos')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .query({ id_producto: testProductoId, tipo_movimiento: 'ENTRADA' });

    expect(resKardex.status).toBe(200);
    expect(resKardex.body.data.length).toBeGreaterThan(0);
    const mov = resKardex.body.data.find(m => m.documento_id === testCompraComprobante);
    expect(mov).toBeDefined();
    expect(mov.tipo_movimiento).toBe('ENTRADA');
    expect(mov.cantidad).toBe(50);
    expect(mov.documento_tipo).toBe('COMPRA');
  });

  // ============================================================================
  // CASO 4: Bloquear modificación o segunda recepción en compra ya RECIBIDA
  // ============================================================================
  it('4. Bloquea modificación y re-recepción de una compra ya RECIBIDA (409 Conflict)', async () => {
    // Intentar modificar compra RECIBIDA
    const resModificar = await request(app)
      .put(`/api/compras/${testCompraId}`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        observaciones: 'Intento de modificación ilegal',
        detalles: [{ id_producto: testProductoId, cantidad: 10, costo_unitario: 20 }]
      });

    expect(resModificar.status).toBe(409);
    expect(resModificar.body.error.message).toContain('RECIBIDA');

    // Intentar volver a recibir compra RECIBIDA
    const resReRecibir = await request(app)
      .patch(`/api/compras/${testCompraId}/recibir`)
      .set('Authorization', `Bearer ${supervisorToken}`);

    expect(resReRecibir.status).toBe(409);
    expect(resReRecibir.body.error.message).toContain('RECIBIDA');
  });

  // ============================================================================
  // CASO 5: Alerta automática cuando stock <= stock_minimo (RN10) y paso a ATENDIDA
  // ============================================================================
  it('5. Genera alerta en alertas_inventario cuando stock <= stock_minimo y pasa a ATENDIDA al surtir (RN10)', async () => {
    const timeAlert = Date.now();

    // 1. Crear producto con stock 0 y stock_minimo 15
    const resProdAlerta = await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        codigo_sku: `ALERTA-${timeAlert}`,
        nombre: `Juguete Alerta ${timeAlert}`,
        id_categoria: 2,
        id_marca: 2,
        stock_minimo: 15,
        escalas: [
          { cantidad_minima: 1, precio_unitario: 50 },
          { cantidad_minima: 3, precio_unitario: 45 },
          { cantidad_minima: 6, precio_unitario: 40 },
          { cantidad_minima: 12, precio_unitario: 35 },
          { cantidad_minima: 25, precio_unitario: 30 },
          { cantidad_minima: 50, precio_unitario: 25 },
          { cantidad_minima: 100, precio_unitario: 20 },
          { cantidad_minima: 500, precio_unitario: 18 },
          { cantidad_minima: 1000, precio_unitario: 16 },
          { cantidad_minima: 10000, precio_unitario: 14 }
        ]
      });

    expect(resProdAlerta.status).toBe(201);
    const idProdAlerta = resProdAlerta.body.data.id_producto;

    // Actualizar stock_minimo para disparar trg_productos_au (stock 0 <= 20)
    const resUpdateMin = await request(app)
      .patch(`/api/inventario/${idProdAlerta}/stock-minimo`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ stock_minimo: 20 });

    expect(resUpdateMin.status).toBe(200);
    expect(resUpdateMin.body.data.stock_minimo).toBe(20);
    expect(resUpdateMin.body.data.es_stock_bajo).toBe(1);

    // Verificar que existe la alerta ACTIVA
    const resAlertas = await request(app)
      .get('/api/inventario/alertas')
      .set('Authorization', `Bearer ${supervisorToken}`);

    expect(resAlertas.status).toBe(200);
    const alertaActiva = resAlertas.body.data.alertas.find(
      a => a.id_producto === idProdAlerta && a.estado === 'ACTIVA'
    );
    expect(alertaActiva).toBeDefined();
    expect(alertaActiva.stock_minimo).toBe(20);

    // Realizar y recibir compra de 30 unidades (> stock_minimo 20)
    const resCompraSurte = await request(app)
      .post('/api/compras')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        numero_comprobante: `COMP-ALR-${timeAlert}`,
        id_proveedor: testProveedorId,
        recibir_inmediatamente: true, // Recibir de una vez
        detalles: [
          {
            id_producto: idProdAlerta,
            cantidad: 30,
            costo_unitario: 15.00
          }
        ]
      });

    expect(resCompraSurte.status).toBe(201);
    expect(resCompraSurte.body.data.estado).toBe('RECIBIDA');

    // Verificar que la alerta pasó a ATENDIDA automáticamente
    const resAlertasPost = await request(app)
      .get('/api/inventario/alertas')
      .set('Authorization', `Bearer ${supervisorToken}`);

    expect(resAlertasPost.status).toBe(200);
    const alertaAtendida = resAlertasPost.body.data.alertas.find(
      a => a.id_producto === idProdAlerta
    );
    expect(alertaAtendida).toBeDefined();
    expect(alertaAtendida.estado).toBe('ATENDIDA');
    expect(alertaAtendida.fecha_atencion).not.toBeNull();
  });

  // ============================================================================
  // CASO 6: Ajuste negativo que dejaría stock < 0 rechazado (RN01) y Operador 403 Forbidden
  // ============================================================================
  it('6. Rechaza ajuste que deje stock < 0 (RN01) y deniega compras y ajustes al rol Operador (403)', async () => {
    // 1. Ajuste negativo excesivo con Supervisor (stock disponible es 50, intentar restar 100)
    const resAjusteExcesivo = await request(app)
      .post('/api/inventario/ajustes')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        id_producto: testProductoId,
        tipo_movimiento: 'AJUSTE',
        cantidad: -100,
        motivo: 'Ajuste excesivo por pérdida'
      });

    expect(resAjusteExcesivo.status).toBe(409);
    expect(resAjusteExcesivo.body.error.code).toBe('BUSINESS_RULE_VIOLATION');
    expect(resAjusteExcesivo.body.error.message).toContain('Inventario insuficiente');

    // 2. Operador intenta registrar una compra -> 403 Forbidden
    const resOpCompra = await request(app)
      .post('/api/compras')
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({
        numero_comprobante: `COMP-OP-${timestamp}`,
        id_proveedor: testProveedorId,
        detalles: [{ id_producto: testProductoId, cantidad: 5, costo_unitario: 10 }]
      });

    expect(resOpCompra.status).toBe(403);
    expect(resOpCompra.body.error.code).toBe('FORBIDDEN');

    // 3. Operador intenta registrar un ajuste de inventario -> 403 Forbidden
    const resOpAjuste = await request(app)
      .post('/api/inventario/ajustes')
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({
        id_producto: testProductoId,
        tipo_movimiento: 'AJUSTE',
        cantidad: 5,
        motivo: 'Ajuste no autorizado'
      });

    expect(resOpAjuste.status).toBe(403);
    expect(resOpAjuste.body.error.code).toBe('FORBIDDEN');
  });

  // ============================================================================
  // CASO 7: Validar que un proveedor con compras no puede eliminarse físicamente (trg_proveedores_bd)
  // ============================================================================
  it('7. Impide borrado físico de proveedor con compras registradas (trg_proveedores_bd / 45000)', async () => {
    // Intentar borrar directamente de la base de datos con withUser
    const { withUser } = await import('../src/db/withUser.js');
    await expect(
      withUser(1, async (conn) => {
        await conn.execute('DELETE FROM proveedores WHERE id_proveedor = ?', [testProveedorId]);
      })
    ).rejects.toThrow(/Proveedor con compras registradas/);
  });
});
