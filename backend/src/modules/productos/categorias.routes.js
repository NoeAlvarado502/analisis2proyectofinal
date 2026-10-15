import { Router } from 'express';
import { ProductosController } from './productos.controller.js';
import { requireAuth, requirePermission } from '../../middleware/auth.js';

export const categoriasRouter = Router();

categoriasRouter.use(requireAuth);

categoriasRouter.get('/', requirePermission('productos.consultar', 'productos.gestionar'), ProductosController.listarCategorias);
categoriasRouter.post('/', requirePermission('productos.gestionar'), ProductosController.crearCategoria);
