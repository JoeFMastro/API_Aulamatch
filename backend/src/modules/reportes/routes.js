/**
 * reportes/routes.js
 * Endpoints (sección 10.2):
 *   GET /api/reportes/asignaciones   → exportar estado del período (JSON/CSV)
 *   GET /api/reportes/disponibilidad → ocupación de aulas por edificio y franja
 */
'use strict';
const { Router } = require('express');
// const ctrl = require('./controller');
// const authenticate = require('../../middleware/authenticate');
// const authorize    = require('../../middleware/authorize');

const router = Router();

// router.get('/asignaciones',   authenticate, authorize(['COORDINADOR','ADMINISTRATIVO']), ctrl.reporteAsignaciones);
// router.get('/disponibilidad', authenticate, authorize(['COORDINADOR']),                  ctrl.disponibilidad);

module.exports = router;
