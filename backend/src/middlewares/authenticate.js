'use strict';

const jwt = require('jsonwebtoken');

/**
 * Middleware de autenticación JWT.
 *
 * Extrae el token de: Authorization: Bearer <token>
 * Si es válido, adjunta el payload decodificado a req.user y llama a next().
 * Si es inválido o está ausente, responde 401.
 *
 * Payload esperado (doc fuente, sección 10.4):
 * { sub, nombre, rol, unidadAcademicaId, iat, exp }
 */
module.exports = function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Autenticación requerida: token no proporcionado' });
  }

  const token = authHeader.slice(7);

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    const mensaje = err.name === 'TokenExpiredError'
      ? 'Token expirado'
      : 'Token inválido';
    return res.status(401).json({ error: mensaje });
  }
};
