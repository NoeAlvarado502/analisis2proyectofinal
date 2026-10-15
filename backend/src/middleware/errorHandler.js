import { ZodError } from 'zod';

/**
 * Middleware centralizado de manejo de errores
 * Mapea errores de Zod, MySQL triggers (45000) y llaves foráneas a respuestas HTTP semánticas.
 */
export function errorHandler(err, req, res, next) {
  // 1. Error de validación Zod -> HTTP 422 Unprocessable Entity
  if (err instanceof ZodError) {
    const details = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message
    }));

    return res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Los datos enviados contienen errores de validación',
        details
      }
    });
  }

  // 2. Error MySQL 1062 (Duplicate entry / UNIQUE constraint) -> HTTP 409 Conflict
  if (err.errno === 1062 || err.code === 'ER_DUP_ENTRY') {
    let message = 'Ya existe un registro con estos datos únicos';
    if (err.sqlMessage && err.sqlMessage.includes('email')) {
      message = 'Ya existe un usuario con ese correo electrónico';
    } else if (err.sqlMessage && err.sqlMessage.includes('codigo_sku')) {
      message = 'Ya existe un producto con ese código SKU';
    } else if (err.sqlMessage && err.sqlMessage.includes('identificacion')) {
      message = 'Ya existe un cliente o proveedor con esa identificación';
    }

    return res.status(409).json({
      error: {
        code: 'DUPLICATE_ENTRY',
        message,
        details: err.sqlMessage || null
      }
    });
  }

  // 3. Error MySQL SQLSTATE 45000 (Reglas de negocio desde Triggers / SIGNAL) -> HTTP 409 Conflict
  if (err.sqlState === '45000') {
    return res.status(409).json({
      error: {
        code: 'BUSINESS_RULE_VIOLATION',
        message: err.sqlMessage || 'Operación rechazada por regla de negocio',
        details: null
      }
    });
  }

  // 4. Error MySQL Llave Foránea 1451 (Cannot delete or update a parent row) -> HTTP 409 Conflict
  if (err.errno === 1451 || err.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(409).json({
      error: {
        code: 'FOREIGN_KEY_RESTRICT',
        message: 'No se puede modificar o eliminar el registro porque tiene datos relacionados',
        details: null
      }
    });
  }

  // 5. Error MySQL Llave Foránea 1452 (Cannot add or update a child row) -> HTTP 409 Conflict
  if (err.errno === 1452 || err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(409).json({
      error: {
        code: 'FOREIGN_KEY_NOT_FOUND',
        message: 'El registro relacionado especificado no existe',
        details: null
      }
    });
  }

  // 6. Errores personalizados con statusCode explícito
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code || 'REQUEST_ERROR',
        message: err.message,
        details: err.details || null
      }
    });
  }

  // 7. Error interno no controlado -> HTTP 500
  console.error('💥 Error 500 no controlado:', err);
  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Ocurrió un error interno en el servidor',
      details: null
    }
  });
}

/**
 * Middleware para rutas no encontradas (404)
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
      details: null
    }
  });
}
