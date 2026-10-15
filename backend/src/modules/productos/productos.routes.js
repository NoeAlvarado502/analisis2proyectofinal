import { Router } from 'express';
import { ProductosController } from './productos.controller.js';
import { requireAuth, requirePermission } from '../../middleware/auth.js';

export const productosRouter = Router();

productosRouter.use(requireAuth);

// Sugerencia de SKU automático según marca y categoría
productosRouter.get('/sugerir-sku', requirePermission('productos.gestionar'), ProductosController.sugerirSku);

// Consultas de productos
productosRouter.get('/', requirePermission('productos.consultar', 'productos.gestionar'), ProductosController.listar);
productosRouter.get('/:id', requirePermission('productos.consultar', 'productos.gestionar'), ProductosController.obtenerPorId);

// Modificaciones de productos (solo con productos.gestionar)
productosRouter.post('/', requirePermission('productos.gestionar'), ProductosController.crear);
productosRouter.put('/:id', requirePermission('productos.gestionar'), ProductosController.actualizar);
productosRouter.patch('/:id/estado', requirePermission('productos.gestionar'), ProductosController.cambiarEstado);
