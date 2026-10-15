import { Router } from 'express';
import { ComprasController } from './compras.controller.js';
import { requireAuth, requirePermission } from '../../middleware/auth.js';

export const comprasRouter = Router();

comprasRouter.use(requireAuth);

// Sugerencia de correlativo para comprobante
comprasRouter.get(
  '/sugerir-comprobante',
  requirePermission('compras.registrar'),
  ComprasController.sugerirComprobante
);

// Consultas de compras
comprasRouter.get(
  '/',
  requirePermission('compras.registrar', 'compras.recibir', 'inventario.consultar'),
  ComprasController.listar
);

comprasRouter.get(
  '/:id',
  requirePermission('compras.registrar', 'compras.recibir', 'inventario.consultar'),
  ComprasController.obtenerPorId
);

// Gestión de compras
comprasRouter.post(
  '/',
  requirePermission('compras.registrar'),
  ComprasController.crear
);

comprasRouter.put(
  '/:id',
  requirePermission('compras.registrar'),
  ComprasController.actualizar
);

comprasRouter.patch(
  '/:id/recibir',
  requirePermission('compras.recibir'),
  ComprasController.recibir
);

comprasRouter.patch(
  '/:id/anular',
  requirePermission('compras.registrar'),
  ComprasController.anular
);
