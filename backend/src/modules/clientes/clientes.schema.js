import { z } from 'zod';

const optionalNit = z
  .string()
  .nullish()
  .transform(val => {
    if (!val || typeof val !== 'string' || val.trim() === '') return null;
    const trimmed = val.trim().toUpperCase();
    if (trimmed === 'C/F' || trimmed === 'CF') return null;
    return trimmed;
  })
  .refine(
    val => val === null || /^(C\/F|CF|[0-9]+(-[0-9]+)?|NIT-\d+)$/i.test(val),
    {
      message: 'El NIT solo puede ser C/F o números con guion intermedio (ej. 1234567-8)'
    }
  );

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

export const createClienteSchema = z.object({
  nombre_razon_social: z
    .string({ required_error: 'El nombre o razón social es obligatorio' })
    .trim()
    .min(2, 'El nombre o razón social debe tener al menos 2 caracteres')
    .max(150, 'El nombre no puede exceder 150 caracteres')
    .refine(val => !/^\d+$/.test(val), {
      message: 'El nombre o razón social no puede ser únicamente numérico'
    })
    .refine(val => /[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/.test(val), {
      message: 'El nombre o razón social debe contener al menos una letra'
    }),
  identificacion: optionalNit,
  telefono: optionalPhone,
  email: optionalEmail,
  direccion: optionalDireccion
});

export const updateClienteSchema = createClienteSchema;

export const updateEstadoClienteSchema = z.object({
  activo: z.boolean({ required_error: 'El campo activo es obligatorio' })
});
