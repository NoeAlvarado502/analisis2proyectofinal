import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import { pool } from './db/pool.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { successResponse } from './utils/response.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { usuariosRouter } from './modules/usuarios/usuarios.routes.js';
import { rolesRouter } from './modules/roles/roles.routes.js';
import { permisosRouter } from './modules/roles/permisos.routes.js';
import { clientesRouter } from './modules/clientes/clientes.routes.js';
import { productosRouter } from './modules/productos/productos.routes.js';
import { categoriasRouter } from './modules/productos/categorias.routes.js';
import { marcasRouter } from './modules/productos/marcas.routes.js';
import { proveedoresRouter } from './modules/proveedores/proveedores.routes.js';
import { comprasRouter } from './modules/compras/compras.routes.js';
import { inventarioRouter } from './modules/inventario/inventario.routes.js';
import { pedidosRouter } from './modules/pedidos/pedidos.routes.js';
import { ventasRouter } from './modules/ventas/ventas.routes.js';
import { pagosRouter } from './modules/pagos/pagos.routes.js';
import { auditoriaRouter } from './modules/auditoria/auditoria.routes.js';
import { reportesRouter } from './modules/reportes/reportes.routes.js';

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

// Rutas de módulos
app.use('/api/auth', authRouter);
app.use('/api/usuarios', usuariosRouter);
app.use('/api/roles', rolesRouter);
app.use('/api/permisos', permisosRouter);
app.use('/api/clientes', clientesRouter);
app.use('/api/productos', productosRouter);
app.use('/api/categorias', categoriasRouter);
app.use('/api/marcas', marcasRouter);
app.use('/api/proveedores', proveedoresRouter);
app.use('/api/compras', comprasRouter);
app.use('/api/inventario', inventarioRouter);
app.use('/api/pedidos', pedidosRouter);
app.use('/api/ventas', ventasRouter);
app.use('/api/pagos', pagosRouter);
app.use('/api/auditoria', auditoriaRouter);
app.use('/api/reportes', reportesRouter);

// Ruta de prueba para permisos en tests
if (process.env.NODE_ENV === 'test') {
  const { requireAuth, requirePermission } = await import('./middleware/auth.js');
  app.get('/api/test/solo-supervisores', requireAuth, requirePermission('pedidos.autorizar_descuento'), (req, res) => {
    res.json({ ok: true });
  });
}

// Manejador de 404
app.use(notFoundHandler);

// Manejador centralizado de errores
app.use(errorHandler);
