/**
 * conflictos/routes.js
 * Endpoints (sección 10.2):
 *   GET  /api/conflictos          → listar asignaciones con estado=CONFLICTO
 *   GET  /api/conflictos/metricas → contadores para Panel de Conflictos
 *   POST /api/conflictos/detectar → fuerza detección manual [Coordinador]
 */
'use strict';
const { Router } = require('express');
// const ctrl = require('./controller');
// const authenticate = require('../../middleware/authenticate');
// const authorize    = require('../../middleware/authorize');

const router = Router();

// router.get( '/metricas', authenticate, authorize(['COORDINADOR','ADMINISTRATIVO']), ctrl.metricas);
// router.post('/detectar', authenticate, authorize(['COORDINADOR']),                  ctrl.detectar);
// router.get( '/',         authenticate, authorize(['COORDINADOR','ADMINISTRATIVO']), ctrl.listar);

module.exports = router;
