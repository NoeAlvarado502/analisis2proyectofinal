import { ReportesService } from './reportes.service.js';
import { successResponse } from '../../utils/response.js';

export class ReportesController {
  static async ventas(req, res, next) {
    try {
      const { fecha_desde, fecha_hasta, estado, q } = req.query;
      const result = await ReportesService.ventas({
        fecha_desde,
        fecha_hasta,
        estado,
        q
      });
      res.json(successResponse(result));
    } catch (err) {
      next(err);
    }
  }

  static async inventarioCritico(req, res, next) {
    try {
      const { fecha_desde, fecha_hasta } = req.query;
      const result = await ReportesService.inventarioCritico({
        fecha_desde,
        fecha_hasta
      });
      res.json(successResponse(result));
    } catch (err) {
      next(err);
    }
  }

  static async dashboard(req, res, next) {
    try {
      const result = await ReportesService.dashboard();
      res.json(successResponse(result));
    } catch (err) {
      next(err);
    }
  }
}
