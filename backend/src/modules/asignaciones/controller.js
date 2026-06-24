'use strict';

/**
 * asignaciones/controller.js
 * Tablas involucradas: asignacion, comision, aula, banda_horaria
 *
 * Filtro automático por UA:
 *   listar y aulasCompatibles aplican unidadAcademicaId del JWT
 *   cuando el usuario es ADMINISTRATIVO.
 */

const service = require('./service');

// ─────────────────────────────────────────────────────────────────
// GET /api/asignaciones
// ─────────────────────────────────────────────────────────────────

/**
 * Lista asignaciones con filtros opcionales.
 *
 * Query params: unidad_academica_id, carrera_id, edificio_id,
 *               turno, modalidad, estado
 *
 * ADMINISTRATIVO: unidad_academica_id forzado desde JWT.
 * COORDINADOR:    todos los filtros son opcionales.
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

    const { carrera_id, edificio_id, turno, modalidad, estado } = req.query;

    const asignaciones = await service.listarAsignaciones({
      unidadAcademicaId,
      carreraId:  carrera_id  ? Number(carrera_id)  : undefined,
      edificioId: edificio_id ? Number(edificio_id) : undefined,
      turno,
      modalidad,
      estado,
    });

    res.json(asignaciones);
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────
// POST /api/asignaciones/automatica
// ─────────────────────────────────────────────────────────────────

/**
 * Ejecuta el motor de asignación automática para el período indicado.
 *
 * Body: { anio: number, cuatrimestre: 1|2 }
 *
 * Respuesta:
 *   {
 *     asignadas:  [{ id, comision_id, aula_id, ... }],
 *     pendientes: [{ comision_id, motivo, tipo_aula_requerido }],
 *     resumen:    { total, asignadas, fallidas }
 *   }
 *
 * Idempotente: las comisiones que ya tienen asignación ASIGNADA
 * se excluyen automáticamente del proceso.
 */
async function ejecutarAutomatica(req, res, next) {
  try {
    const { anio, cuatrimestre } = req.body;
    const resultado = await service.ejecutarAsignacionAutomatica(anio, cuatrimestre);
    res.status(200).json(resultado);
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────
// POST /api/asignaciones  (manual)
// ─────────────────────────────────────────────────────────────────

/**
 * Crea una asignación manual para una comisión específica.
 *
 * Body: { comision_id: number, aula_id: number }
 *
 * Valida:
 *   - Que la comisión no tenga ya asignación activa → 409
 *   - Que no haya superposición horaria → 409
 */
async function crearManual(req, res, next) {
  try {
    const { comision_id, aula_id } = req.body;
    const asignacion = await service.crearAsignacionManual({ comision_id, aula_id });
    res.status(201).json(asignacion);
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────
// PATCH /api/asignaciones/:id
// ─────────────────────────────────────────────────────────────────

/**
 * Reasigna o actualiza el estado de una asignación existente.
 *
 * Body (todos opcionales): { aula_id?: number, estado?: string }
 *
 * Si se cambia aula_id se verifica superposición horaria antes de guardar.
 * Cambiar aula_id marca es_manual = true automáticamente.
 */
async function actualizar(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'El parámetro "id" debe ser un entero positivo' });
    }
    const { aula_id, estado } = req.body;
    const asignacion = await service.actualizarAsignacion(id, { aula_id, estado });
    res.json(asignacion);
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────
// GET /api/asignaciones/:id/aulas-compatibles
// ─────────────────────────────────────────────────────────────────

/**
 * Devuelve las aulas disponibles y compatibles para la comisión
 * asociada a una asignación dada (o directamente para una comisión).
 *
 * Ruta: /api/asignaciones/:id/aulas-compatibles
 *   donde :id es el id de la COMISIÓN (ver comentario en routes.js).
 *
 * Reutiliza exactamente la misma lógica del motor automático:
 *   tipo inferido + capacidad + sin superposición horaria.
 * Las aulas del edificio preferido de la UA van primero.
 */
async function aulasCompatibles(req, res, next) {
  try {
    const comisionId = Number(req.params.id);
    if (!Number.isInteger(comisionId) || comisionId <= 0) {
      return res.status(400).json({ error: 'El parámetro "id" debe ser un entero positivo' });
    }
    const aulas = await service.aulasCompatiblesParaComision(comisionId);
    res.json(aulas);
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────────
// DELETE /api/asignaciones/:id
// ─────────────────────────────────────────────────────────────────

/**
 * Elimina una asignación, liberando el aula para futuras asignaciones.
 * Acceso: solo COORDINADOR (controlado en routes.js).
 */
async function eliminar(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'El parámetro "id" debe ser un entero positivo' });
    }
    const eliminada = await service.eliminarAsignacion(id);
    res.json({ message: 'Asignación eliminada correctamente', asignacion: eliminada });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listar,
  ejecutarAutomatica,
  crearManual,
  actualizar,
  aulasCompatibles,
  eliminar,
};
