import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/db/pool.js';

describe('Módulo de Productos, Escalas, Categorías y Marcas (HU15 a HU19)', () => {
  let supervisorToken;
  let operadorToken;
  let nuevoProductoId;
  const timestamp = Date.now();
  const skuUnico = `SKU-TEST-${timestamp}`;

  const diezEscalasValidas = [
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
  ];

  beforeAll(async () => {
    const loginSup = await request(app)
      .post('/api/auth/login')
      .send({ email: 'supervisor@jugueteria.local', password: 'Admin1234!' });
    supervisorToken = loginSup.body.data.token;

    const loginOp = await request(app)
      .post('/api/auth/login')
      .send({ email: 'operador@jugueteria.local', password: 'Admin1234!' });
    operadorToken = loginOp.body.data.token;
  });

  it('permite listar productos desde v_catalogo con stock y precio de menudeo (HU16)', async () => {
    const res = await request(app)
      .get('/api/productos')
      .set('Authorization', `Bearer ${supervisorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].codigo_sku).toBeDefined();
    expect(res.body.data[0].precio_menudeo).toBeDefined();
    expect(res.body.data[0].stock_actual).toBeDefined();
    expect(res.body.data[0].es_stock_bajo).toBeDefined();
  });

  it('permite al Supervisor crear un producto con escala completa de 10 niveles (HU15)', async () => {
    const res = await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        codigo_sku: skuUnico,
        nombre: `Juguete Educativo Pro ${timestamp}`,
        descripcion: 'Kit de robótica infantil',
        id_categoria: 3, // Didácticos
        id_marca: 3,     // LEGO
        edad_minima_meses: 72,
        advertencia_seguridad: 'Contiene piezas electrónicas pequeñas',
        stock_minimo: 10,
        escalas: diezEscalasValidas
      });

    expect(res.status).toBe(201);
    expect(res.body.data.codigo_sku).toBe(skuUnico);
    expect(res.body.data.precio_menudeo).toBe(100.00);
    expect(res.body.data.stock_actual).toBe(0); // Inventario inicial automático en 0
    expect(res.body.data.escalas.length).toBe(10);
    nuevoProductoId = res.body.data.id_producto;

    // Verificar auditoría con el usuario Supervisor (id 2)
    const [aud] = await pool.execute(
      "SELECT * FROM auditoria WHERE modulo = 'Productos' AND accion = 'Creación' AND id_registro = ?",
      [skuUnico]
    );
    expect(aud.length).toBe(1);
    expect(aud[0].id_usuario).toBe(2);
  });

  it('rechaza crear producto sin nivel 1 (menudeo) con error 422', async () => {
    const res = await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        codigo_sku: `SKU-SIN1-${timestamp}`,
        nombre: 'Producto Sin Nivel 1',
        id_categoria: 1,
        escalas: [
          { cantidad_minima: 12, precio_unitario: 50.00 } // Falta nivel 1
        ]
      });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.some(d => d.message.includes('nivel 1'))).toBe(true);
  });

  it('rechaza crear producto con precios no decrecientes (nivel mayor más caro) con 422', async () => {
    const res = await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        codigo_sku: `SKU-INVALID-PRICE-${timestamp}`,
        nombre: 'Producto Escala Inválida',
        id_categoria: 1,
        escalas: [
          { cantidad_minima: 1, precio_unitario: 50.00 },
          { cantidad_minima: 12, precio_unitario: 60.00 } // Error: docena más cara que unidad
        ]
      });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rechaza crear producto con SKU duplicado devolviendo 409', async () => {
    const res = await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        codigo_sku: skuUnico,
        nombre: 'Producto Duplicado',
        id_categoria: 1,
        escalas: [{ cantidad_minima: 1, precio_unitario: 50.00 }]
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_ENTRY');
  });

  it('permite al Supervisor modificar el producto y sus escalas (HU17)', async () => {
    const res = await request(app)
      .put(`/api/productos/${nuevoProductoId}`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        nombre: `Juguete Educativo Pro Modificado ${timestamp}`,
        descripcion: 'Nueva descripción',
        id_categoria: 3,
        id_marca: 3,
        edad_minima_meses: 60,
        stock_minimo: 8,
        escalas: [
          { cantidad_minima: 1, precio_unitario: 110.00 },
          { cantidad_minima: 6, precio_unitario: 100.00 },
          { cantidad_minima: 12, precio_unitario: 90.00 }
        ]
      });

    expect(res.status).toBe(200);
    expect(res.body.data.nombre).toContain('Modificado');
    expect(res.body.data.precio_menudeo).toBe(110.00);
    expect(res.body.data.escalas.length).toBe(3);
  });

  it('permite inactivar un producto en lugar de eliminarlo físicamente (HU18, RN04)', async () => {
    const res = await request(app)
      .patch(`/api/productos/${nuevoProductoId}/estado`)
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ activo: false });

    expect(res.status).toBe(200);
    expect(res.body.data.activo).toBe(0);
  });

  it('un Operador recibe 403 al intentar crear productos (HU11)', async () => {
    const res = await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({
        codigo_sku: `OP-FORBID-${timestamp}`,
        nombre: 'Intento Operador',
        id_categoria: 1,
        escalas: [{ cantidad_minima: 1, precio_unitario: 20.00 }]
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.error.message).toContain('productos.gestionar');
  });

  it('permite administrar categorías y marcas (HU19)', async () => {
    // Crear categoría
    const resCat = await request(app)
      .post('/api/categorias')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        nombre: `Electrónicos ${timestamp}`,
        descripcion: 'Drones y gadgets'
      });
    expect(resCat.status).toBe(201);
    expect(resCat.body.data.nombre).toContain('Electrónicos');

    // Listar categorías
    const resListCat = await request(app)
      .get('/api/categorias')
      .set('Authorization', `Bearer ${supervisorToken}`);
    expect(resListCat.status).toBe(200);
    expect(resListCat.body.data.length).toBeGreaterThan(0);

    // Crear marca
    const resMarca = await request(app)
      .post('/api/marcas')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({ nombre: `Playmobil ${timestamp}` });
    expect(resMarca.status).toBe(201);
    expect(resMarca.body.data.nombre).toContain('Playmobil');
  });
});
