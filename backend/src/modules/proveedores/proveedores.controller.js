import { ProveedoresService } from './proveedores.service.js';
import {
  createProveedorSchema,
  updateProveedorSchema,
  updateEstadoProveedorSchema
} from './proveedores.schema.js';
import { successResponse, parsePagination } from '../../utils/response.js';

export class ProveedoresController {
  static async listar(req, res, next) {
    try {
      const { page, limit } = parsePagination(req.query);
      const { q, activo } = req.query;
      const result = await ProveedoresService.listar({ q, activo, page, limit });
      res.json(successResponse(result.data, result.meta));
    } catch (err) {
      next(err);
    }
  }

  static async obtenerPorId(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const proveedor = await ProveedoresService.obtenerPorId(id);
      res.json(successResponse(proveedor));
    } catch (err) {
      next(err);
    }
  }

  static async crear(req, res, next) {
    try {
      const validated = createProveedorSchema.parse(req.body);
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
      const proveedor = await ProveedoresService.crear(validated, req.user.id_usuario, ip);
      res.status(201).json(successResponse(proveedor));
    } catch (err) {
      next(err);
    }
  }

  static async actualizar(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const validated = updateProveedorSchema.parse(req.body);
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
      const proveedor = await ProveedoresService.actualizar(id, validated, req.user.id_usuario, ip);
      res.json(successResponse(proveedor));
    } catch (err) {
      next(err);
    }
  }

  static async cambiarEstado(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      let activo;
      if (req.body && req.body.activo !== undefined) {
        ({ activo } = updateEstadoProveedorSchema.parse(req.body));
      } else {
        const actual = await ProveedoresService.obtenerPorId(id);
        activo = !actual.activo;
      }
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
      const proveedor = await ProveedoresService.cambiarEstado(id, activo, req.user.id_usuario, ip);
      res.json(successResponse(proveedor));
    } catch (err) {
      next(err);
    }
  }
}
