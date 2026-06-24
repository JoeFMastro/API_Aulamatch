'use strict';

const { Router } = require('express');
const ctrl         = require('./controller');
const authenticate = require('../../middleware/authenticate');
const authorize    = require('../../middleware/authorize');

const router = Router();

// ─────────────────────────────────────────────────────────────
// EDIFICIOS — montado bajo /api (ver app.js)
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/edificios
 * Lista todos los edificios.
 * Acceso: COORDINADOR, ADMINISTRATIVO
 */
router.get(
  '/edificios',
  authenticate,
  authorize(['COORDINADOR', 'ADMINISTRATIVO']),
  ctrl.listarEdificios
);

/**
 * POST /api/edificios
 * Registra un nuevo edificio.
 * Acceso: solo COORDINADOR
 * Body: { nombre: string, direccion: string }
 */
router.post(
  '/edificios',
  authenticate,
  authorize(['COORDINADOR']),
  ctrl.crearEdificio
);

/**
 * GET /api/edificios/:id/aulas
 * Lista las aulas de un edificio.
 * Acceso: COORDINADOR, ADMINISTRATIVO
 */
router.get(
  '/edificios/:id/aulas',
  authenticate,
  authorize(['COORDINADOR', 'ADMINISTRATIVO']),
  ctrl.listarAulasPorEdificio
);

// ─────────────────────────────────────────────────────────────
// AULAS — montado bajo /api (ver app.js)
// ─────────────────────────────────────────────────────────────

/**
 * POST /api/aulas
 * Registra un aula nueva.
 * Acceso: solo COORDINADOR
 * Body: { numero: string, capacidad: number, tipo: string, edificio_id: number }
 */
router.post(
  '/aulas',
  authenticate,
  authorize(['COORDINADOR']),
  ctrl.crearAula
);

/**
 * PATCH /api/aulas/:id
 * Actualiza parcialmente un aula.
 * Acceso: solo COORDINADOR
 * Body (todos opcionales): { numero?, capacidad?, tipo? }
 */
router.patch(
  '/aulas/:id',
  authenticate,
  authorize(['COORDINADOR']),
  ctrl.actualizarAula
);

module.exports = router;
