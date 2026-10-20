import { AuditoriaService } from './auditoria.service.js';
import { successResponse, parsePagination } from '../../utils/response.js';

export class AuditoriaController {
  static async listar(req, res, next) {
    try {
      const { page, limit } = parsePagination(req.query, 20);
      const { q, modulo, accion, id_usuario, fecha_desde, fecha_hasta } = req.query;
      const result = await AuditoriaService.listar({
        q,
        modulo,
        accion,
        id_usuario,
        fecha_desde,
        fecha_hasta,
        page,
        limit
      });
      res.json(successResponse(result.data, result.meta));
    } catch (err) {
      next(err);
    }
  }
}
