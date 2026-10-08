import bcrypt from 'bcryptjs';
import { pool } from '../../db/pool.js';
import { withUser } from '../../db/withUser.js';

export class UsuariosService {
  /**
   * Lista usuarios con búsqueda y paginación (excluye password_hash)
   */
  static async listar({ q, activo, page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;
    const params = [];
    let whereConditions = [];

    if (q && q.trim() !== '') {
      whereConditions.push('(u.nombre_completo LIKE ? OR u.email LIKE ?)');
      params.push(`%${q.trim()}%`, `%${q.trim()}%`);
    }

    if (activo !== undefined && activo !== null && activo !== '') {
      whereConditions.push('u.activo = ?');
      params.push(activo === 'true' || activo === true || activo === 1 || activo === '1' ? 1 : 0);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Conteo total
    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM usuarios u ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    // Registros paginados
    const [rows] = await pool.execute(
      `SELECT u.id_usuario, u.id_rol, u.nombre_completo, u.email, u.activo, u.ultimo_login,
              u.created_at, u.updated_at, r.nombre AS rol
       FROM usuarios u
       JOIN roles r ON r.id_rol = u.id_rol
       ${whereClause}
       ORDER BY u.id_usuario DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    return {
      data: rows,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Obtiene un usuario por ID
   */
  static async obtenerPorId(id) {
    const [rows] = await pool.execute(
      `SELECT u.id_usuario, u.id_rol, u.nombre_completo, u.email, u.activo, u.ultimo_login,
              u.created_at, u.updated_at, r.nombre AS rol
       FROM usuarios u
       JOIN roles r ON r.id_rol = u.id_rol
       WHERE u.id_usuario = ?`,
      [id]
    );

    if (rows.length === 0) {
      const err = new Error('Usuario no encontrado');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    return rows[0];
  }

  /**
   * Crea un usuario y audita con withUser
   */
  static async crear({ nombre_completo, email, password, id_rol }, currentUserId, ip = null) {
    const hash = await bcrypt.hash(password, 10);

    const insertId = await withUser(currentUserId, async (conn) => {
      const [res] = await conn.execute(
        `INSERT INTO usuarios (id_rol, nombre_completo, email, password_hash)
         VALUES (?, ?, ?, ?)`,
        [id_rol, nombre_completo, email, hash]
      );
      return res.insertId;
    }, ip);

    return await this.obtenerPorId(insertId);
  }

  /**
   * Modifica un usuario existente
   */
  static async actualizar(id, { nombre_completo, email, id_rol }, currentUserId, ip = null) {
    const targetUser = await this.obtenerPorId(id);

    // Regla: Un administrador no puede cambiar su propio rol
    if (Number(id) === Number(currentUserId) && Number(id_rol) !== Number(targetUser.id_rol)) {
      const err = new Error('No puede modificar su propio rol');
      err.statusCode = 409;
      err.code = 'OPERATION_NOT_ALLOWED';
      throw err;
    }

    await withUser(currentUserId, async (conn) => {
      await conn.execute(
        `UPDATE usuarios
         SET nombre_completo = ?, email = ?, id_rol = ?
         WHERE id_usuario = ?`,
        [nombre_completo, email, id_rol, id]
      );
    }, ip);

    return await this.obtenerPorId(id);
  }

  /**
   * Activa o desactiva un usuario (baja lógica)
   */
  static async cambiarEstado(id, activo, currentUserId, ip = null) {
    const targetUser = await this.obtenerPorId(id);

    // Regla: Un administrador no puede desactivarse a sí mismo
    if (Number(id) === Number(currentUserId) && !activo) {
      const err = new Error('No puede desactivar su propia cuenta de usuario');
      err.statusCode = 409;
      err.code = 'SELF_DEACTIVATION_FORBIDDEN';
      throw err;
    }

    // Regla: Siempre debe quedar al menos un administrador activo en el sistema
    if (targetUser.rol === 'Administrador' && !activo) {
      const [adminCount] = await pool.execute(
        `SELECT COUNT(*) AS total
         FROM usuarios u
         JOIN roles r ON r.id_rol = u.id_rol
         WHERE r.nombre = 'Administrador' AND u.activo = 1 AND u.id_usuario != ?`,
        [id]
      );

      if (adminCount[0].total === 0) {
        const err = new Error('No se puede desactivar: debe quedar al menos un administrador activo');
        err.statusCode = 409;
        err.code = 'LAST_ADMIN_DEACTIVATION_FORBIDDEN';
        throw err;
      }
    }

    await withUser(currentUserId, async (conn) => {
      await conn.execute(
        `UPDATE usuarios SET activo = ? WHERE id_usuario = ?`,
        [activo ? 1 : 0, id]
      );
    }, ip);

    return await this.obtenerPorId(id);
  }

  /**
   * Restablecimiento de contraseña por administrador
   */
  static async resetPassword(id, newPassword, currentUserId, ip = null) {
    await this.obtenerPorId(id); // Valida que exista
    const hash = await bcrypt.hash(newPassword, 10);

    await withUser(currentUserId, async (conn) => {
      await conn.execute(
        `UPDATE usuarios SET password_hash = ? WHERE id_usuario = ?`,
        [hash, id]
      );
    }, ip);

    return { mensaje: 'Contraseña actualizada con éxito' };
  }
}
