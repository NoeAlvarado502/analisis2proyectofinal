import { z } from 'zod';

const optionalNit = z
  .string({ required_error: 'La identificación fiscal (NIT) es obligatoria' })
  .trim()
  .min(3, 'El NIT debe tener al menos 3 caracteres')
  .max(30, 'El NIT no puede exceder 30 caracteres')
  .refine(val => !val.startsWith('-') && !val.endsWith('-'), {
    message: 'El guion debe ir únicamente entre números (ej. 1234567-8)'
  })
  .refine(val => /^[0-9]+(-[0-9]+)?$/i.test(val) || /^NIT-[\w-]+$/i.test(val), {
    message: 'El NIT solo puede contener números y un guion intermedio (ej. 1234567-8)'
  });

const optionalPhone = z
  .string()
  .nullish()
  .transform(val => {
    if (!val || typeof val !== 'string' || val.trim() === '') return null;
    return val.trim();
  })
  .refine(val => val === null || !/[a-zA-Z]/.test(val), {
    message: 'El número de teléfono no puede contener letras'
  })
  .refine(val => val === null || /^\+?[0-9\s-]{7,20}$/.test(val), {
    message: 'El formato de teléfono no es válido'
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

const optionalContacto = z
  .string()
  .nullish()
  .transform(val => {
    if (!val || typeof val !== 'string' || val.trim() === '') return null;
    return val.trim();
  })
  .refine(val => val === null || !/^\d+$/.test(val), {
    message: 'El nombre de contacto no puede ser únicamente numérico'
  })
  .refine(val => val === null || /[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/.test(val), {
    message: 'El nombre de contacto debe contener al menos una letra'
  });

const optionalDireccion = z
  .string()
  .nullish()
  .transform(val => {
    if (!val || typeof val !== 'string' || val.trim() === '') return null;
    return val.trim();
  })
  .refine(val => val === null || !/^\d+$/.test(val), {
    message: 'La dirección de facturación no puede ser únicamente numérica'
  })
  .refine(val => val === null || /[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/.test(val), {
    message: 'La dirección de facturación debe contener al menos una letra'
  });

export const createProveedorSchema = z.object({
  identificacion_fiscal: optionalNit,
  razon_social: z
    .string({ required_error: 'La razón social es obligatoria' })
    .trim()
    .min(2, 'La razón social debe tener al menos 2 caracteres')
    .max(150, 'La razón social no puede exceder 150 caracteres')
    .refine(val => !/^\d+$/.test(val), {
      message: 'La razón social no puede ser únicamente numérica'
    })
    .refine(val => /[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/.test(val), {
      message: 'La razón social debe contener al menos una letra'
    }),
  contacto_nombre: optionalContacto,
  telefono: optionalPhone,
  email: optionalEmail,
  direccion: optionalDireccion
});

export const updateProveedorSchema = createProveedorSchema;

export const updateEstadoProveedorSchema = z.object({
  activo: z.boolean({ required_error: 'El campo activo es obligatorio' })
});
