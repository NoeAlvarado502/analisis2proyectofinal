import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().min(1, 'El usuario o correo es obligatorio'),
  password: z.string().min(1, 'La contraseña es obligatoria')
});
