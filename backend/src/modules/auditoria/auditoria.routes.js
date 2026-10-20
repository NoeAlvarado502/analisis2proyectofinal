import { Router } from 'express';
import { AuditoriaController } from './auditoria.controller.js';
import { requireAuth, requirePermission } from '../../middleware/auth.js';

export const auditoriaRouter = Router();

auditoriaRouter.use(requireAuth);

auditoriaRouter.get(
  '/',
  requirePermission('auditoria.consultar'),
  AuditoriaController.listar
);
