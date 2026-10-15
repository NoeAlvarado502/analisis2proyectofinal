import { z } from 'zod';

const optionalObservaciones = z
  .string()
  .nullish()
  .transform(val => {
    if (!val || typeof val !== 'string' || val.trim() === '') return null;
    return val.trim();
  })
  .refine(val => val === null || !/^\d+$/.test(val), {
    message: 'Las observaciones no pueden ser únicamente numéricas'
  })
  .refine(val => val === null || /[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/.test(val), {
    message: 'Las observaciones deben contener al menos una letra descriptiva'
  });

const itemDetalleSchema = z.object({
  id_producto: z.coerce.number().int().positive('El id_producto es obligatorio'),
  cantidad: z.coerce
    .number()
    .int('La cantidad debe ser un número entero sin decimales')
    .positive('La cantidad debe ser mayor a 0'),
  costo_unitario: z.coerce
    .number()
    .positive('El costo unitario debe ser mayor a 0')
    .refine(v => /^\d+(\.\d{1,2})?$/.test(String(v)), {
      message: 'El costo unitario no puede tener más de 2 decimales'
    })
});

export const createCompraSchema = z.object({
  numero_comprobante: z
    .string()
    .trim()
    .max(50)
    .nullish()
    .transform(v => (v && v.trim() ? v.trim() : null)),
  id_proveedor: z.coerce.number().int().positive('El proveedor es obligatorio'),
  observaciones: optionalObservaciones,
  detalles: z.array(itemDetalleSchema).min(1, 'Debe incluir al menos un producto en el detalle'),
  recibir_inmediatamente: z.boolean().optional().default(false)
});

export const updateCompraSchema = z.object({
  observaciones: optionalObservaciones,
  detalles: z.array(itemDetalleSchema).min(1, 'Debe incluir al menos un producto en el detalle').optional()
});
