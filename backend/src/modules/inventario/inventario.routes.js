import { Router } from 'express';
import { InventarioController } from './inventario.controller.js';
import { requireAuth, requirePermission } from '../../middleware/auth.js';

export const inventarioRouter = Router();

inventarioRouter.use(requireAuth);

// Consultas de existencias, kardex y alertas (requiere permiso inventario.consultar)
inventarioRouter.get(
  '/',
  requirePermission('inventario.consultar'),
  InventarioController.listar
);

inventarioRouter.get(
  '/movimientos',
  requirePermission('inventario.consultar'),
  InventarioController.listarMovimientos
);

inventarioRouter.get(
  '/alertas',
  requirePermission('inventario.consultar'),
  InventarioController.obtenerAlertas
);

// Ajustes de inventario (requiere permiso inventario.ajustar)
inventarioRouter.post(
  '/ajustes',
  requirePermission('inventario.ajustar'),
  InventarioController.registrarAjuste
);

// Actualización de stock mínimo (requiere productos.gestionar o inventario.ajustar)
inventarioRouter.patch(
  '/:id_producto/stock-minimo',
  requirePermission('productos.gestionar', 'inventario.ajustar'),
  InventarioController.actualizarStockMinimo
);
