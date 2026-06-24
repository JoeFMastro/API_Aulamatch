/**
 * aulas/routes.js
 * Endpoints (sección 10.2):
 *   GET    /api/edificios              → listar edificios
 *   POST   /api/edificios              → registrar edificio [Coordinador]
 *   GET    /api/edificios/:id/aulas    → listar aulas de un edificio
 *   POST   /api/aulas                 → registrar aula [Coordinador]
 *   PATCH  /api/aulas/:id             → actualizar aula  [Coordinador]
 */
'use strict';
const { Router } = require('express');
// const ctrl = require('./controller');
// const authenticate = require('../../middleware/authenticate');
// const authorize    = require('../../middleware/authorize');

const router = Router();

// router.get( '/edificios',              authenticate, authorize(['COORDINADOR','ADMINISTRATIVO']), ctrl.listarEdificios);
// router.post('/edificios',              authenticate, authorize(['COORDINADOR']),                  ctrl.crearEdificio);
// router.get( '/edificios/:id/aulas',    authenticate, authorize(['COORDINADOR','ADMINISTRATIVO']), ctrl.listarAulasPorEdificio);
// router.post('/aulas',                  authenticate, authorize(['COORDINADOR']),                  ctrl.crearAula);
// router.patch('/aulas/:id',             authenticate, authorize(['COORDINADOR']),                  ctrl.actualizarAula);

module.exports = router;
