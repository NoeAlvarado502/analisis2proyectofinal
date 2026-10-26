import { ReportesService } from './reportes.service.js';
import { successResponse } from '../../utils/response.js';

export class ReportesController {
  static async ventas(req, res, next) {
    try {
      const { fecha_desde, fecha_hasta, fecha_inicio, fecha_fin, estado, q } = req.query;
      const result = await ReportesService.ventas({
        fecha_desde,
        fecha_hasta,
        fecha_inicio,
        fecha_fin,
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
      const { fecha_desde, fecha_hasta, fecha_inicio, fecha_fin } = req.query;
      const result = await ReportesService.inventarioCritico({
        fecha_desde: fecha_inicio || fecha_desde,
        fecha_hasta: fecha_fin || fecha_hasta
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

  static async kardex(req, res, next) {
    try {
      const {
        fecha_desde,
        fecha_hasta,
        fecha_inicio,
        fecha_fin,
        id_producto,
        codigo_sku,
        id_categoria,
        tipo_movimiento,
        documento_tipo,
        orden,
        q
      } = req.query;

      const result = await ReportesService.kardex({
        fecha_desde,
        fecha_hasta,
        fecha_inicio,
        fecha_fin,
        id_producto,
        codigo_sku,
        id_categoria,
        tipo_movimiento,
        documento_tipo,
        orden,
        q
      });
      res.json(successResponse(result));
    } catch (err) {
      next(err);
    }
  }

  static async valoracionInventario(req, res, next) {
    try {
      const {
        id_categoria,
        id_marca,
        estado_stock,
        activo,
        q
      } = req.query;

      const result = await ReportesService.valoracionInventario({
        id_categoria,
        id_marca,
        estado_stock,
        activo,
        q
      });
      res.json(successResponse(result));
    } catch (err) {
      next(err);
    }
  }

  static async valoracion(req, res, next) {
    return ReportesController.valoracionInventario(req, res, next);
  }

  static async compras(req, res, next) {
    try {
      const {
        fecha_desde,
        fecha_hasta,
        fecha_inicio,
        fecha_fin,
        id_proveedor,
        estado,
        q
      } = req.query;

      const result = await ReportesService.compras({
        fecha_desde,
        fecha_hasta,
        fecha_inicio,
        fecha_fin,
        id_proveedor,
        estado,
        q
      });
      res.json(successResponse(result));
    } catch (err) {
      next(err);
    }
  }
}
