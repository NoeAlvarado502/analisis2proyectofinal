import { Router } from 'express';
import { ProveedoresController } from './proveedores.controller.js';
import { requireAuth, requirePermission } from '../../middleware/auth.js';

export const proveedoresRouter = Router();

proveedoresRouter.use(requireAuth);

// Consultas (autenticado)
proveedoresRouter.get('/', ProveedoresController.listar);
proveedoresRouter.get('/:id', ProveedoresController.obtenerPorId);

// Modificaciones (requiere permiso proveedores.gestionar)
proveedoresRouter.post('/', requirePermission('proveedores.gestionar'), ProveedoresController.crear);
proveedoresRouter.put('/:id', requirePermission('proveedores.gestionar'), ProveedoresController.actualizar);
proveedoresRouter.patch('/:id/estado', requirePermission('proveedores.gestionar'), ProveedoresController.cambiarEstado);
