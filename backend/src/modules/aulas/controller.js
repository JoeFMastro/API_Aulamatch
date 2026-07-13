'use strict';

const service = require('./service');

const parseId = (val, res) => {
  const id = Number(val);
  if (!Number.isInteger(id) || id <= 0) { res.status(400).json({ error: '"id" debe ser un entero positivo' }); return null; }
  return id;
};

// ─────────────────────────────────────────────────────────
// EDIFICIOS
// ─────────────────────────────────────────────────────────

async function listarEdificios(req, res, next) {
  try { res.json(await service.listarEdificios()); } catch (err) { next(err); }
}

async function crearEdificio(req, res, next) {
  try { res.status(201).json(await service.crearEdificio(req.body)); } catch (err) { next(err); }
}

async function actualizarEdificio(req, res, next) {
  try {
    const id = parseId(req.params.id, res); if (!id) return;
    res.json(await service.actualizarEdificio(id, req.body));
  } catch (err) { next(err); }
}

async function eliminarEdificio(req, res, next) {
  try {
    const id = parseId(req.params.id, res); if (!id) return;
    await service.eliminarEdificio(id);
    res.status(204).end();
  } catch (err) { next(err); }
}

// ─────────────────────────────────────────────────────────
// AULAS
// ─────────────────────────────────────────────────────────

async function listarAulas(req, res, next) {
  try { res.json(await service.listarAulas()); } catch (err) { next(err); }
}

async function listarAulasPorEdificio(req, res, next) {
  try {
    const edificioId = parseId(req.params.id, res); if (!edificioId) return;
    res.json(await service.listarAulasPorEdificio(edificioId));
  } catch (err) { next(err); }
}

async function crearAula(req, res, next) {
  try { res.status(201).json(await service.crearAula(req.body)); } catch (err) { next(err); }
}

async function actualizarAula(req, res, next) {
  try {
    const id = parseId(req.params.id, res); if (!id) return;
    res.json(await service.actualizarAula(id, req.body));
  } catch (err) { next(err); }
}

async function eliminarAula(req, res, next) {
  try {
    const id = parseId(req.params.id, res); if (!id) return;
    await service.eliminarAula(id);
    res.status(204).end();
  } catch (err) { next(err); }
}

module.exports = {
  listarEdificios,
  crearEdificio,
  actualizarEdificio,
  eliminarEdificio,
  listarAulas,
  listarAulasPorEdificio,
  crearAula,
  actualizarAula,
  eliminarAula,
};
