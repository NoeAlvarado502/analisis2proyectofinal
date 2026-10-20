import { z } from 'zod';

export const createVentaSchema = z.object({
  id_pedido: z.coerce.number().int().positive('El id_pedido es obligatorio'),
  numero_factura: z
    .string()
    .trim()
    .max(50)
    .nullish()
    .transform(v => (v && v.trim() ? v.trim() : null)),
  pago_inicial: z
    .object({
      monto: z.coerce.number().positive('El monto del pago inicial debe ser mayor a 0'),
      metodo_pago: z.enum(['EFECTIVO', 'TARJETA_DEBITO', 'TARJETA_CREDITO', 'TRANSFERENCIA'], {
        errorMap: () => ({ message: 'Método de pago inválido. Use EFECTIVO, TARJETA_DEBITO, TARJETA_CREDITO o TRANSFERENCIA' })
      }),
      referencia_pago: z
        .string()
        .trim()
        .max(100)
        .nullish()
        .transform(v => (v && v.trim() ? v.trim() : null))
    })
    .optional()
});
