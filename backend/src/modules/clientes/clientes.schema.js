import { z } from 'zod';

const optionalSanitizedString = z
  .string()
  .nullish()
  .transform(val => {
    if (!val || typeof val !== 'string' || val.trim() === '') return null;
    return val.trim();
  });

const optionalEmail = z
  .string()
  .nullish()
  .transform(val => {
    if (!val || typeof val !== 'string' || val.trim() === '') return null;
    return val.trim();
  })
  .refine(val => val === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
    message: 'El correo electrónico no tiene un formato válido'
  });

export const createClienteSchema = z.object({
  nombre_razon_social: z.string().trim().min(2, 'El nombre o razón social es obligatorio').max(150),
  identificacion: optionalSanitizedString,
  telefono: optionalSanitizedString,
  email: optionalEmail,
  direccion: optionalSanitizedString
});

export const updateClienteSchema = createClienteSchema;

export const updateEstadoClienteSchema = z.object({
  activo: z.boolean({ required_error: 'El campo activo es obligatorio' })
});
