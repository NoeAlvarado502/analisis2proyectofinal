import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { pool } from '../src/db/pool.js';

describe('Módulo de Usuarios, Roles y Permisos (HU03 a HU10)', () => {
  let adminToken;
  let operadorToken;
  let supervisorToken;
  let nuevoUsuarioId;
  const timestamp = Date.now();
  const emailNuevo = `empleado_${timestamp}@jugueteria.local`;
  const emailModificado = `modificado_${timestamp}@jugueteria.local`;

  beforeAll(async () => {
    // Obtener tokens para Admin y Operador
    const loginAdmin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@jugueteria.local', password: 'Admin1234!' });
    adminToken = loginAdmin.body.data.token;

    const loginOp = await request(app)
      .post('/api/auth/login')
      .send({ email: 'operador@jugueteria.local', password: 'Admin1234!' });
    operadorToken = loginOp.body.data.token;

    const loginSup = await request(app)
      .post('/api/auth/login')
      .send({ email: 'supervisor@jugueteria.local', password: 'Admin1234!' });
    supervisorToken = loginSup.body.data.token;
  });

  it('permite al Administrador listar usuarios paginados y con búsqueda', async () => {
    const res = await request(app)
      .get('/api/usuarios?q=admin')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.meta.total).toBeGreaterThan(0);
    expect(res.body.data[0].email).toBe('admin@jugueteria.local');
    expect(res.body.data[0].password_hash).toBeUndefined(); // Nunca devolver hash
  });

  it('permite al Administrador crear un nuevo usuario con rol válido (HU03, HU04)', async () => {
    const res = await request(app)
      .post('/api/usuarios')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nombre_completo: 'Empleado Nuevo',
        email: emailNuevo,
        password: 'PasswordSegura123!',
        id_rol: 3 // Operador
      });

    expect(res.status).toBe(201);
    expect(res.body.data.email).toBe(emailNuevo);
    expect(res.body.data.rol).toBe('Operador');
    nuevoUsuarioId = res.body.data.id_usuario;

    // Verificar que quedó registrado en auditoría
    const [audRows] = await pool.execute(
      "SELECT * FROM auditoria WHERE modulo = 'Usuarios' AND accion = 'Creación' AND id_registro = ?",
      [`USR-${nuevoUsuarioId}`]
    );
    expect(audRows.length).toBe(1);
  });

  it('rechaza crear un usuario con correo duplicado devolviendo 409 (RN05)', async () => {
    const res = await request(app)
      .post('/api/usuarios')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nombre_completo: 'Clon de Empleado',
        email: emailNuevo,
        password: 'PasswordSegura123!',
        id_rol: 3
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_ENTRY');
    expect(res.body.error.message).toContain('correo electrónico');
  });

  it('rechaza crear un usuario con contraseña corta o sin números con 422', async () => {
    const res = await request(app)
      .post('/api/usuarios')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nombre_completo: 'Usuario Invalido',
        email: `invalido_${timestamp}@jugueteria.local`,
        password: 'corta',
        id_rol: 3
      });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.some(d => d.field === 'password')).toBe(true);
  });

  it('un Operador recibe 403 al intentar crear usuarios en POST /api/usuarios (HU11)', async () => {
    const res = await request(app)
      .post('/api/usuarios')
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({
        nombre_completo: 'Intento Prohibido',
        email: `prohibido_${timestamp}@jugueteria.local`,
        password: 'Password123!',
        id_rol: 3
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(res.body.error.message).toContain('usuarios.gestionar');
  });

  it('permite al Administrador modificar datos del usuario creado (HU06)', async () => {
    const res = await request(app)
      .put(`/api/usuarios/${nuevoUsuarioId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nombre_completo: 'Empleado Modificado',
        email: emailModificado,
        id_rol: 2 // Ascendido a Supervisor
      });

    expect(res.status).toBe(200);
    expect(res.body.data.nombre_completo).toBe('Empleado Modificado');
    expect(res.body.data.email).toBe(emailModificado);
    expect(res.body.data.rol).toBe('Supervisor');
  });

  it('impide a un Administrador cambiar su propio rol devolviendo 409', async () => {
    const res = await request(app)
      .put('/api/usuarios/1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nombre_completo: 'Administrador del Sistema',
        email: 'admin@jugueteria.local',
        id_rol: 3 // Intentar cambiarse a Operador
      });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toContain('No puede modificar su propio rol');
  });

  it('impide a un Administrador desactivarse a sí mismo devolviendo 409 (HU07)', async () => {
    const res = await request(app)
      .patch('/api/usuarios/1/estado')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ activo: false });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toContain('No puede desactivar su propia cuenta');
  });

  it('permite desactivar y reactivar a otro usuario (HU07)', async () => {
    // Desactivar
    const resDesc = await request(app)
      .patch(`/api/usuarios/${nuevoUsuarioId}/estado`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ activo: false });

    expect(resDesc.status).toBe(200);
    expect(resDesc.body.data.activo).toBe(0);

    // Reactivar
    const resAct = await request(app)
      .patch(`/api/usuarios/${nuevoUsuarioId}/estado`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ activo: true });

    expect(resAct.status).toBe(200);
    expect(resAct.body.data.activo).toBe(1);
  });

  it('permite restablecer la contraseña de un usuario (HU08)', async () => {
    const res = await request(app)
      .patch(`/api/usuarios/${nuevoUsuarioId}/password`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ new_password: 'NuevaPassword2026!' });

    expect(res.status).toBe(200);
    expect(res.body.data.mensaje).toContain('éxito');

    // Verificar que puede iniciar sesión con la nueva clave
    const loginTest = await request(app)
      .post('/api/auth/login')
      .send({
        email: emailModificado,
        password: 'NuevaPassword2026!'
      });
    expect(loginTest.status).toBe(200);
  });

  it('permite consultar la lista de roles con conteo de permisos (HU09)', async () => {
    const res = await request(app)
      .get('/api/roles')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(3);
    expect(res.body.data[0].nombre).toBe('Administrador');
    expect(res.body.data[0].total_permisos).toBe(19);
  });

  it('permite consultar el catálogo completo de permisos agrupados por módulo', async () => {
    const res = await request(app)
      .get('/api/permisos')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.todos.length).toBe(19);
    expect(res.body.data.por_modulo['Usuarios']).toBeDefined();
  });

  it('bloquea quitar permisos esenciales al Administrador devolviendo 409 (HU10)', async () => {
    const res = await request(app)
      .put('/api/roles/1/permisos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        permisos: ['clientes.consultar'] // Intento de quitar usuarios.gestionar y roles.gestionar
      });

    expect(res.status).toBe(409);
    expect(res.body.error.message).toContain('no puede perder los permisos de administración');
  });

  it('la edición de permisos de un rol se refleja de inmediato en /api/auth/me (HU10)', async () => {
    // 1. Consultar permisos actuales de supervisor
    const meAntes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${supervisorToken}`);
    expect(meAntes.body.data.permisos).not.toContain('configuracion.gestionar');

    // 2. Administrador asigna un permiso adicional al rol Supervisor (id 2)
    const permisosSupervisorActualizados = [
      ...meAntes.body.data.permisos,
      'configuracion.gestionar'
    ];

    const resPut = await request(app)
      .put('/api/roles/2/permisos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ permisos: permisosSupervisorActualizados });
    expect(resPut.status).toBe(200);

    // 3. Supervisor consulta /api/auth/me con su mismo token previo: debe tener el nuevo permiso sin re-loguearse
    const meDespues = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${supervisorToken}`);

    expect(meDespues.status).toBe(200);
    expect(meDespues.body.data.permisos).toContain('configuracion.gestionar');

    // Revertir para dejar limpio el rol supervisor
    await request(app)
      .put('/api/roles/2/permisos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ permisos: meAntes.body.data.permisos });
  });
});
