import { RolesService } from './roles.service.js';
import { updateRolPermisosSchema } from './roles.schema.js';
import { successResponse } from '../../utils/response.js';

export class RolesController {
  static async listar(req, res, next) {
    try {
      const roles = await RolesService.listar();
      res.json(successResponse(roles));
    } catch (err) {
      next(err);
    }
  }

  static async obtenerPorId(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const rol = await RolesService.obtenerPorId(id);
      res.json(successResponse(rol));
    } catch (err) {
      next(err);
    }
  }

  static async listarPermisos(req, res, next) {
    try {
      const catalogo = await RolesService.listarPermisos();
      res.json(successResponse(catalogo));
    } catch (err) {
      next(err);
    }
  }

  static async actualizarPermisos(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const { permisos } = updateRolPermisosSchema.parse(req.body);
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
      const rolActualizado = await RolesService.actualizarPermisos(
        id,
        permisos,
        req.user.id_usuario,
        ip
      );
      res.json(successResponse(rolActualizado));
    } catch (err) {
      next(err);
    }
  }
}
