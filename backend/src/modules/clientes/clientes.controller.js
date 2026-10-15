import { ClientesService } from './clientes.service.js';
import {
  createClienteSchema,
  updateClienteSchema,
  updateEstadoClienteSchema
} from './clientes.schema.js';
import { successResponse, parsePagination } from '../../utils/response.js';

export class ClientesController {
  static async listar(req, res, next) {
    try {
      const { page, limit } = parsePagination(req.query);
      const { q, activo } = req.query;
      const result = await ClientesService.listar({ q, activo, page, limit });
      res.json(successResponse(result.data, result.meta));
    } catch (err) {
      next(err);
    }
  }

  static async obtenerPorId(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const cliente = await ClientesService.obtenerPorId(id);
      res.json(successResponse(cliente));
    } catch (err) {
      next(err);
    }
  }

  static async crear(req, res, next) {
    try {
      const validated = createClienteSchema.parse(req.body);
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
      const cliente = await ClientesService.crear(validated, req.user.id_usuario, ip);
      res.status(201).json(successResponse(cliente));
    } catch (err) {
      next(err);
    }
  }

  static async actualizar(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const validated = updateClienteSchema.parse(req.body);
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
      const cliente = await ClientesService.actualizar(id, validated, req.user.id_usuario, ip);
      res.json(successResponse(cliente));
    } catch (err) {
      next(err);
    }
  }

  static async cambiarEstado(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      let activo;
      if (req.body && req.body.activo !== undefined) {
        ({ activo } = updateEstadoClienteSchema.parse(req.body));
      } else {
        const actual = await ClientesService.obtenerPorId(id);
        activo = !actual.activo;
      }
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
      const cliente = await ClientesService.cambiarEstado(id, activo, req.user.id_usuario, ip);
      res.json(successResponse(cliente));
    } catch (err) {
      next(err);
    }
  }
}
