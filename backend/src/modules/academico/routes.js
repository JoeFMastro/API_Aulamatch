/**
 * academico/routes.js
 * Endpoints (sección 10.2):
 *   GET  /api/unidades-academicas        → listar UAs
 *   GET  /api/carreras                   → listar carreras (filtro: UA)
 *   GET  /api/materias                   → listar materias (filtro: UA, carrera)
 *   GET  /api/comisiones                 → listar comisiones del período activo
 *   POST /api/comisiones                 → registrar comisión [Administrativo]
 *   GET  /api/docentes                   → listar docentes
 */
'use strict';
const { Router } = require('express');
// const ctrl = require('./controller');
// const authenticate = require('../../middleware/authenticate');
// const authorize    = require('../../middleware/authorize');

const router = Router();

// router.get( '/unidades-academicas', authenticate, authorize(['COORDINADOR','ADMINISTRATIVO']), ctrl.listarUAs);
// router.get( '/carreras',            authenticate, authorize(['COORDINADOR','ADMINISTRATIVO']), ctrl.listarCarreras);
// router.get( '/materias',            authenticate, authorize(['COORDINADOR','ADMINISTRATIVO']), ctrl.listarMaterias);
// router.get( '/comisiones',          authenticate, authorize(['COORDINADOR','ADMINISTRATIVO']), ctrl.listarComisiones);
// router.post('/comisiones',          authenticate, authorize(['ADMINISTRATIVO']),               ctrl.crearComision);
// router.get( '/docentes',            authenticate, authorize(['COORDINADOR','ADMINISTRATIVO']), ctrl.listarDocentes);

module.exports = router;
