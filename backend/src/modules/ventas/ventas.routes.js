import { Router } from 'express';
import { VentasController } from './ventas.controller.js';
import { requireAuth, requirePermission } from '../../middleware/auth.js';

export const ventasRouter = Router();

ventasRouter.use(requireAuth);

// Sugerencia de correlativo FAC-XXXX
ventasRouter.get(
  '/sugerir-factura',
  requirePermission('ventas.registrar'),
  VentasController.sugerirFactura
);

// Consulta de ventas
ventasRouter.get(
  '/',
  requirePermission('ventas.registrar', 'pagos.registrar', 'reportes.consultar'),
  VentasController.listar
);

ventasRouter.get(
  '/:id',
  requirePermission('ventas.registrar', 'pagos.registrar', 'reportes.consultar'),
  VentasController.obtenerPorId
);

// Registro y anulación de ventas
ventasRouter.post(
  '/',
  requirePermission('ventas.registrar'),
  VentasController.crear
);

ventasRouter.patch(
  '/:id/anular',
  requirePermission('ventas.registrar'),
  VentasController.anular
);
