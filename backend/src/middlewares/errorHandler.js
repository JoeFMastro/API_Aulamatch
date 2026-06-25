'use strict';

/**
 * Middleware global de manejo de errores.
 * Debe ser el ÚLTIMO middleware registrado en app.js (4 parámetros).
 *
 * Convenciones de formato de error:
 *   { error: string, details?: any }
 *
 * Política de logging:
 *   - Errores 4xx (flujo normal de negocio: auth fallida, recurso no encontrado,
 *     conflictos de validación, etc.) → console.warn, solo el mensaje.
 *     Son situaciones esperadas; no indican un problema del servidor.
 *   - Errores 5xx o sin status (excepciones no controladas) → console.error
 *     con el stack trace completo, para facilitar el debugging.
 */
// eslint-disable-next-line no-unused-vars
module.exports = function errorHandler(err, req, res, next) {
  const status = err.status ?? 500;

  if (status >= 500) {
    // Error inesperado del servidor — loguear con stack completo
    console.error(`[error] ${req.method} ${req.path} → ${err.message}`, err.stack ?? '');
  } else {
    // Error de negocio esperado (4xx) — loguear liviano sin stack
    console.warn(`[warn]  ${req.method} ${req.path} → ${status} ${err.message}`);
  }

  // Errores de validación lanzados con status 4xx
  if (err.status) {
    return res.status(err.status).json({
      error:   err.message,
      details: err.details ?? undefined,
    });
  }

  // Errores de integridad referencial de PostgreSQL
  if (err.code === '23503') {
    return res.status(409).json({
      error: 'Referencia inválida: el recurso relacionado no existe',
    });
  }

  // Violación de UNIQUE constraint
  if (err.code === '23505') {
    return res.status(409).json({
      error: 'Conflicto: ya existe un registro con ese valor único',
      details: err.detail,
    });
  }

  // Violación de CHECK constraint
  if (err.code === '23514') {
    return res.status(400).json({
      error: 'Valor fuera del rango permitido por la base de datos',
      details: err.detail,
    });
  }

  // Error genérico — no exponer stack en producción
  const isProduction = process.env.NODE_ENV === 'production';
  return res.status(500).json({
    error: 'Error interno del servidor',
    ...(isProduction ? {} : { details: err.message }),
  });
};
