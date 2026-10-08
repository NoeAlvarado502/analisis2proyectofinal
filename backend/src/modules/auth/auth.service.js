import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../../db/pool.js';
import { withUser } from '../../db/withUser.js';
import { env } from '../../config/env.js';

export class AuthService {
  /**
   * Autentica al usuario con correo y contraseña, registra auditoría y devuelve JWT con permisos.
   */
  static async login(email, password, ipOrigen = null) {
    const [rows] = await pool.execute(
      `SELECT u.id_usuario, u.id_rol, u.nombre_completo, u.email, u.password_hash, u.activo, r.nombre AS rol
       FROM usuarios u
       JOIN roles r ON r.id_rol = u.id_rol
       WHERE u.email = ?`,
      [email]
    );

    const user = rows[0];

    // Regla de seguridad: mensaje único "Credenciales inválidas"
    if (!user) {
      const error = new Error('Credenciales inválidas');
      error.statusCode = 401;
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      const error = new Error('Credenciales inválidas');
      error.statusCode = 401;
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    // Usuario inactivo -> 403
    if (!user.activo) {
      const error = new Error('Usuario inactivo. Comuníquese con el administrador.');
      error.statusCode = 403;
      error.code = 'USER_INACTIVE';
      throw error;
    }

    // Obtener permisos vigentes del rol
    const [permisosRows] = await pool.execute(
      `SELECT p.codigo
       FROM rol_permisos rp
       JOIN permisos p ON p.id_permiso = rp.id_permiso
       WHERE rp.id_rol = ?`,
      [user.id_rol]
    );
    const permisos = permisosRows.map(p => p.codigo);

    // Actualizar ultimo_login y registrar auditoría Login usando withUser
    await withUser(user.id_usuario, async (conn) => {
      await conn.execute('UPDATE usuarios SET ultimo_login = NOW() WHERE id_usuario = ?', [user.id_usuario]);
      await conn.execute('CALL sp_auditar(?, ?, ?, ?, ?)', [
        'Usuarios',
        'Login',
        `USR-${user.id_usuario}`,
        null,
        JSON.stringify({ email: user.email, ip: ipOrigen })
      ]);
    }, ipOrigen);

    // Generar JWT
    const token = jwt.sign(
      {
        id_usuario: user.id_usuario,
        email: user.email,
        id_rol: user.id_rol,
        rol: user.rol
      },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    return {
      token,
      usuario: {
        id_usuario: user.id_usuario,
        nombre_completo: user.nombre_completo,
        email: user.email,
        id_rol: user.id_rol,
        rol: user.rol
      },
      permisos
    };
  }

  /**
   * Recarga el usuario y sus permisos vigentes desde la base de datos
   */
  static async getMe(userId) {
    const [rows] = await pool.execute(
      `SELECT u.id_usuario, u.id_rol, u.nombre_completo, u.email, u.activo, r.nombre AS rol
       FROM usuarios u
       JOIN roles r ON r.id_rol = u.id_rol
       WHERE u.id_usuario = ?`,
      [userId]
    );

    const user = rows[0];
    if (!user) {
      const error = new Error('Usuario no encontrado');
      error.statusCode = 404;
      error.code = 'USER_NOT_FOUND';
      throw error;
    }

    if (!user.activo) {
      const error = new Error('Usuario inactivo');
      error.statusCode = 403;
      error.code = 'USER_INACTIVE';
      throw error;
    }

    const [permisosRows] = await pool.execute(
      `SELECT p.codigo
       FROM rol_permisos rp
       JOIN permisos p ON p.id_permiso = rp.id_permiso
       WHERE rp.id_rol = ?`,
      [user.id_rol]
    );

    return {
      usuario: {
        id_usuario: user.id_usuario,
        nombre_completo: user.nombre_completo,
        email: user.email,
        id_rol: user.id_rol,
        rol: user.rol
      },
      permisos: permisosRows.map(p => p.codigo)
    };
  }
}
