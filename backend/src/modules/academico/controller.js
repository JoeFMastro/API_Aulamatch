'use strict';

/**
 * academico/controller.js
 * Tablas involucradas: unidad_academica, carrera, materia,
 *                      carrera_materia, docente, comision
 *
 * Filtro automático por UA:
 *   Los handlers de carreras, materias y comisiones leen req.user.rol.
 *   Si el usuario es ADMINISTRATIVO, ignoran el query param
 *   unidad_academica_id y usan SIEMPRE req.user.unidadAcademicaId del JWT.
 *   Esto garantiza que un ADMINISTRATIVO nunca vea datos de otra UA,
 *   sin lanzar un error explícito (devuelve lista filtrada, no 403).
 */

const service = require('./service');

// ─────────────────────────────────────────────────────────────
// UNIDADES ACADÉMICAS
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/unidades-academicas
 * Lista todas las UAs. Sin filtro por rol (ambos roles ven todas).
 */
async function listarUAs(req, res, next) {
  try {
    const uas = await service.listarUnidadesAcademicas();
    res.json(uas);
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// CARRERAS
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/carreras?unidad_academica_id=<id>
 *
 * COORDINADOR: puede filtrar por ?unidad_academica_id o ver todas.
 * ADMINISTRATIVO: siempre filtrado por su unidadAcademicaId del JWT.
 */
async function listarCarreras(req, res, next) {
  try {
    let unidadAcademicaId;

    if (req.user.rol === 'ADMINISTRATIVO') {
      // Filtro forzado desde el token; ignorar query param
      unidadAcademicaId = req.user.unidadAcademicaId;
    } else {
      // COORDINADOR: filtro opcional vía query param
      unidadAcademicaId = req.query.unidad_academica_id
        ? Number(req.query.unidad_academica_id)
        : undefined;
    }

    const carreras = await service.listarCarreras({ unidadAcademicaId });
    res.json(carreras);
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// MATERIAS
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/materias?unidad_academica_id=<id>&carrera_id=<id>
 *
 * COORDINADOR: filtros opcionales por UA y/o carrera.
 * ADMINISTRATIVO: UA forzada desde JWT; carrera_id sigue siendo opcional.
 *
 * Respuesta incluye array "carreras" con las carreras asociadas (M:N).
 */
async function listarMaterias(req, res, next) {
  try {
    let unidadAcademicaId;
    let carreraId;

    if (req.user.rol === 'ADMINISTRATIVO') {
      unidadAcademicaId = req.user.unidadAcademicaId;
    } else {
      unidadAcademicaId = req.query.unidad_academica_id
        ? Number(req.query.unidad_academica_id)
        : undefined;
    }

    carreraId = req.query.carrera_id
      ? Number(req.query.carrera_id)
      : undefined;

    const materias = await service.listarMaterias({ unidadAcademicaId, carreraId });
    res.json(materias);
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// DOCENTES
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/docentes
 * Lista todos los docentes. Ambos roles acceden sin restricción de UA.
 */
async function listarDocentes(req, res, next) {
  try {
    const docentes = await service.listarDocentes();
    res.json(docentes);
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────────
// COMISIONES
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/comisiones?anio=<n>&cuatrimestre=<1|2>&unidad_academica_id=<id>
 *                   &materia_id=<id>&modalidad=<v>&turno=<v>
 *
 * COORDINADOR: todos los filtros son opcionales.
 * ADMINISTRATIVO: unidad_academica_id se sobreescribe con el del JWT.
 *   → Si el ADMINISTRATIVO intenta ver otra UA, igualmente obtiene su UA.
 *   → No se lanza error; se devuelve la lista filtrada por su propia UA.
 *   Decisión documentada: lista vacía vs. 403 — elegimos lista filtrada
 *   (comportamiento transparente y no discriminatorio).
 */
async function listarComisiones(req, res, next) {
  try {
    const { anio, cuatrimestre, materia_id, modalidad, turno } = req.query;

    let unidadAcademicaId;
    if (req.user.rol === 'ADMINISTRATIVO') {
      unidadAcademicaId = req.user.unidadAcademicaId;
    } else {
      unidadAcademicaId = req.query.unidad_academica_id
        ? Number(req.query.unidad_academica_id)
        : undefined;
    }

    const comisiones = await service.listarComisiones({
      anio:              anio       ? Number(anio)       : undefined,
      cuatrimestre:      cuatrimestre                    ? Number(cuatrimestre) : undefined,
      unidadAcademicaId,
      materiaId:         materia_id ? Number(materia_id) : undefined,
      modalidad,
      turno,
    });
    res.json(comisiones);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/comisiones
 * Registra una comisión nueva.
 * Acceso: ADMINISTRATIVO (y COORDINADOR puede, ver routes.js).
 *
 * Body: { codigo, cupo, modalidad, turno, cuatrimestre, anio, materia_id, docente_id }
 */
async function crearComision(req, res, next) {
  try {
    const comision = await service.crearComision(req.body);
    res.status(201).json(comision);
  } catch (err) {
    next(err);
  }
}

async function crearCarrera(req, res, next) {
  try {
    const carrera = await service.crearCarrera(req.body);
    res.status(201).json(carrera);
  } catch (err) {
    next(err);
  }
}

async function crearMateria(req, res, next) {
  try {
    const materia = await service.crearMateria(req.body);
    res.status(201).json(materia);
  } catch (err) {
    next(err);
  }
}

async function crearDocente(req, res, next) {
  try {
    const docente = await service.crearDocente(req.body);
    res.status(201).json(docente);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listarUAs,
  listarCarreras,
  listarMaterias,
  listarDocentes,
  listarComisiones,
  crearComision,
  crearCarrera,
  crearMateria,
  crearDocente,
};
