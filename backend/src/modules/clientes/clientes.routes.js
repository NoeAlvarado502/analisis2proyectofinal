import { Router } from 'express';
import { ClientesController } from './clientes.controller.js';
import { requireAuth, requirePermission } from '../../middleware/auth.js';

export const clientesRouter = Router();

clientesRouter.use(requireAuth);

// Consultas (con clientes.consultar o clientes.gestionar)
clientesRouter.get('/', requirePermission('clientes.consultar', 'clientes.gestionar'), ClientesController.listar);
clientesRouter.get('/:id', requirePermission('clientes.consultar', 'clientes.gestionar'), ClientesController.obtenerPorId);

// Modificaciones (solo con clientes.gestionar)
clientesRouter.post('/', requirePermission('clientes.gestionar'), ClientesController.crear);
clientesRouter.put('/:id', requirePermission('clientes.gestionar'), ClientesController.actualizar);
clientesRouter.patch('/:id/estado', requirePermission('clientes.gestionar'), ClientesController.cambiarEstado);
