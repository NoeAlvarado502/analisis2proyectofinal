import { Router } from 'express';
import { UsuariosController } from './usuarios.controller.js';
import { requireAuth, requirePermission } from '../../middleware/auth.js';

export const usuariosRouter = Router();

// Todas las rutas de usuarios requieren autenticación y permiso 'usuarios.gestionar'
usuariosRouter.use(requireAuth, requirePermission('usuarios.gestionar'));

usuariosRouter.get('/', UsuariosController.listar);
usuariosRouter.post('/', UsuariosController.crear);
usuariosRouter.get('/:id', UsuariosController.obtenerPorId);
usuariosRouter.put('/:id', UsuariosController.actualizar);
usuariosRouter.patch('/:id/estado', UsuariosController.cambiarEstado);
usuariosRouter.patch('/:id/password', UsuariosController.resetPassword);
