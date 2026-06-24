'use strict';

/**
 * conflictos/routes.js
 *
 * Endpoints:
 *   GET  /api/conflictos           — lista asignaciones CONFLICTO + notificaciones  [C, A]
 *   GET  /api/conflictos/metricas  — contadores para cards del panel                [C, A]
 *   POST /api/conflictos/detectar  — detección manual por período                   [C]
 *
 * Montado en app.js como:
 *   app.use('/api/conflictos', require('./modules/conflictos/routes'))
 *
 * NOTA de orden: /metricas y /detectar DEBEN ir antes de / para que
 * Express no intente capturarlos como rutas con parámetros (no aplica
 * aquí porque no hay /:id, pero es buena práctica mantener el orden).
 */

const { Router }   = require('express');
const ctrl         = require('./controller');
const authenticate = require('../../middlewares/authenticate');
const authorize    = require('../../middlewares/authorize');

const AMBOS      = ['COORDINADOR', 'ADMINISTRATIVO'];
const SOLO_COORD = ['COORDINADOR'];

const router = Router();

/**
 * GET /api/conflictos/metricas
 * Contadores: conflictos activos, sin asignación, notificaciones, desglose por tipo.
 * Query params opcionales: unidad_academica_id (ignorado para ADMINISTRATIVO)
 */
router.get('/metricas', authenticate, authorize(AMBOS), ctrl.metricas);

/**
 * POST /api/conflictos/detectar
 * Body opcional: { anio: number, cuatrimestre: 1|2 }
 * Sin body: escanea TODAS las asignaciones en estado ASIGNADA.
 * Solo COORDINADOR puede forzar la detección masiva.
 */
router.post('/detectar', authenticate, authorize(SOLO_COORD), ctrl.detectar);

/**
 * GET /api/conflictos
 * Lista asignaciones en estado CONFLICTO con notificaciones agrupadas.
 * Query param opcional: unidad_academica_id (ignorado para ADMINISTRATIVO).
 */
router.get('/', authenticate, authorize(AMBOS), ctrl.listar);

module.exports = router;
