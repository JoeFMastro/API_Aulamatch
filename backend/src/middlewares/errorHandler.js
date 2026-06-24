'use strict';

/**
 * Middleware global de manejo de errores.
 * Debe ser el ÚLTIMO middleware registrado en app.js (4 parámetros).
 *
 * Convenciones de formato de error:
 *   { error: string, details?: any }
 */
// eslint-disable-next-line no-unused-vars
module.exports = function errorHandler(err, req, res, next) {
  console.error(`[error] ${req.method} ${req.path} →`, err.message);

  // Errores de validación lanzados con status 400
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
