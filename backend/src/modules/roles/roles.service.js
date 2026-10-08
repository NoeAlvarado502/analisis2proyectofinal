import { pool } from '../../db/pool.js';
import { withUser } from '../../db/withUser.js';

export class RolesService {
  /**
   * Lista todos los roles con el conteo de permisos asignados
   */
  static async listar() {
    const [rows] = await pool.execute(
      `SELECT r.id_rol, r.nombre, r.descripcion, r.created_at,
              COUNT(rp.id_permiso) AS total_permisos
       FROM roles r
       LEFT JOIN rol_permisos rp ON rp.id_rol = r.id_rol
       GROUP BY r.id_rol
       ORDER BY r.id_rol ASC`
    );
    return rows;
  }

  /**
   * Obtiene un rol con su lista completa de permisos
   */
  static async obtenerPorId(id) {
    const [roles] = await pool.execute(
      `SELECT id_rol, nombre, descripcion, created_at, updated_at
       FROM roles
       WHERE id_rol = ?`,
      [id]
    );

    if (roles.length === 0) {
      const err = new Error('Rol no encontrado');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    const rol = roles[0];

    const [permisos] = await pool.execute(
      `SELECT p.id_permiso, p.codigo, p.modulo, p.descripcion
       FROM rol_permisos rp
       JOIN permisos p ON p.id_permiso = rp.id_permiso
       WHERE rp.id_rol = ?
       ORDER BY p.modulo, p.id_permiso`,
      [id]
    );

    rol.permisos = permisos;
    rol.permisos_codigos = permisos.map(p => p.codigo);

    return rol;
  }

  /**
   * Lista el catálogo completo de permisos agrupados por módulo
   */
  static async listarPermisos() {
    const [rows] = await pool.execute(
      `SELECT id_permiso, codigo, modulo, descripcion
       FROM permisos
       ORDER BY modulo ASC, id_permiso ASC`
    );

    // Agrupar por módulo para facilitar la visualización en frontend
    const agrupados = {};
    for (const p of rows) {
      if (!agrupados[p.modulo]) {
        agrupados[p.modulo] = [];
      }
      agrupados[p.modulo].push(p);
    }

    return {
      todos: rows,
      por_modulo: agrupados
    };
  }

  /**
   * Actualiza los permisos asignados a un rol dentro de una transacción auditada
   */
  static async actualizarPermisos(idRol, permisosCodigos, currentUserId, ip = null) {
    const rol = await this.obtenerPorId(idRol);

    // Regla de seguridad: Administrador no puede perder usuarios.gestionar ni roles.gestionar
    if (rol.nombre === 'Administrador') {
      const tieneUsuarios = permisosCodigos.includes('usuarios.gestionar');
      const tieneRoles = permisosCodigos.includes('roles.gestionar');

      if (!tieneUsuarios || !tieneRoles) {
        const err = new Error(
          'El rol Administrador no puede perder los permisos de administración (usuarios.gestionar y roles.gestionar)'
        );
        err.statusCode = 409;
        err.code = 'ESSENTIAL_PERMISSIONS_LOCKED';
        throw err;
      }
    }

    return await withUser(currentUserId, async (conn) => {
      // 1. Limpiar permisos actuales del rol
      await conn.execute('DELETE FROM rol_permisos WHERE id_rol = ?', [idRol]);

      // 2. Insertar nuevos permisos si la lista no está vacía
      if (permisosCodigos && permisosCodigos.length > 0) {
        // Obtenemos los id_permiso correspondientes a los códigos recibidos
        const placeholders = permisosCodigos.map(() => '?').join(',');
        const [permisosValidos] = await conn.execute(
          `SELECT id_permiso FROM permisos WHERE codigo IN (${placeholders})`,
          permisosCodigos
        );

        for (const p of permisosValidos) {
          await conn.execute(
            'INSERT INTO rol_permisos (id_rol, id_permiso) VALUES (?, ?)',
            [idRol, p.id_permiso]
          );
        }
      }
    }, ip);

    return await this.obtenerPorId(idRol);
  }
}
