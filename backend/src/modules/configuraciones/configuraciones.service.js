import { pool } from '../../db/pool.js';
import { withUser } from '../../db/withUser.js';

export class ConfiguracionesService {
  /**
   * Listar todos los parámetros de configuración
   */
  static async listar() {
    const [rows] = await pool.execute(
      'SELECT clave, valor, descripcion, updated_at FROM configuraciones ORDER BY clave ASC'
    );
    return rows;
  }

  /**
   * Obtener un parámetro específico por clave
   */
  static async obtenerPorClave(clave) {
    const [rows] = await pool.execute(
      'SELECT clave, valor, descripcion, updated_at FROM configuraciones WHERE clave = ?',
      [clave]
    );
    if (rows.length === 0) {
      const err = new Error(`Parámetro de configuración '${clave}' no encontrado`);
      err.statusCode = 404;
      throw err;
    }
    return rows[0];
  }

  /**
   * Actualizar un parámetro de configuración (registra auditoría automática vía trigger con withUser)
   */
  static async actualizar(clave, valor, currentUserId) {
    if (valor === undefined || valor === null || String(valor).trim() === '') {
      const err = new Error('El valor de configuración no puede estar vacío');
      err.statusCode = 400;
      throw err;
    }

    const valorStr = String(valor).trim();

    // Validación de regla de negocio RN07 para límite de descuento
    if (clave === 'DESCUENTO_MAX_SIN_AUTORIZACION') {
      const num = parseFloat(valorStr);
      if (isNaN(num) || num < 0 || num > 100) {
        const err = new Error('El descuento máximo sin autorización debe ser un porcentaje válido entre 0 y 100');
        err.statusCode = 400;
        throw err;
      }
    }

    // Verificar existencia previa
    await this.obtenerPorClave(clave);

    // Actualizar dentro de withUser para que el trigger trg_config_au audite al usuario
    await withUser(currentUserId, async (conn) => {
      await conn.execute(
        'UPDATE configuraciones SET valor = ? WHERE clave = ?',
        [valorStr, clave]
      );
    });

    return await this.obtenerPorClave(clave);
  }
}
