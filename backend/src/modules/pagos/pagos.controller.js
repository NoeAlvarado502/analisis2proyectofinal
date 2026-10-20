import { PagosService } from './pagos.service.js';
import { createPagoSchema } from './pagos.schema.js';
import { successResponse, parsePagination } from '../../utils/response.js';

export class PagosController {
  static async listar(req, res, next) {
    try {
      const { page, limit } = parsePagination(req.query);
      const { q, id_venta, metodo_pago, fecha_desde, fecha_hasta } = req.query;
      const result = await PagosService.listar({
        q,
        id_venta,
        metodo_pago,
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

  static async sugerirRecibo(req, res, next) {
    try {
      const result = await PagosService.sugerirRecibo();
      res.json(successResponse(result));
    } catch (err) {
      next(err);
    }
  }

  static async crear(req, res, next) {
    try {
      const validated = createPagoSchema.parse(req.body);
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
      const result = await PagosService.crear(
        validated,
        req.user.id_usuario,
        ip
      );
      res.status(201).json(successResponse(result));
    } catch (err) {
      next(err);
    }
  }
}
