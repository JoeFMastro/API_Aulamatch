'use strict';

/**
 * asignaciones/routes.js
 *
 * Endpoints:
 *   GET    /api/asignaciones                      — lista con filtros          [C, A]
 *   POST   /api/asignaciones/automatica           — motor automático           [C, A]
 *   POST   /api/asignaciones                      — asignación manual          [C, A]
 *   PATCH  /api/asignaciones/:id                  — reasignar/actualizar       [C, A]
 *   GET    /api/asignaciones/:id/aulas-compatibles — aulas disponibles         [C, A]
 *   DELETE /api/asignaciones/:id                  — eliminar (liberar aula)    [C]
 *
 * Montado en app.js como:
 *   app.use('/api/asignaciones', require('./modules/asignaciones/routes'))
 *
 * ─── NOTA SOBRE ORDEN DE RUTAS ───────────────────────────────────
 * La ruta POST /automatica DEBE declararse ANTES de POST / y
 * GET  /:id/aulas-compatibles ANTES de PATCH /:id y DELETE /:id
 * para evitar que Express capture "automatica" como un :id.
 *
 * ─── NOTA SOBRE GET /:id/aulas-compatibles ────────────────────────
 * El :id aquí referencia el id de la COMISIÓN, no de la asignación.
 * Esto permite consultar aulas disponibles antes de crear la asignación,
 * reutilizando exactamente la misma lógica del motor automático.
 * Semántica: "¿qué aulas están disponibles para la comisión X?"
 */

const { Router }   = require('express');
const ctrl         = require('./controller');
const authenticate = require('../../middlewares/authenticate');
const authorize    = require('../../middlewares/authorize');

const AMBOS       = ['COORDINADOR', 'ADMINISTRATIVO'];
const SOLO_COORD  = ['COORDINADOR'];

const router = Router();

// ── POST /automatica — ANTES de cualquier ruta con :id ──────────
/**
 * POST /api/asignaciones/automatica
 * Body: { anio: number, cuatrimestre: 1|2 }
 * Ejecuta el motor para el período y devuelve { asignadas, pendientes, resumen }.
 */
router.post('/automatica', authenticate, authorize(AMBOS), ctrl.ejecutarAutomatica);

// ── GET / — listado con filtros ──────────────────────────────────
/**
 * GET /api/asignaciones?unidad_academica_id=&carrera_id=&edificio_id=
 *                       &turno=&modalidad=&estado=
 */
router.get('/', authenticate, authorize(AMBOS), ctrl.listar);

// ── POST / — asignación manual ───────────────────────────────────
/**
 * POST /api/asignaciones
 * Body: { comision_id: number, aula_id: number }
 */
router.post('/', authenticate, authorize(AMBOS), ctrl.crearManual);

// ── GET /:id/aulas-compatibles — ANTES de PATCH /:id ────────────
/**
 * GET /api/asignaciones/:id/aulas-compatibles
 * :id = comision_id
 * Devuelve aulas compatibles ordenadas: edificio preferido primero.
 */
router.get('/:id/aulas-compatibles', authenticate, authorize(AMBOS), ctrl.aulasCompatibles);

// ── PATCH /:id — reasignación ────────────────────────────────────
/**
 * PATCH /api/asignaciones/:id
 * Body (opcionales): { aula_id?: number, estado?: string }
 */
router.patch('/:id', authenticate, authorize(AMBOS), ctrl.actualizar);

// ── DELETE /:id — solo COORDINADOR ──────────────────────────────
/**
 * DELETE /api/asignaciones/:id
 * Elimina la asignación y libera el aula.
 */
router.delete('/:id', authenticate, authorize(SOLO_COORD), ctrl.eliminar);

module.exports = router;
