'use strict';

/**
 * academico/routes.js
 *
 * Endpoints:
 *   GET  /api/unidades-academicas  → listar UAs               [COORDINADOR, ADMINISTRATIVO]
 *   GET  /api/carreras             → listar carreras (filtro UA) [COORDINADOR, ADMINISTRATIVO]
 *   GET  /api/materias             → listar materias (filtro UA, carrera) [COORDINADOR, ADMINISTRATIVO]
 *   GET  /api/comisiones           → listar comisiones del período [COORDINADOR, ADMINISTRATIVO]
 *   POST /api/comisiones           → registrar comisión        [COORDINADOR, ADMINISTRATIVO]
 *   GET  /api/docentes             → listar docentes           [COORDINADOR, ADMINISTRATIVO]
 *
 * Montado en app.js como:
 *   app.use('/api', require('./modules/academico/routes'))
 *
 * Nota sobre POST /api/comisiones:
 *   El prompt especifica "Administrativo" como rol para gestión de excepciones.
 *   Se permite también a COORDINADOR para coherencia con el acceso total del rol.
 */

const { Router }   = require('express');
const ctrl         = require('./controller');
const authenticate = require('../../middlewares/authenticate');
const authorize    = require('../../middlewares/authorize');

const AMBOS = ['COORDINADOR', 'ADMINISTRATIVO'];

const router = Router();

/**
 * GET /api/unidades-academicas
 * Lista todas las UAs. Ambos roles, sin filtro automático.
 */
router.get(
  '/unidades-academicas',
  authenticate,
  authorize(AMBOS),
  ctrl.listarUAs
);

/**
 * GET /api/carreras?unidad_academica_id=<id>
 * ADMINISTRATIVO: UA forzada desde JWT.
 * COORDINADOR: filtro opcional por query param.
 */
router.get(
  '/carreras',
  authenticate,
  authorize(AMBOS),
  ctrl.listarCarreras
);

/**
 * GET /api/materias?unidad_academica_id=<id>&carrera_id=<id>
 * ADMINISTRATIVO: UA forzada desde JWT.
 * Respuesta incluye array de carreras asociadas (M:N).
 */
router.get(
  '/materias',
  authenticate,
  authorize(AMBOS),
  ctrl.listarMaterias
);

/**
 * GET /api/comisiones?anio=&cuatrimestre=&unidad_academica_id=&materia_id=&modalidad=&turno=
 * ADMINISTRATIVO: unidad_academica_id siempre sobreescrita por JWT.
 */
router.get(
  '/comisiones',
  authenticate,
  authorize(AMBOS),
  ctrl.listarComisiones
);

/**
 * POST /api/comisiones
 * Registra una comisión nueva.
 * Acceso: COORDINADOR y ADMINISTRATIVO.
 * Body: { codigo, cupo, modalidad, turno, cuatrimestre, anio, materia_id, docente_id }
 */
router.post(
  '/comisiones',
  authenticate,
  authorize(AMBOS),
  ctrl.crearComision
);

/**
 * GET /api/docentes
 * Lista todos los docentes. Sin filtro por UA.
 */
router.get(
  '/docentes',
  authenticate,
  authorize(AMBOS),
  ctrl.listarDocentes
);

module.exports = router;
