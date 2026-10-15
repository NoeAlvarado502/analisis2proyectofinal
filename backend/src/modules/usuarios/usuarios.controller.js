import { UsuariosService } from './usuarios.service.js';
import {
  createUsuarioSchema,
  updateUsuarioSchema,
  updateEstadoSchema,
  resetPasswordSchema
} from './usuarios.schema.js';
import { successResponse, parsePagination } from '../../utils/response.js';

export class UsuariosController {
  static async listar(req, res, next) {
    try {
      const { page, limit } = parsePagination(req.query);
      const { q, activo } = req.query;
      const result = await UsuariosService.listar({ q, activo, page, limit });
      res.json(successResponse(result.data, result.meta));
    } catch (err) {
      next(err);
    }
  }

  static async obtenerPorId(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const usuario = await UsuariosService.obtenerPorId(id);
      res.json(successResponse(usuario));
    } catch (err) {
      next(err);
    }
  }

  static async crear(req, res, next) {
    try {
      const validated = createUsuarioSchema.parse(req.body);
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
      const usuario = await UsuariosService.crear(validated, req.user.id_usuario, ip);
      res.status(201).json(successResponse(usuario));
    } catch (err) {
      next(err);
    }
  }

  static async actualizar(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const validated = updateUsuarioSchema.parse(req.body);
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
      const usuario = await UsuariosService.actualizar(id, validated, req.user.id_usuario, ip);
      res.json(successResponse(usuario));
    } catch (err) {
      next(err);
    }
  }

  static async cambiarEstado(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      let activo;
      if (req.body && req.body.activo !== undefined) {
        ({ activo } = updateEstadoSchema.parse(req.body));
      } else {
        const actual = await UsuariosService.obtenerPorId(id);
        activo = !actual.activo;
      }
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
      const usuario = await UsuariosService.cambiarEstado(id, activo, req.user.id_usuario, ip);
      res.json(successResponse(usuario));
    } catch (err) {
      next(err);
    }
  }

  static async resetPassword(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const new_password = req.body?.new_password || req.body?.password;
      const parsed = resetPasswordSchema.parse({ new_password });
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
      const result = await UsuariosService.resetPassword(id, parsed.new_password, req.user.id_usuario, ip);
      res.json(successResponse(result));
    } catch (err) {
      next(err);
    }
  }
}
