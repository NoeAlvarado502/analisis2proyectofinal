import bcrypt from 'bcryptjs';
import { pool } from '../src/db/pool.js';
import { env } from '../src/config/env.js';

async function seedPasswords() {
  console.log('🔐 Generando hashes de contraseña para usuarios demo...');

  const users = [
    { username: 'admin', password: 'admin' },
    { username: 'supervisor', password: 'supervisor' },
    { username: 'operador', password: 'operador' }
  ];

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10);
    const [result] = await pool.execute(
      `UPDATE usuarios
       SET password_hash = ?, email = ?
       WHERE email = ? OR email = ? OR email LIKE ?`,
      [hash, u.username, u.username, `${u.username}@jugueteria.local`, `%${u.username}%`]
    );
    console.log(`✅ Usuario '${u.username}' configurado con contraseña '${u.password}' (${result.affectedRows} filas).`);
  }

  await pool.end();
}

seedPasswords().catch(err => {
  console.error('❌ Error al actualizar contraseñas:', err);
  process.exit(1);
});
