/**
 * asignaciones/routes.js
 * Endpoints (sección 10.2):
 *   GET    /api/asignaciones                      → listar con filtros
 *   POST   /api/asignaciones/automatica           → motor automático [Coord, Admin]
 *   POST   /api/asignaciones                      → asignación manual
 *   PATCH  /api/asignaciones/:id                  → reasignar/actualizar
 *   GET    /api/asignaciones/:id/aulas-compatibles → aulas disponibles
 *   DELETE /api/asignaciones/:id                  → eliminar [solo Coordinador]
 */
'use strict';
const { Router } = require('express');
// const ctrl = require('./controller');
// const authenticate = require('../../middleware/authenticate');
// const authorize    = require('../../middleware/authorize');

const router = Router();

// ATENCIÓN: la ruta /automatica debe ir ANTES de /:id para no ser capturada
// router.post('/automatica',              authenticate, authorize(['COORDINADOR','ADMINISTRATIVO']), ctrl.ejecutarAutomatica);
// router.get( '/',                        authenticate, authorize(['COORDINADOR','ADMINISTRATIVO']), ctrl.listar);
// router.post('/',                        authenticate, authorize(['COORDINADOR','ADMINISTRATIVO']), ctrl.crearManual);
// router.patch('/:id',                   authenticate, authorize(['COORDINADOR','ADMINISTRATIVO']), ctrl.actualizar);
// router.get( '/:id/aulas-compatibles',  authenticate, authorize(['COORDINADOR','ADMINISTRATIVO']), ctrl.aulasCompatibles);
// router.delete('/:id',                  authenticate, authorize(['COORDINADOR']),                  ctrl.eliminar);

module.exports = router;
