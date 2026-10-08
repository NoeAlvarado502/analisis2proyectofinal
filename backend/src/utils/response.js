/**
 * Genera una respuesta estándar exitosa con formato { data, meta }
 *
 * @param {any} data - Carga útil de datos
 * @param {object|null} meta - Metadatos adicionales (paginación, conteo, etc.)
 * @returns {object}
 */
export function successResponse(data, meta = null) {
  const response = { data };
  if (meta) {
    response.meta = meta;
  }
  return response;
}

/**
 * Parsea y sanitiza los parámetros de paginación de la query
 *
 * @param {object} query - req.query
 * @param {number} defaultLimit - Límite por defecto
 * @param {number} maxLimit - Límite máximo permitido
 * @returns {{ page: number, limit: number, offset: number }}
 */
export function parsePagination(query, defaultLimit = 10, maxLimit = 100) {
  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);

  if (isNaN(page) || page < 1) page = 1;
  if (isNaN(limit) || limit < 1) limit = defaultLimit;
  if (limit > maxLimit) limit = maxLimit;

  const offset = (page - 1) * limit;

  return { page, limit, offset };
}
