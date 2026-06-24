/**
 * middleware/errorHandler.js
 * Middleware global de manejo de errores (4 parámetros → Express lo reconoce).
 *
 * Formatos de respuesta de error estándar:
 *   { error: string, details?: any }
 *
 * TODO: distinguir errores de validación (400), auth (401/403),
 *       not found (404) y errores internos (500)
 */
'use strict';

// module.exports = (err, req, res, _next) => {
//   console.error(`[Error] ${req.method} ${req.path}:`, err.message);
//   const status = err.status || 500;
//   res.status(status).json({ error: err.message || 'Error interno del servidor' });
// };
