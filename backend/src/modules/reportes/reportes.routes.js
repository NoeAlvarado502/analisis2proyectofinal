import { Router } from 'express';
import { ReportesController } from './reportes.controller.js';
import { requireAuth, requirePermission } from '../../middleware/auth.js';

export const reportesRouter = Router();

reportesRouter.use(requireAuth);

// Reporte consolidado de ventas
reportesRouter.get(
  '/ventas',
  requirePermission('reportes.consultar'),
  ReportesController.ventas
);

// Reporte de productos bajo stock mínimo y movimientos
reportesRouter.get(
  '/inventario-critico',
  requirePermission('reportes.consultar', 'inventario.consultar'),
  ReportesController.inventarioCritico
);

// Métricas e indicadores del dashboard (para usuarios autenticados)
reportesRouter.get(
  '/dashboard',
  ReportesController.dashboard
);
