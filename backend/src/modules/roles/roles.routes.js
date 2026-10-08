import { Router } from 'express';
import { RolesController } from './roles.controller.js';
import { requireAuth, requirePermission } from '../../middleware/auth.js';

export const rolesRouter = Router();

rolesRouter.use(requireAuth);

// Consulta de roles y catálogo de permisos (accesible con roles.gestionar o usuarios.gestionar)
rolesRouter.get('/', requirePermission('roles.gestionar', 'usuarios.gestionar'), RolesController.listar);
rolesRouter.get('/permisos/catalogo', requirePermission('roles.gestionar', 'usuarios.gestionar'), RolesController.listarPermisos);
rolesRouter.get('/:id', requirePermission('roles.gestionar', 'usuarios.gestionar'), RolesController.obtenerPorId);

// Modificación de permisos de un rol (solo con roles.gestionar)
rolesRouter.put('/:id/permisos', requirePermission('roles.gestionar'), RolesController.actualizarPermisos);
