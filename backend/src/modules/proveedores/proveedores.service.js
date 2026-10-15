import { pool } from '../../db/pool.js';
import { withUser } from '../../db/withUser.js';

export class ProveedoresService {
  /**
   * Lista proveedores con búsqueda multipropósito y paginación
   */
  static async listar({ q, activo, page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;
    const params = [];
    const whereConditions = [];

    if (q && q.trim() !== '') {
      whereConditions.push(
        '(razon_social LIKE ? OR identificacion_fiscal LIKE ? OR contacto_nombre LIKE ? OR telefono LIKE ? OR email LIKE ?)'
      );
      const term = `%${q.trim()}%`;
      params.push(term, term, term, term, term);
    }

    if (activo !== undefined && activo !== null && activo !== '') {
      whereConditions.push('activo = ?');
      params.push(activo === 'true' || activo === true || activo === 1 || activo === '1' ? 1 : 0);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total FROM proveedores ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await pool.execute(
      `SELECT id_proveedor, identificacion_fiscal, razon_social, contacto_nombre,
              telefono, email, direccion, activo, created_at, updated_at
       FROM proveedores
       ${whereClause}
       ORDER BY id_proveedor DESC
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
   * Obtiene un proveedor por su ID
   */
  static async obtenerPorId(id) {
    const [rows] = await pool.execute(
      `SELECT id_proveedor, identificacion_fiscal, razon_social, contacto_nombre,
              telefono, email, direccion, activo, created_at, updated_at
       FROM proveedores
       WHERE id_proveedor = ?`,
      [id]
    );

    if (rows.length === 0) {
      const err = new Error('Proveedor no encontrado');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    return rows[0];
  }

  /**
   * Crea un proveedor y dispara auditoría automática vía trigger con withUser
   */
  static async crear({ identificacion_fiscal, razon_social, contacto_nombre, telefono, email, direccion }, currentUserId, ip = null) {
    const insertId = await withUser(currentUserId, async (conn) => {
      const [res] = await conn.execute(
        `INSERT INTO proveedores (identificacion_fiscal, razon_social, contacto_nombre, telefono, email, direccion)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [identificacion_fiscal, razon_social, contacto_nombre, telefono, email, direccion]
      );
      return res.insertId;
    }, ip);

    return await this.obtenerPorId(insertId);
  }

  /**
   * Modifica los datos de un proveedor
   */
  static async actualizar(id, { identificacion_fiscal, razon_social, contacto_nombre, telefono, email, direccion }, currentUserId, ip = null) {
    await this.obtenerPorId(id); // Valida que exista

    await withUser(currentUserId, async (conn) => {
      await conn.execute(
        `UPDATE proveedores
         SET identificacion_fiscal = ?, razon_social = ?, contacto_nombre = ?,
             telefono = ?, email = ?, direccion = ?
         WHERE id_proveedor = ?`,
        [identificacion_fiscal, razon_social, contacto_nombre, telefono, email, direccion, id]
      );
    }, ip);

    return await this.obtenerPorId(id);
  }

  /**
   * Activa o inactiva un proveedor (baja lógica)
   */
  static async cambiarEstado(id, activo, currentUserId, ip = null) {
    await this.obtenerPorId(id);

    await withUser(currentUserId, async (conn) => {
      await conn.execute(
        `UPDATE proveedores SET activo = ? WHERE id_proveedor = ?`,
        [activo ? 1 : 0, id]
      );
    }, ip);

    return await this.obtenerPorId(id);
  }
}
