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

// Informe 1: Kardex Físico y Trazabilidad
reportesRouter.get(
  '/kardex',
  requirePermission('reportes.consultar', 'inventario.consultar'),
  ReportesController.kardex
);

// Informe 2: Valoración Total de Inventario
reportesRouter.get(
  '/valoracion-inventario',
  requirePermission('reportes.consultar', 'inventario.consultar'),
  ReportesController.valoracionInventario
);
