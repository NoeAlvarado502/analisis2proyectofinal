import { AuthService } from './auth.service.js';
import { loginSchema } from './auth.schema.js';
import { successResponse } from '../../utils/response.js';

export class AuthController {
  static async login(req, res, next) {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const ipOrigen = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
      const result = await AuthService.login(email, password, ipOrigen);
      res.json(successResponse(result));
    } catch (err) {
      next(err);
    }
  }

  static async me(req, res, next) {
    try {
      res.json(successResponse({
        usuario: req.user,
        permisos: req.permissions
      }));
    } catch (err) {
      next(err);
    }
  }
}
