/**
 * Utilidades de validación y extracción de errores de API
 * Estandarizadas para todos los módulos del sistema Juguetería Quetzal.
 */

/**
 * Expresión regular estricta para formato de correo electrónico con dominio y TLD válido.
 */
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Expresión regular para nombres humanos: solo letras, tildes, diéresis, espacios y apóstrofes.
 * Rechaza expresamente cualquier número o símbolo extraño.
 */
export const NAME_REGEX = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.'-]+$/;

/**
 * Valida si un string cumple el formato de correo electrónico.
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return EMAIL_REGEX.test(email.trim());
}

/**
 * Valida si un nombre contiene solo letras y no tiene números.
 */
export function isValidName(name) {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  return trimmed.length >= 3 && !/[0-9]/.test(trimmed) && NAME_REGEX.test(trimmed);
}

/**
 * Limpia un valor en tiempo real removiendo cualquier número digitado.
 */
export function filterOutNumbers(value) {
  if (!value || typeof value !== 'string') return '';
  return value.replace(/[0-9]/g, '');
}

/**
 * Extrae y normaliza los errores retornados por el backend (Zod / Express / MySQL)
 * Soporta tanto arrays [ { field, message } ] como objetos { field: message }.
 */
export function parseApiErrors(err) {
  if (!err?.details) return {};

  const fieldErrors = {};

  if (Array.isArray(err.details)) {
    err.details.forEach((item) => {
      if (item.field && item.message) {
        fieldErrors[item.field] = item.message;
      }
    });
  } else if (typeof err.details === 'object') {
    Object.entries(err.details).forEach(([key, val]) => {
      fieldErrors[key] = Array.isArray(val) ? val.join(', ') : String(val);
    });
  }

  return fieldErrors;
}
