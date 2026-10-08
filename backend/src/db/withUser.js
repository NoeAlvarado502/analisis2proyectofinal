import { pool } from './pool.js';

/**
 * Ejecuta una operación transaccional asociando el ID de usuario a la variable de sesión
 * @usuario_actual e IP a @ip_origen en la conexión para cumplir con los triggers de auditoría.
 *
 * @param {number|null} userId - ID del usuario autenticado (o null para tareas de sistema)
 * @param {function(import('mysql2/promise').PoolConnection): Promise<any>} fn - Callback con la conexión
 * @param {string|null} ipOrigen - Dirección IP del cliente
 * @returns {Promise<any>} Resultado de la función
 */
export async function withUser(userId, fn, ipOrigen = null) {
  const connection = await pool.getConnection();
  try {
    // 1. Establecer variables de sesión para triggers de auditoría
    await connection.execute('SET @usuario_actual = ?, @ip_origen = ?', [
      userId ?? null,
      ipOrigen ?? null
    ]);

    // 2. Iniciar transacción
    await connection.beginTransaction();

    // 3. Ejecutar función con la conexión asignada
    const result = await fn(connection);

    // 4. Confirmar transacción
    await connection.commit();
    return result;
  } catch (error) {
    // Si algo falla, revertir transacción
    try {
      await connection.rollback();
    } catch (rbError) {
      console.error('Error al hacer rollback:', rbError);
    }
    throw error;
  } finally {
    // 5. Restablecer variables y liberar conexión al pool
    try {
      await connection.execute('SET @usuario_actual = NULL, @ip_origen = NULL');
    } catch (resetErr) {
      // Ignorar error al limpiar si la conexión se cerró
    }
    connection.release();
  }
}
