'use strict';

const { Router }   = require('express');
const ctrl         = require('./controller');
const authenticate = require('../../middlewares/authenticate');
const authorize    = require('../../middlewares/authorize');

const AMBOS = ['COORDINADOR', 'ADMINISTRATIVO'];

const router = Router();

// ─── UNIDADES ACADÉMICAS ─────────────────────────────────────────────────
router.get('/unidades-academicas', authenticate, authorize(AMBOS), ctrl.listarUAs);

// ─── CARRERAS ────────────────────────────────────────────────────────────
router.get('/carreras',          authenticate, authorize(AMBOS), ctrl.listarCarreras);
router.post('/carreras',         authenticate, authorize(AMBOS), ctrl.crearCarrera);
router.patch('/carreras/:id',    authenticate, authorize(AMBOS), ctrl.actualizarCarrera);
router.delete('/carreras/:id',   authenticate, authorize(AMBOS), ctrl.eliminarCarrera);

// ─── MATERIAS ────────────────────────────────────────────────────────────
router.get('/materias',          authenticate, authorize(AMBOS), ctrl.listarMaterias);
router.post('/materias',         authenticate, authorize(AMBOS), ctrl.crearMateria);
router.patch('/materias/:id',    authenticate, authorize(AMBOS), ctrl.actualizarMateria);
router.delete('/materias/:id',   authenticate, authorize(AMBOS), ctrl.eliminarMateria);

// ─── DOCENTES ────────────────────────────────────────────────────────────
router.get('/docentes',          authenticate, authorize(AMBOS), ctrl.listarDocentes);
router.post('/docentes',         authenticate, authorize(AMBOS), ctrl.crearDocente);
router.patch('/docentes/:id',    authenticate, authorize(AMBOS), ctrl.actualizarDocente);
router.delete('/docentes/:id',   authenticate, authorize(AMBOS), ctrl.eliminarDocente);

// ─── COMISIONES ──────────────────────────────────────────────────────────
router.get('/comisiones',        authenticate, authorize(AMBOS), ctrl.listarComisiones);
router.post('/comisiones',       authenticate, authorize(AMBOS), ctrl.crearComision);
router.patch('/comisiones/:id',  authenticate, authorize(AMBOS), ctrl.actualizarComision);
router.delete('/comisiones/:id', authenticate, authorize(AMBOS), ctrl.eliminarComision);

module.exports = router;
