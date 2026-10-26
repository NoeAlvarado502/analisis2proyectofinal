import { Router } from 'express';
import { PedidosController } from './pedidos.controller.js';
import { requireAuth, requirePermission } from '../../middleware/auth.js';

export const pedidosRouter = Router();

pedidosRouter.use(requireAuth);

// Sugerencia de correlativo PED-XXXX y configuración de descuento máximo
pedidosRouter.get(
  '/sugerir-numero',
  requirePermission('pedidos.crear', 'pedidos.autorizar_descuento', 'ventas.registrar'),
  PedidosController.sugerirNumero
);

// Consulta de pedidos
pedidosRouter.get(
  '/',
  requirePermission('pedidos.crear', 'pedidos.autorizar_descuento', 'ventas.registrar', 'reportes.consultar'),
  PedidosController.listar
);

pedidosRouter.get(
  '/:id',
  requirePermission('pedidos.crear', 'pedidos.autorizar_descuento', 'ventas.registrar', 'reportes.consultar'),
  PedidosController.obtenerPorId
);

// Creación y modificación de pedidos
pedidosRouter.post(
  '/',
  requirePermission('pedidos.crear'),
  PedidosController.crear
);

pedidosRouter.put(
  '/:id',
  requirePermission('pedidos.crear'),
  PedidosController.actualizar
);

// Flujo de estados
pedidosRouter.patch(
  '/:id/enviar',
  requirePermission('pedidos.crear'),
  PedidosController.enviar
);

pedidosRouter.put(
  '/:id/enviar',
  requirePermission('pedidos.crear'),
  PedidosController.enviar
);

pedidosRouter.patch(
  '/:id/autorizar',
  requirePermission('pedidos.autorizar_descuento'),
  PedidosController.autorizar
);

pedidosRouter.put(
  '/:id/autorizar',
  requirePermission('pedidos.autorizar_descuento'),
  PedidosController.autorizar
);

pedidosRouter.patch(
  '/:id/cancelar',
  requirePermission('pedidos.cancelar', 'pedidos.crear'),
  PedidosController.cancelar
);

pedidosRouter.put(
  '/:id/cancelar',
  requirePermission('pedidos.cancelar', 'pedidos.crear'),
  PedidosController.cancelar
);
