import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/db/pool.js';
import { withUser } from '../src/db/withUser.js';

describe('Módulo de Autenticación y Autorización (HU01, HU02, HU11)', () => {
  let adminToken;
  let operadorToken;

  it('permite iniciar sesión con credenciales correctas (Administrador)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@jugueteria.local',
        password: 'Admin1234!'
      });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.usuario.email).toBe('admin@jugueteria.local');
    expect(res.body.data.usuario.rol).toBe('Administrador');
    expect(Array.isArray(res.body.data.permisos)).toBe(true);
    expect(res.body.data.permisos).toContain('usuarios.gestionar');

    adminToken = res.body.data.token;
  });

  it('permite iniciar sesión a un Operador y devuelve sus permisos restringidos', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'operador@jugueteria.local',
        password: 'Admin1234!'
      });

    expect(res.status).toBe(200);
    expect(res.body.data.usuario.rol).toBe('Operador');
    expect(res.body.data.permisos).toContain('pedidos.crear');
    expect(res.body.data.permisos).not.toContain('usuarios.gestionar');

    operadorToken = res.body.data.token;
  });

  it('rechaza login con contraseña incorrecta devolviendo 401 Credenciales inválidas', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@jugueteria.local',
        password: 'PasswordIncorrecto123'
      });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(res.body.error.message).toBe('Credenciales inválidas');
  });

  it('rechaza login con correo no existente devolviendo el mismo mensaje genérico 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'noexiste@jugueteria.local',
        password: 'CualquierPassword!'
      });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(res.body.error.message).toBe('Credenciales inválidas');
  });

  it('rechaza login si el usuario está inactivo con 403', async () => {
    // Obtenemos un hash válido
    const [rows] = await pool.execute("SELECT password_hash FROM usuarios WHERE email = 'admin@jugueteria.local'");
    const validHash = rows[0].password_hash;

    // Usamos withUser para que el trigger de auditoría no rechace la creación del usuario
    await withUser(1, async (conn) => {
      await conn.execute(
        `INSERT INTO usuarios (id_rol, nombre_completo, email, password_hash, activo)
         VALUES (3, 'Inactivo Test', 'inactivo@jugueteria.local', ?, 0)
         ON DUPLICATE KEY UPDATE activo = 0, password_hash = ?`,
        [validHash, validHash]
      );
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'inactivo@jugueteria.local',
        password: 'Admin1234!'
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('USER_INACTIVE');
  });

  it('rechaza acceso a /api/auth/me sin token con 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('permite consultar /api/auth/me con token válido y recarga permisos', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.usuario.email).toBe('admin@jugueteria.local');
    expect(res.body.data.permisos).toBeDefined();
  });

  it('bloquea con 403 a un operador que intenta acceder a una ruta sin el permiso requerido', async () => {
    const res = await request(app)
      .get('/api/test/solo-supervisores')
      .set('Authorization', `Bearer ${operadorToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.error.message).toContain('pedidos.autorizar_descuento');
  });
});
