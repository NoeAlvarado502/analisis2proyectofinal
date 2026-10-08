import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/db/pool.js';

describe('Módulo de Clientes (HU12, HU13, HU14)', () => {
  let operadorToken;
  let supervisorToken;
  let clienteConNitId;
  const timestamp = Date.now();
  const nitUnico = `NIT-${timestamp}`;

  beforeAll(async () => {
    const loginOp = await request(app)
      .post('/api/auth/login')
      .send({ email: 'operador@jugueteria.local', password: 'Admin1234!' });
    operadorToken = loginOp.body.data.token;

    const loginSup = await request(app)
      .post('/api/auth/login')
      .send({ email: 'supervisor@jugueteria.local', password: 'Admin1234!' });
    supervisorToken = loginSup.body.data.token;
  });

  it('permite al Operador listar clientes (HU13)', async () => {
    const res = await request(app)
      .get('/api/clientes')
      .set('Authorization', `Bearer ${operadorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.meta.total).toBeGreaterThan(0);
  });

  it('permite al Operador crear un cliente con identificación (HU12)', async () => {
    const res = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({
        nombre_razon_social: `Juguetería El Centro ${timestamp}`,
        identificacion: nitUnico,
        telefono: '5555-1234',
        email: `cliente_${timestamp}@correo.com`,
        direccion: 'Zona 1, Ciudad de Guatemala'
      });

    expect(res.status).toBe(201);
    expect(res.body.data.nombre_razon_social).toContain('Juguetería El Centro');
    expect(res.body.data.identificacion).toBe(nitUnico);
    clienteConNitId = res.body.data.id_cliente;

    // Verificar auditoría
    const [aud] = await pool.execute(
      "SELECT * FROM auditoria WHERE modulo = 'Clientes' AND accion = 'Creación' AND id_registro = ?",
      [`CLI-${clienteConNitId}`]
    );
    expect(aud.length).toBe(1);
  });

  it('permite registrar dos clientes sin NIT/identificación (NULL) sin conflicto de unicidad', async () => {
    // Cliente 1 sin NIT
    const res1 = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({
        nombre_razon_social: `Comprador Casual A ${timestamp}`,
        identificacion: '', // Se convierte a NULL
        telefono: '5555-0001'
      });

    expect(res1.status).toBe(201);
    expect(res1.body.data.identificacion).toBeNull();

    // Cliente 2 sin NIT
    const res2 = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({
        nombre_razon_social: `Comprador Casual B ${timestamp}`,
        identificacion: null,
        telefono: '5555-0002'
      });

    expect(res2.status).toBe(201);
    expect(res2.body.data.identificacion).toBeNull();
  });

  it('rechaza crear un cliente con NIT/identificación duplicada devolviendo 409', async () => {
    const res = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({
        nombre_razon_social: 'Cliente Duplicado',
        identificacion: nitUnico
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_ENTRY');
  });

  it('permite al Operador modificar un cliente existente (HU14)', async () => {
    const res = await request(app)
      .put(`/api/clientes/${clienteConNitId}`)
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({
        nombre_razon_social: `Juguetería El Centro Modificada ${timestamp}`,
        identificacion: nitUnico,
        telefono: '5555-9999',
        email: `actualizado_${timestamp}@correo.com`,
        direccion: 'Zona 10, Ciudad de Guatemala'
      });

    expect(res.status).toBe(200);
    expect(res.body.data.nombre_razon_social).toContain('Modificada');
    expect(res.body.data.telefono).toBe('5555-9999');
  });

  it('permite al Operador inactivar un cliente (HU14)', async () => {
    const res = await request(app)
      .patch(`/api/clientes/${clienteConNitId}/estado`)
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({ activo: false });

    expect(res.status).toBe(200);
    expect(res.body.data.activo).toBe(0);
  });

  it('permite al Supervisor consultar clientes (tiene clientes.consultar)', async () => {
    const res = await request(app)
      .get(`/api/clientes/${clienteConNitId}`)
      .set('Authorization', `Bearer ${supervisorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id_cliente).toBe(clienteConNitId);
  });

  it('un Supervisor recibe 403 al intentar crear clientes porque solo tiene permiso de consulta', async () => {
    const res = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${supervisorToken}`)
      .send({
        nombre_razon_social: 'Intento Supervisor'
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.error.message).toContain('clientes.gestionar');
  });
});
