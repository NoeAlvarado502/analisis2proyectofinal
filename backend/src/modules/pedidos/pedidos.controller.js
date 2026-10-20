import { PedidosService } from './pedidos.service.js';
import { createPedidoSchema, updatePedidoSchema, autorizarPedidoSchema } from './pedidos.schema.js';
import { successResponse, parsePagination } from '../../utils/response.js';

export class PedidosController {
  static async listar(req, res, next) {
    try {
      const { page, limit } = parsePagination(req.query);
      const { q, id_cliente, estado, requiere_autorizacion, fecha_desde, fecha_hasta } = req.query;
      const result = await PedidosService.listar({
        q,
        id_cliente,
        estado,
        requiere_autorizacion,
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

  static async sugerirNumero(req, res, next) {
    try {
      const result = await PedidosService.sugerirNumero();
      res.json(successResponse(result));
    } catch (err) {
      next(err);
    }
  }

  static async obtenerPorId(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const pedido = await PedidosService.obtenerPorId(id);
      res.json(successResponse(pedido));
    } catch (err) {
      next(err);
    }
  }

  static async crear(req, res, next) {
    try {
      const validated = createPedidoSchema.parse(req.body);
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
      const pedido = await PedidosService.crear(
        validated,
        req.user.id_usuario,
        ip
      );
      res.status(201).json(successResponse(pedido));
    } catch (err) {
      next(err);
    }
  }

  static async actualizar(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const validated = updatePedidoSchema.parse(req.body);
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
      const pedido = await PedidosService.actualizar(id, validated, req.user.id_usuario, ip);
      res.json(successResponse(pedido));
    } catch (err) {
      next(err);
    }
  }

  static async enviar(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
      const pedido = await PedidosService.enviar(id, req.user.id_usuario, ip);
      res.json(successResponse(pedido));
    } catch (err) {
      next(err);
    }
  }

  static async autorizar(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const validated = autorizarPedidoSchema.parse(req.body);
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
      const pedido = await PedidosService.autorizar(
        id,
        validated.motivo_descuento_especial,
        req.user.id_usuario,
        ip
      );
      res.json(successResponse(pedido));
    } catch (err) {
      next(err);
    }
  }

  static async cancelar(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
      const pedido = await PedidosService.cancelar(
        id,
        req.user.id_usuario,
        req.permissions || [],
        ip
      );
      res.json(successResponse(pedido));
    } catch (err) {
      next(err);
    }
  }
}
