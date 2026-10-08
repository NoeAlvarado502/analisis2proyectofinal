import bcrypt from 'bcryptjs';
import { pool } from '../src/db/pool.js';
import { env } from '../src/config/env.js';

async function seedPasswords() {
  console.log('🔐 Generando hashes de contraseña para usuarios demo...');
  const password = env.DEMO_PASSWORD;
  const hash = await bcrypt.hash(password, 10);

  const [result] = await pool.execute(
    `UPDATE usuarios
     SET password_hash = ?
     WHERE email IN ('admin@jugueteria.local', 'supervisor@jugueteria.local', 'operador@jugueteria.local')`,
    [hash]
  );

  console.log(`✅ Contraseñas actualizadas para ${result.affectedRows} usuarios.`);
  console.log(`🔑 Contraseña demo configurada: ${password}`);
  console.log(`📧 Usuarios:
  - admin@jugueteria.local (Administrador)
  - supervisor@jugueteria.local (Supervisor)
  - operador@jugueteria.local (Operador)`);

  await pool.end();
}

seedPasswords().catch(err => {
  console.error('❌ Error al actualizar contraseñas:', err);
  process.exit(1);
});
