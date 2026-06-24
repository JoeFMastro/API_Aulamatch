'use strict';

/**
 * conflictos/controller.js
 * Handlers para los endpoints del módulo conflictos.
 */

const service = require('./service');

// ─────────────────────────────────────────────────────────────────
// GET /api/conflictos
// ─────────────────────────────────────────────────────────────────

/**
 * Lista las asignaciones en estado CONFLICTO con sus notificaciones.
 * ADMINISTRATIVO: filtrado automático por su UA del JWT.
 * COORDINADOR: puede filtrar opcionalmente por ?unidad_academica_id=
 */
async function listar(req, res, next) {
  try {
    let unidadAcademicaId;
    if (req.user.rol === 'ADMINISTRATIVO') {
      unidadAcademicaId = req.user.unidadAcademicaId;
    } else {
      unidadAcademicaId = req.query.unidad_academica_id
        ? Number(req.query.unidad_academica_id)
        : undefined;
    }

    const conflictos = await service.listarConflictos({ unidadAcademicaId });
    res.json(conflictos);
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────
// GET /api/conflictos/metricas
// ─────────────────────────────────────────────────────────────────

/**
 * Devuelve los contadores del panel de conflictos.
 * ADMINISTRATIVO: métricas filtradas por su UA.
 * COORDINADOR: puede filtrar por ?unidad_academica_id= o ver todo.
 */
async function metricas(req, res, next) {
  try {
    let unidadAcademicaId;
    if (req.user.rol === 'ADMINISTRATIVO') {
      unidadAcademicaId = req.user.unidadAcademicaId;
    } else {
      unidadAcademicaId = req.query.unidad_academica_id
        ? Number(req.query.unidad_academica_id)
        : undefined;
    }

    const data = await service.obtenerMetricas({ unidadAcademicaId });
    res.json(data);
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────
// POST /api/conflictos/detectar
// ─────────────────────────────────────────────────────────────────

/**
 * Fuerza la detección de conflictos sobre todas las asignaciones
 * en estado ASIGNADA del período indicado (o todos si no se especifica).
 *
 * Acceso: solo COORDINADOR (autorización controlada en routes.js).
 *
 * Body (opcional): { anio?: number, cuatrimestre?: 1|2 }
 */
async function detectar(req, res, next) {
  try {
    const { anio, cuatrimestre } = req.body ?? {};
    const resultado = await service.detectarPorPeriodo({
      anio:         anio         ? Number(anio)         : undefined,
      cuatrimestre: cuatrimestre ? Number(cuatrimestre) : undefined,
    });
    res.json(resultado);
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, metricas, detectar };
