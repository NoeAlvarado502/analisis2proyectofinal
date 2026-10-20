import { z } from 'zod';

const optionalText = z
  .string()
  .nullish()
  .transform(val => {
    if (!val || typeof val !== 'string' || val.trim() === '') return null;
    return val.trim();
  });

const itemDetallePedidoSchema = z.object({
  id_producto: z.coerce.number().int().positive('El id_producto es obligatorio'),
  cantidad: z.coerce
    .number()
    .int('La cantidad debe ser un número entero')
    .positive('La cantidad debe ser mayor a 0'),
  porcentaje_descuento_extra: z.coerce
    .number()
    .min(0, 'El descuento extra no puede ser negativo')
    .max(100, 'El descuento extra no puede ser mayor a 100')
    .optional()
    .default(0)
});

export const createPedidoSchema = z.object({
  numero_pedido: z
    .string()
    .trim()
    .max(50)
    .nullish()
    .transform(v => (v && v.trim() ? v.trim() : null)),
  id_cliente: z.coerce.number().int().positive('El cliente es obligatorio'),
  observaciones: optionalText,
  motivo_descuento_especial: optionalText,
  detalles: z.array(itemDetallePedidoSchema).min(1, 'Debe incluir al menos un producto en el pedido'),
  enviar_inmediatamente: z.boolean().optional().default(false)
});

export const updatePedidoSchema = z.object({
  observaciones: optionalText,
  motivo_descuento_especial: optionalText,
  detalles: z.array(itemDetallePedidoSchema).min(1, 'Debe incluir al menos un producto en el pedido').optional()
});

export const autorizarPedidoSchema = z.object({
  motivo_descuento_especial: z
    .string()
    .trim()
    .min(1, 'Debe indicarse el motivo del descuento especial')
    .max(255, 'El motivo no puede exceder 255 caracteres')
});
