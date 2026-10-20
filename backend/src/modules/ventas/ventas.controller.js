import { VentasService } from './ventas.service.js';
import { createVentaSchema } from './ventas.schema.js';
import { successResponse, parsePagination } from '../../utils/response.js';

export class VentasController {
  static async listar(req, res, next) {
    try {
      const { page, limit } = parsePagination(req.query);
      const { q, estado, id_cliente, con_saldo_pendiente, fecha_desde, fecha_hasta } = req.query;
      const result = await VentasService.listar({
        q,
        estado,
        id_cliente,
        con_saldo_pendiente,
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

  static async sugerirFactura(req, res, next) {
    try {
      const result = await VentasService.sugerirFactura();
      res.json(successResponse(result));
    } catch (err) {
      next(err);
    }
  }

  static async obtenerPorId(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const venta = await VentasService.obtenerPorId(id);
      res.json(successResponse(venta));
    } catch (err) {
      next(err);
    }
  }

  static async crear(req, res, next) {
    try {
      const validated = createVentaSchema.parse(req.body);
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
      const venta = await VentasService.crear(
        validated,
        req.user.id_usuario,
        req.permissions || [],
        ip
      );
      res.status(201).json(successResponse(venta));
    } catch (err) {
      next(err);
    }
  }

  static async anular(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
      const venta = await VentasService.anular(id, req.user.id_usuario, ip);
      res.json(successResponse(venta));
    } catch (err) {
      next(err);
    }
  }
}
