import { Router } from 'express';
import { ProductosController } from './productos.controller.js';
import { requireAuth, requirePermission } from '../../middleware/auth.js';

export const marcasRouter = Router();

marcasRouter.use(requireAuth);

marcasRouter.get('/', requirePermission('productos.consultar', 'productos.gestionar'), ProductosController.listarMarcas);
marcasRouter.post('/', requirePermission('productos.gestionar'), ProductosController.crearMarca);
