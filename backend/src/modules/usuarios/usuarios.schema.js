import { z } from 'zod';

const passwordValidation = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .regex(/[a-zA-Z]/, 'La contraseña debe contener al menos una letra')
  .regex(/[0-9]/, 'La contraseña debe contener al menos un número');

const nombreValidation = z
  .string({ required_error: 'El nombre completo es obligatorio' })
  .trim()
  .min(3, 'El nombre debe tener al menos 3 caracteres')
  .max(120, 'El nombre no puede exceder 120 caracteres')
  .refine((val) => !/[0-9]/.test(val), {
    message: 'El nombre no puede contener números'
  })
  .refine((val) => /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.'-]+$/.test(val), {
    message: 'El nombre solo debe contener letras y espacios'
  });

const emailValidation = z
  .string({ required_error: 'El correo electrónico es obligatorio' })
  .trim()
  .max(120, 'El correo no puede exceder 120 caracteres')
  .regex(
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    'El correo electrónico debe tener un formato válido (ej. usuario@empresa.com)'
  );

export const createUsuarioSchema = z.object({
  nombre_completo: nombreValidation,
  email: emailValidation,
  password: passwordValidation,
  id_rol: z.coerce.number().int().positive('El rol seleccionado no es válido')
});

export const updateUsuarioSchema = z.object({
  nombre_completo: nombreValidation,
  email: emailValidation,
  id_rol: z.coerce.number().int().positive('El rol seleccionado no es válido')
});

export const updateEstadoSchema = z.object({
  activo: z.boolean({ required_error: 'El campo activo es obligatorio' })
});

export const resetPasswordSchema = z.object({
  new_password: passwordValidation
});
