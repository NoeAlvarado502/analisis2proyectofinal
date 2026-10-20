import { z } from 'zod';

export const createPagoSchema = z.object({
  id_venta: z.coerce.number().int().positive('El id_venta es obligatorio'),
  numero_recibo: z
    .string()
    .trim()
    .max(50)
    .nullish()
    .transform(v => (v && v.trim() ? v.trim() : null)),
  monto: z.coerce.number().positive('El monto debe ser mayor a 0'),
  metodo_pago: z.enum(['EFECTIVO', 'TARJETA_DEBITO', 'TARJETA_CREDITO', 'TRANSFERENCIA'], {
    errorMap: () => ({ message: 'Método de pago inválido. Debe ser EFECTIVO, TARJETA_DEBITO, TARJETA_CREDITO o TRANSFERENCIA' })
  }),
  referencia_pago: z
    .string()
    .trim()
    .max(100)
    .nullish()
    .transform(v => (v && v.trim() ? v.trim() : null))
});
