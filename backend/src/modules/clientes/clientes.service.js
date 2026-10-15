import { pool } from '../../db/pool.js';
import { withUser } from '../../db/withUser.js';

export class ClientesService {
  /**
   * Lista clientes con búsqueda multipropósito y paginación
   */
  static async listar({ q, activo, page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;
    const params = [];
    const whereConditions = [];

    if (q && q.trim() !== '') {
      whereConditions.push(
        '(nombre_razon_social LIKE ? OR identificacion LIKE ? OR telefono LIKE ? OR email LIKE ?)'
      );
      const term = `%${q.trim()}%`;
      params.push(term, term, term, term);
    }

    if (activo !== undefined && activo !== null && activo !== '') {
      whereConditions.push('activo = ?');
      params.push(activo === 'true' || activo === true || activo === 1 || activo === '1' ? 1 : 0);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM clientes ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await pool.execute(
      `SELECT id_cliente, identificacion, nombre_razon_social, telefono, email,
              direccion, activo, created_at, updated_at
       FROM clientes
       ${whereClause}
       ORDER BY id_cliente DESC
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
   * Obtiene un cliente por su ID
   */
  static async obtenerPorId(id) {
    const [rows] = await pool.execute(
      `SELECT id_cliente, identificacion, nombre_razon_social, telefono, email,
              direccion, activo, created_at, updated_at
       FROM clientes
       WHERE id_cliente = ?`,
      [id]
    );

    if (rows.length === 0) {
      const err = new Error('Cliente no encontrado');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    return rows[0];
  }

  /**
   * Crea un cliente y dispara auditoría automática vía trigger en withUser
   */
  static async crear({ nombre_razon_social, identificacion, telefono, email, direccion }, currentUserId, ip = null) {
    const insertId = await withUser(currentUserId, async (conn) => {
      const [res] = await conn.execute(
        `INSERT INTO clientes (nombre_razon_social, identificacion, telefono, email, direccion)
         VALUES (?, ?, ?, ?, ?)`,
        [nombre_razon_social, identificacion, telefono, email, direccion]
      );
      return res.insertId;
    }, ip);

    return await this.obtenerPorId(insertId);
  }

  /**
   * Modifica los datos de un cliente
   */
  static async actualizar(id, { nombre_razon_social, identificacion, telefono, email, direccion }, currentUserId, ip = null) {
    await this.obtenerPorId(id); // Valida que exista

    await withUser(currentUserId, async (conn) => {
      await conn.execute(
        `UPDATE clientes
         SET nombre_razon_social = ?, identificacion = ?, telefono = ?, email = ?, direccion = ?
         WHERE id_cliente = ?`,
        [nombre_razon_social, identificacion, telefono, email, direccion, id]
      );
    }, ip);

    return await this.obtenerPorId(id);
  }

  /**
   * Activa o inactiva un cliente (baja lógica, no se elimina físicamente)
   */
  static async cambiarEstado(id, activo, currentUserId, ip = null) {
    await this.obtenerPorId(id);

    await withUser(currentUserId, async (conn) => {
      await conn.execute(
        `UPDATE clientes SET activo = ? WHERE id_cliente = ?`,
        [activo ? 1 : 0, id]
      );
    }, ip);

    return await this.obtenerPorId(id);
  }
}
