import { ComprasService } from './compras.service.js';
import { createCompraSchema, updateCompraSchema } from './compras.schema.js';
import { successResponse, parsePagination } from '../../utils/response.js';

export class ComprasController {
  static async listar(req, res, next) {
    try {
      const { page, limit } = parsePagination(req.query);
      const { q, id_proveedor, estado, fecha_desde, fecha_hasta } = req.query;
      const result = await ComprasService.listar({
        q,
        id_proveedor,
        estado,
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

  static async sugerirComprobante(req, res, next) {
    try {
      const result = await ComprasService.sugerirComprobante();
      res.json(successResponse(result));
    } catch (err) {
      next(err);
    }
  }

  static async obtenerPorId(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const compra = await ComprasService.obtenerPorId(id);
      res.json(successResponse(compra));
    } catch (err) {
      next(err);
    }
  }

  static async crear(req, res, next) {
    try {
      const validated = createCompraSchema.parse(req.body);
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
      const compra = await ComprasService.crear(
        validated,
        req.user.id_usuario,
        req.permissions || [],
        ip
      );
      res.status(201).json(successResponse(compra));
    } catch (err) {
      next(err);
    }
  }

  static async actualizar(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const validated = updateCompraSchema.parse(req.body);
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
      const compra = await ComprasService.actualizar(id, validated, req.user.id_usuario, ip);
      res.json(successResponse(compra));
    } catch (err) {
      next(err);
    }
  }

  static async recibir(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
      const compra = await ComprasService.recibir(id, req.user.id_usuario, ip);
      res.json(successResponse(compra));
    } catch (err) {
      next(err);
    }
  }

  static async anular(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
      const compra = await ComprasService.anular(id, req.user.id_usuario, ip);
      res.json(successResponse(compra));
    } catch (err) {
      next(err);
    }
  }
}
