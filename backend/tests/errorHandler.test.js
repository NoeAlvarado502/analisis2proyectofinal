import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { z, ZodError } from 'zod';
import { errorHandler, notFoundHandler } from '../src/middleware/errorHandler.js';
import { app } from '../src/app.js';

describe('Middleware errorHandler', () => {
  const testApp = express();
  testApp.use(express.json());

  // Rutas de prueba para provocar cada error
  testApp.get('/test/zod', () => {
    const schema = z.object({ email: z.string().email() });
    schema.parse({ email: 'correo-invalido' });
  });

  testApp.get('/test/dup-email', () => {
    const err = new Error('Duplicate entry');
    err.errno = 1062;
    err.code = 'ER_DUP_ENTRY';
    err.sqlMessage = "Duplicate entry 'admin@jugueteria.local' for key 'email'";
    throw err;
  });

  testApp.get('/test/trigger-45000', () => {
    const err = new Error('Trigger failure');
    err.sqlState = '45000';
    err.sqlMessage = 'Inventario insuficiente para la cantidad solicitada';
    throw err;
  });

  testApp.get('/test/fk-restrict', () => {
    const err = new Error('Cannot delete or update a parent row');
    err.errno = 1451;
    err.code = 'ER_ROW_IS_REFERENCED_2';
    throw err;
  });

  testApp.get('/test/fk-not-found', () => {
    const err = new Error('Cannot add or update a child row');
    err.errno = 1452;
    err.code = 'ER_NO_REFERENCED_ROW_2';
    throw err;
  });

  testApp.get('/test/custom', () => {
    const err = new Error('No autorizado');
    err.statusCode = 401;
    err.code = 'UNAUTHORIZED';
    throw err;
  });

  testApp.get('/test/500', () => {
    throw new Error('Explosión no controlada');
  });

  testApp.use(notFoundHandler);
  testApp.use(errorHandler);

  it('mapea ZodError a 422 con detalle por campo', async () => {
    const res = await request(testApp).get('/test/zod');
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toHaveLength(1);
    expect(res.body.error.details[0].field).toBe('email');
  });

  it('mapea error MySQL 1062 (correo duplicado) a 409', async () => {
    const res = await request(testApp).get('/test/dup-email');
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_ENTRY');
    expect(res.body.error.message).toContain('correo electrónico');
  });

  it('mapea SQLSTATE 45000 (trigger de negocio) a 409 con el sqlMessage exacto', async () => {
    const res = await request(testApp).get('/test/trigger-45000');
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('BUSINESS_RULE_VIOLATION');
    expect(res.body.error.message).toBe('Inventario insuficiente para la cantidad solicitada');
  });

  it('mapea error MySQL 1451 (llave foránea restrict) a 409', async () => {
    const res = await request(testApp).get('/test/fk-restrict');
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('FOREIGN_KEY_RESTRICT');
  });

  it('mapea error MySQL 1452 (llave foránea no encontrada) a 409', async () => {
    const res = await request(testApp).get('/test/fk-not-found');
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('FOREIGN_KEY_NOT_FOUND');
  });

  it('mapea error personalizado con statusCode a su código correspondiente', async () => {
    const res = await request(testApp).get('/test/custom');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('mapea error no controlado a 500 genérico', async () => {
    const res = await request(testApp).get('/test/500');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_SERVER_ERROR');
  });

  it('mapea rutas inexistentes a 404', async () => {
    const res = await request(testApp).get('/ruta-que-no-existe');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});

describe('GET /api/health', () => {
  it('responde 200 y status ok con base de datos conectada', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.db).toBe('connected');
  });
});
