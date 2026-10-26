import { Router } from 'express';
import { ConfiguracionesController } from './configuraciones.controller.js';
import { requireAuth, requirePermission } from '../../middleware/auth.js';

export const configuracionesRouter = Router();

configuracionesRouter.use(requireAuth);

// Consultar parámetros (autenticado)
configuracionesRouter.get('/', ConfiguracionesController.listar);
configuracionesRouter.get('/:clave', ConfiguracionesController.obtenerPorClave);

// Modificar parámetros (protegido por permiso de configuración)
configuracionesRouter.put(
  '/:clave',
  requirePermission('configuracion.gestionar'),
  ConfiguracionesController.actualizar
);
