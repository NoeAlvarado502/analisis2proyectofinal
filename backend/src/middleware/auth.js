import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AuthService } from '../modules/auth/auth.service.js';

/**
 * Middleware que verifica el token JWT y recarga el usuario y permisos desde la BD
 * para que cualquier cambio de rol o inactivación surta efecto inmediatamente.
 */
export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const error = new Error('Token de autenticación no proporcionado');
      error.statusCode = 401;
      error.code = 'UNAUTHORIZED';
      return next(error);
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (jwtErr) {
      const error = new Error('Token inválido o expirado');
      error.statusCode = 401;
      error.code = 'INVALID_TOKEN';
      return next(error);
    }

    // Recargar estado vigente desde la base de datos
    const { usuario, permisos } = await AuthService.getMe(decoded.id_usuario);
    req.user = usuario;
    req.permissions = permisos;

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Middleware que autoriza el acceso si el usuario cuenta con al menos uno de los permisos requeridos.
 *
 * @param  {...string} codigos - Lista de códigos de permiso requeridos
 */
export function requirePermission(...codigos) {
  return (req, res, next) => {
    if (!req.permissions) {
      const error = new Error('No autorizado');
      error.statusCode = 401;
      error.code = 'UNAUTHORIZED';
      return next(error);
    }

    const hasPermission = codigos.some(codigo => req.permissions.includes(codigo));
    if (!hasPermission) {
      const error = new Error(`Acceso denegado: no cuenta con el permiso requerido (${codigos.join(', ')})`);
      error.statusCode = 403;
      error.code = 'FORBIDDEN';
      return next(error);
    }

    next();
  };
}
