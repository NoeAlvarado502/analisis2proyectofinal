import { Router } from 'express';
import { PagosController } from './pagos.controller.js';
import { requireAuth, requirePermission } from '../../middleware/auth.js';

export const pagosRouter = Router();

pagosRouter.use(requireAuth);

// Sugerencia de correlativo REC-XXXX
pagosRouter.get(
  '/sugerir-recibo',
  requirePermission('pagos.registrar'),
  PagosController.sugerirRecibo
);

// Consulta de pagos
pagosRouter.get(
  '/',
  requirePermission('pagos.registrar', 'ventas.registrar', 'reportes.consultar'),
  PagosController.listar
);

// Registro de pagos
pagosRouter.post(
  '/',
  requirePermission('pagos.registrar'),
  PagosController.crear
);
