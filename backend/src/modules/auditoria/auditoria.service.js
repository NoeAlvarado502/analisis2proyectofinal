import { pool } from '../../db/pool.js';

export class AuditoriaService {
  /**
   * Consulta la bitácora de auditoría con filtros avanzados y opciones de módulos/acciones
   */
  static async listar({ q, modulo, accion, id_usuario, fecha_desde, fecha_hasta, page = 1, limit = 20 }) {
    const offset = (page - 1) * limit;
    const params = [];
    const whereConditions = [];

    if (q && q.trim() !== '') {
      whereConditions.push('(a.id_registro LIKE ? OR u.nombre_completo LIKE ?)');
      const term = `%${q.trim()}%`;
      params.push(term, term);
    }

    if (modulo && modulo.trim() !== '') {
      whereConditions.push('a.modulo = ?');
      params.push(modulo.trim());
    }

    if (accion && accion.trim() !== '') {
      whereConditions.push('a.accion = ?');
      params.push(accion.trim());
    }

    if (id_usuario) {
      whereConditions.push('a.id_usuario = ?');
      params.push(parseInt(id_usuario, 10));
    }

    if (fecha_desde) {
      whereConditions.push('a.fecha_hora >= ?');
      params.push(fecha_desde.includes(' ') ? fecha_desde : `${fecha_desde} 00:00:00`);
    }

    if (fecha_hasta) {
      whereConditions.push('a.fecha_hora <= ?');
      params.push(fecha_hasta.includes(' ') ? fecha_hasta : `${fecha_hasta} 23:59:59`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const [countRows] = await pool.execute(
      `SELECT COUNT(*) AS total
       FROM auditoria a
       JOIN usuarios u ON u.id_usuario = a.id_usuario
       ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    const [rows] = await pool.execute(
      `SELECT a.id_auditoria, a.fecha_hora, a.id_usuario, u.nombre_completo AS usuario_nombre,
              a.modulo, a.accion, a.id_registro,
              a.detalle_anterior, a.detalle_nuevo, a.ip_origen
       FROM auditoria a
       JOIN usuarios u ON u.id_usuario = a.id_usuario
       ${whereClause}
       ORDER BY a.id_auditoria DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [modulosRows] = await pool.execute(
      'SELECT DISTINCT modulo FROM auditoria ORDER BY modulo ASC'
    );
    const [accionesRows] = await pool.execute(
      'SELECT DISTINCT accion FROM auditoria ORDER BY accion ASC'
    );

    return {
      data: rows,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        modulos: modulosRows.map(r => r.modulo),
        acciones: accionesRows.map(r => r.accion)
      }
    };
  }
}
