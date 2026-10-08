import { ProductosService } from './productos.service.js';
import {
  createProductoSchema,
  updateProductoSchema,
  updateEstadoProductoSchema,
  createCategoriaSchema,
  createMarcaSchema
} from './productos.schema.js';
import { successResponse, parsePagination } from '../../utils/response.js';

export class ProductosController {
  static async listar(req, res, next) {
    try {
      const { page, limit } = parsePagination(req.query);
      const { q, id_categoria, activo } = req.query;
      const result = await ProductosService.listar({ q, id_categoria, activo, page, limit });
      res.json(successResponse(result.data, result.meta));
    } catch (err) {
      next(err);
    }
  }

  static async obtenerPorId(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const producto = await ProductosService.obtenerPorId(id);
      res.json(successResponse(producto));
    } catch (err) {
      next(err);
    }
  }

  static async crear(req, res, next) {
    try {
      const validated = createProductoSchema.parse(req.body);
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
      const producto = await ProductosService.crear(validated, req.user.id_usuario, ip);
      res.status(201).json(successResponse(producto));
    } catch (err) {
      next(err);
    }
  }

  static async actualizar(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const validated = updateProductoSchema.parse(req.body);
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
      const producto = await ProductosService.actualizar(id, validated, req.user.id_usuario, ip);
      res.json(successResponse(producto));
    } catch (err) {
      next(err);
    }
  }

  static async cambiarEstado(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const { activo } = updateEstadoProductoSchema.parse(req.body);
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
      const producto = await ProductosService.cambiarEstado(id, activo, req.user.id_usuario, ip);
      res.json(successResponse(producto));
    } catch (err) {
      next(err);
    }
  }

  // Categorías
  static async listarCategorias(req, res, next) {
    try {
      const categorias = await ProductosService.listarCategorias();
      res.json(successResponse(categorias));
    } catch (err) {
      next(err);
    }
  }

  static async crearCategoria(req, res, next) {
    try {
      const validated = createCategoriaSchema.parse(req.body);
      const categoria = await ProductosService.crearCategoria(validated);
      res.status(201).json(successResponse(categoria));
    } catch (err) {
      next(err);
    }
  }

  // Marcas
  static async listarMarcas(req, res, next) {
    try {
      const marcas = await ProductosService.listarMarcas();
      res.json(successResponse(marcas));
    } catch (err) {
      next(err);
    }
  }

  static async crearMarca(req, res, next) {
    try {
      const validated = createMarcaSchema.parse(req.body);
      const marca = await ProductosService.crearMarca(validated);
      res.status(201).json(successResponse(marca));
    } catch (err) {
      next(err);
    }
  }
}
