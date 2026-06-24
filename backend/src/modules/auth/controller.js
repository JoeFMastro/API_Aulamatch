'use strict';

/**
 * auth/controller.js
 * Maneja req/res y delega la lógica al service.
 *
 * Endpoints:
 *   POST /api/auth/login   — público
 *   POST /api/auth/logout  — autenticado (stateless: invalidación client-side)
 *   GET  /api/auth/me      — autenticado
 */

const authService = require('./service');

// ─────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────

/**
 * Valida credenciales y devuelve un JWT.
 *
 * Body esperado: { email: string, password: string }
 *
 * Respuesta 200:
 *   {
 *     token: string,
 *     usuario: { id, nombre, email, rol, unidadAcademicaId }
 *   }
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────────────────────────

/**
 * Cierra la sesión del usuario autenticado.
 *
 * Estrategia elegida: invalidación solo del lado cliente (stateless).
 *
 * Justificación (ver sección "Decisión sobre logout stateless" en PR):
 *   JWT es por diseño stateless. La invalidación real requiere una
 *   blacklist que introduce estado en el servidor y penaliza el
 *   rendimiento en cada request. Para este proyecto, la estrategia
 *   client-side es suficiente y coherente con el alcance actual.
 *   Si en el futuro se requiere revocación inmediata de tokens, se
 *   puede agregar una blacklist en Redis sin cambiar la interfaz.
 *
 * El cliente DEBE descartar el token del almacenamiento local al
 * recibir esta respuesta 200.
 *
 * Requiere: authenticate middleware (token válido para poder llegar acá)
 */
function logout(req, res) {
  // No hay operación server-side. El token sigue siendo técnicamente
  // válido hasta su exp, pero el cliente lo habrá eliminado.
  return res.status(200).json({
    message: 'Sesión cerrada. Eliminar el token del almacenamiento del cliente.',
  });
}

// ─────────────────────────────────────────────────────────────
// GET /api/auth/me
// ─────────────────────────────────────────────────────────────

/**
 * Devuelve los datos del usuario autenticado.
 *
 * Decisión de diseño: devuelve SOLO los campos del payload del JWT,
 * sin consultar nuevamente la base de datos.
 *
 * Justificación:
 *   El payload ya contiene todos los campos necesarios para el cliente
 *   (sub/id, nombre, rol, unidadAcademicaId). Evitar un round-trip a la
 *   base de datos en cada request a /me mejora el rendimiento y mantiene
 *   la coherencia con el diseño stateless.
 *   Contrapartida: si se actualizan datos del usuario (ej.: nombre),
 *   el JWT seguirá mostrando los datos antiguos hasta su expiración (8h).
 *   Para este alcance, es un trade-off aceptable.
 *
 * Requiere: authenticate middleware (req.user disponible)
 *
 * Respuesta 200:
 *   { sub, nombre, rol, unidadAcademicaId, iat, exp }
 */
function me(req, res) {
  // req.user es el payload decodificado por el middleware authenticate
  const { sub, nombre, rol, unidadAcademicaId, iat, exp } = req.user;
  return res.status(200).json({ sub, nombre, rol, unidadAcademicaId, iat, exp });
}

module.exports = { login, logout, me };
