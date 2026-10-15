import { z } from 'zod';

export const ajusteInventarioSchema = z.object({
  id_producto: z.coerce.number().int().positive('El id_producto es obligatorio'),
  tipo_movimiento: z.enum(['AJUSTE', 'DEVOLUCION']).default('AJUSTE'),
  cantidad: z.coerce.number().int().refine(val => val !== 0, {
    message: 'La cantidad no puede ser cero'
  }),
  motivo: z.string().trim()
    .min(3, 'El motivo es obligatorio (mínimo 3 caracteres)')
    .max(255)
    .refine(val => !/^\d+$/.test(val), {
      message: 'El motivo no puede ser solo números'
    }),
  documento_tipo: z.string().trim().max(30).optional().default('AJUSTE_FISICO'),
  documento_id: z.string().trim().max(50).optional()
}).refine(data => {
  if (data.tipo_movimiento === 'DEVOLUCION' && data.cantidad < 0) {
    return false;
  }
  return true;
}, {
  message: 'Para DEVOLUCION la cantidad debe ser positiva',
  path: ['cantidad']
});

export const updateStockMinimoSchema = z.object({
  stock_minimo: z.coerce.number().int().min(0, 'El stock mínimo no puede ser negativo')
});
