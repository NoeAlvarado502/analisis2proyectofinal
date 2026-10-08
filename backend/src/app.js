import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import { pool } from './db/pool.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { successResponse } from './utils/response.js';

export const app = express();

// Middlewares globales
app.use(helmet());
app.use(cors());
app.use(express.json());

// Logger solo en desarrollo y producción (evitar ruido en tests)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Ruta de comprobación de salud
app.get('/api/health', async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT 1 as alive');
    res.json(successResponse({
      status: 'ok',
      db: rows[0]?.alive === 1 ? 'connected' : 'unknown',
      timestamp: new Date().toISOString()
    }));
  } catch (err) {
    next(err);
  }
});

// Manejador de 404
app.use(notFoundHandler);

// Manejador centralizado de errores
app.use(errorHandler);
