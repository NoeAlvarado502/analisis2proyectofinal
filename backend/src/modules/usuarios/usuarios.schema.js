import { z } from 'zod';

const passwordValidation = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .regex(/[a-zA-Z]/, 'La contraseña debe contener al menos una letra')
  .regex(/[0-9]/, 'La contraseña debe contener al menos un número');

export const createUsuarioSchema = z.object({
  nombre_completo: z.string().trim().min(2, 'El nombre completo es obligatorio').max(120),
  email: z.string().trim().email('El correo electrónico no es válido').max(120),
  password: passwordValidation,
  id_rol: z.coerce.number().int().positive('El rol seleccionado no es válido')
});

export const updateUsuarioSchema = z.object({
  nombre_completo: z.string().trim().min(2, 'El nombre completo es obligatorio').max(120),
  email: z.string().trim().email('El correo electrónico no es válido').max(120),
  id_rol: z.coerce.number().int().positive('El rol seleccionado no es válido')
});

export const updateEstadoSchema = z.object({
  activo: z.boolean({ required_error: 'El campo activo es obligatorio' })
});

export const resetPasswordSchema = z.object({
  new_password: passwordValidation
});
