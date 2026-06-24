'use strict';

/**
 * auth/routes.js
 *
 * Endpoints:
 *   POST /api/auth/login   — público (no requiere token)
 *   POST /api/auth/logout  — autenticado (requiere Bearer token válido)
 *   GET  /api/auth/me      — autenticado (devuelve payload del token)
 *
 * Montado en app.js como:
 *   app.use('/api/auth', require('./modules/auth/routes'))
 */

const { Router }   = require('express');
const ctrl         = require('./controller');
const authenticate = require('../../middlewares/authenticate');

const router = Router();

/**
 * POST /api/auth/login
 * Valida credenciales (email + password) y devuelve un JWT firmado.
 * Acceso: público
 * Body: { email: string, password: string }
 */
router.post('/login', ctrl.login);

/**
 * POST /api/auth/logout
 * Cierra la sesión. Estrategia: client-side (stateless).
 * El servidor responde 200; el cliente debe descartar el token.
 * Acceso: autenticado (evita llamadas anónimas al endpoint)
 */
router.post('/logout', authenticate, ctrl.logout);

/**
 * GET /api/auth/me
 * Devuelve los campos del payload JWT del usuario autenticado.
 * No realiza consulta adicional a la base de datos.
 * Acceso: autenticado
 */
router.get('/me', authenticate, ctrl.me);

module.exports = router;
