import { InventarioService } from './inventario.service.js';
import { ajusteInventarioSchema, updateStockMinimoSchema } from './inventario.schema.js';
import { successResponse, parsePagination } from '../../utils/response.js';

export class InventarioController {
  static async listar(req, res, next) {
    try {
      const { page, limit } = parsePagination(req.query);
      const { q, id_categoria, id_marca, bajo_stock, activo } = req.query;
      const result = await InventarioService.listarExistencias({
        q,
        id_categoria,
        id_marca,
        bajo_stock,
        activo,
        page,
        limit
      });
      res.json(successResponse(result.data, result.meta));
    } catch (err) {
      next(err);
    }
  }

  static async listarMovimientos(req, res, next) {
    try {
      const { page, limit } = parsePagination(req.query);
      const { q, id_producto, tipo_movimiento, documento_tipo, fecha_desde, fecha_hasta } = req.query;
      const result = await InventarioService.listarMovimientos({
        q,
        id_producto,
        tipo_movimiento,
        documento_tipo,
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

  static async registrarAjuste(req, res, next) {
    try {
      const validated = ajusteInventarioSchema.parse(req.body);
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
      const movimiento = await InventarioService.registrarAjuste(validated, req.user.id_usuario, ip);
      res.status(201).json(successResponse(movimiento));
    } catch (err) {
      next(err);
    }
  }

  static async actualizarStockMinimo(req, res, next) {
    try {
      const idProducto = parseInt(req.params.id_producto, 10);
      const { stock_minimo } = updateStockMinimoSchema.parse(req.body);
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
      const producto = await InventarioService.actualizarStockMinimo(idProducto, stock_minimo, req.user.id_usuario, ip);
      res.json(successResponse(producto));
    } catch (err) {
      next(err);
    }
  }

  static async obtenerAlertas(req, res, next) {
    try {
      const result = await InventarioService.obtenerAlertas();
      res.json(successResponse(result));
    } catch (err) {
      next(err);
    }
  }
}
