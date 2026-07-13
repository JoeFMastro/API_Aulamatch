'use strict';

const { Router } = require('express');
const ctrl         = require('./controller');
const authenticate = require('../../middlewares/authenticate');
const authorize    = require('../../middlewares/authorize');

const router = Router();
const AMBOS  = ['COORDINADOR', 'ADMINISTRATIVO'];
const COORD  = ['COORDINADOR'];

// ─── EDIFICIOS ───────────────────────────────────────────────────────────
router.get('/edificios',            authenticate, authorize(AMBOS), ctrl.listarEdificios);
router.post('/edificios',           authenticate, authorize(COORD), ctrl.crearEdificio);
router.patch('/edificios/:id',      authenticate, authorize(COORD), ctrl.actualizarEdificio);
router.delete('/edificios/:id',     authenticate, authorize(COORD), ctrl.eliminarEdificio);

// ─── AULAS ───────────────────────────────────────────────────────────────
router.get('/aulas',                authenticate, authorize(AMBOS), ctrl.listarAulas);
router.post('/aulas',               authenticate, authorize(COORD), ctrl.crearAula);
router.patch('/aulas/:id',          authenticate, authorize(COORD), ctrl.actualizarAula);
router.delete('/aulas/:id',         authenticate, authorize(COORD), ctrl.eliminarAula);

// Ruta de detalle por edificio (mantener compatibilidad)
router.get('/edificios/:id/aulas',  authenticate, authorize(AMBOS), ctrl.listarAulasPorEdificio);

module.exports = router;
