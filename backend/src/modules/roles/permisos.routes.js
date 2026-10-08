import { Router } from 'express';
import { RolesController } from './roles.controller.js';
import { requireAuth, requirePermission } from '../../middleware/auth.js';

export const permisosRouter = Router();

permisosRouter.use(requireAuth, requirePermission('roles.gestionar', 'usuarios.gestionar'));
permisosRouter.get('/', RolesController.listarPermisos);
