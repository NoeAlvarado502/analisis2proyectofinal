import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthController } from './auth.controller.js';
import { requireAuth } from '../../middleware/auth.js';

export const authRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skip: () => process.env.NODE_ENV === 'test', // Desactivar en pruebas para evitar bloqueos
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Demasiados intentos de inicio de sesión. Intente de nuevo en 15 minutos.',
      details: null
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

authRouter.post('/login', loginLimiter, AuthController.login);
authRouter.get('/me', requireAuth, AuthController.me);
