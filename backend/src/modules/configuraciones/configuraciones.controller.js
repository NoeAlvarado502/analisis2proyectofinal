import { ConfiguracionesService } from './configuraciones.service.js';
import { successResponse } from '../../utils/response.js';

export class ConfiguracionesController {
  static async listar(req, res, next) {
    try {
      const data = await ConfiguracionesService.listar();
      res.json(successResponse(data));
    } catch (err) {
      next(err);
    }
  }

  static async obtenerPorClave(req, res, next) {
    try {
      const { clave } = req.params;
      const data = await ConfiguracionesService.obtenerPorClave(clave);
      res.json(successResponse(data));
    } catch (err) {
      next(err);
    }
  }

  static async actualizar(req, res, next) {
    try {
      const { clave } = req.params;
      const { valor } = req.body;
      const currentUserId = req.user.id_usuario;

      const data = await ConfiguracionesService.actualizar(clave, valor, currentUserId);
      res.json(successResponse(data, 'Parámetro de configuración actualizado correctamente'));
    } catch (err) {
      next(err);
    }
  }
}
