'use strict';

const service = require('./service');

const parseId = (val, res) => {
  const id = Number(val);
  if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ error: '"id" debe ser un entero positivo' }); return null; }
  return id;
};

// ─── UNIDADES ACADÉMICAS ─────────────────────────────────────────────────
async function listarUAs(req, res, next) {
  try { res.json(await service.listarUnidadesAcademicas()); } catch (err) { next(err); }
}

// ─── CARRERAS ────────────────────────────────────────────────────────────
async function listarCarreras(req, res, next) {
  try {
    let uaId = req.user.rol === 'ADMINISTRATIVO'
      ? req.user.unidadAcademicaId
      : (req.query.unidad_academica_id ? Number(req.query.unidad_academica_id) : undefined);
    res.json(await service.listarCarreras({ unidadAcademicaId: uaId }));
  } catch (err) { next(err); }
}

async function crearCarrera(req, res, next) {
  try { res.status(201).json(await service.crearCarrera(req.body)); } catch (err) { next(err); }
}

async function actualizarCarrera(req, res, next) {
  try {
    const id = parseId(req.params.id, res); if (!id) return;
    res.json(await service.actualizarCarrera(id, req.body));
  } catch (err) { next(err); }
}

async function eliminarCarrera(req, res, next) {
  try {
    const id = parseId(req.params.id, res); if (!id) return;
    await service.eliminarCarrera(id); res.status(204).end();
  } catch (err) { next(err); }
}

// ─── MATERIAS ────────────────────────────────────────────────────────────
async function listarMaterias(req, res, next) {
  try {
    let uaId = req.user.rol === 'ADMINISTRATIVO'
      ? req.user.unidadAcademicaId
      : (req.query.unidad_academica_id ? Number(req.query.unidad_academica_id) : undefined);
    const carreraId = req.query.carrera_id ? Number(req.query.carrera_id) : undefined;
    res.json(await service.listarMaterias({ unidadAcademicaId: uaId, carreraId }));
  } catch (err) { next(err); }
}

async function crearMateria(req, res, next) {
  try { res.status(201).json(await service.crearMateria(req.body)); } catch (err) { next(err); }
}

async function actualizarMateria(req, res, next) {
  try {
    const id = parseId(req.params.id, res); if (!id) return;
    res.json(await service.actualizarMateria(id, req.body));
  } catch (err) { next(err); }
}

async function eliminarMateria(req, res, next) {
  try {
    const id = parseId(req.params.id, res); if (!id) return;
    await service.eliminarMateria(id); res.status(204).end();
  } catch (err) { next(err); }
}

// ─── DOCENTES ────────────────────────────────────────────────────────────
async function listarDocentes(req, res, next) {
  try { res.json(await service.listarDocentes()); } catch (err) { next(err); }
}

async function crearDocente(req, res, next) {
  try { res.status(201).json(await service.crearDocente(req.body)); } catch (err) { next(err); }
}

async function actualizarDocente(req, res, next) {
  try {
    const id = parseId(req.params.id, res); if (!id) return;
    res.json(await service.actualizarDocente(id, req.body));
  } catch (err) { next(err); }
}

async function eliminarDocente(req, res, next) {
  try {
    const id = parseId(req.params.id, res); if (!id) return;
    await service.eliminarDocente(id); res.status(204).end();
  } catch (err) { next(err); }
}

// ─── COMISIONES ──────────────────────────────────────────────────────────
async function listarComisiones(req, res, next) {
  try {
    let uaId = req.user.rol === 'ADMINISTRATIVO'
      ? req.user.unidadAcademicaId
      : (req.query.unidad_academica_id ? Number(req.query.unidad_academica_id) : undefined);
    const { anio, cuatrimestre, materia_id, modalidad, turno } = req.query;
    res.json(await service.listarComisiones({
      unidadAcademicaId: uaId,
      materiaId: materia_id ? Number(materia_id) : undefined,
      anio: anio ? Number(anio) : undefined,
      cuatrimestre: cuatrimestre ? Number(cuatrimestre) : undefined,
      modalidad, turno,
    }));
  } catch (err) { next(err); }
}

async function crearComision(req, res, next) {
  try { res.status(201).json(await service.crearComision(req.body)); } catch (err) { next(err); }
}

async function actualizarComision(req, res, next) {
  try {
    const id = parseId(req.params.id, res); if (!id) return;
    res.json(await service.actualizarComision(id, req.body));
  } catch (err) { next(err); }
}

async function eliminarComision(req, res, next) {
  try {
    const id = parseId(req.params.id, res); if (!id) return;
    await service.eliminarComision(id); res.status(204).end();
  } catch (err) { next(err); }
}

module.exports = {
  listarUAs,
  listarCarreras, crearCarrera, actualizarCarrera, eliminarCarrera,
  listarMaterias, crearMateria, actualizarMateria, eliminarMateria,
  listarDocentes, crearDocente, actualizarDocente, eliminarDocente,
  listarComisiones, crearComision, actualizarComision, eliminarComision,
};
