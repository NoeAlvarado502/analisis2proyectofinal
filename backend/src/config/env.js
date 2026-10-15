import dotenv from 'dotenv';
import { z } from 'zod';

if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: '.env.test' });
} else {
  dotenv.config();
}

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  DB_HOST: z.string().min(1).default('127.0.0.1'),
  DB_PORT: z.coerce.number().default(3306),
  DB_USER: z.string().min(1).default('root'),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().min(1).default('jugueteria_db'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET debe tener al menos 16 caracteres'),
  JWT_EXPIRES_IN: z.string().default('8h'),
  DEMO_PASSWORD: z.string().default('Admin1234!'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Error de validación en variables de entorno:');
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const env = parsed.data;
