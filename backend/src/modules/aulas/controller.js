'use strict';

const service = require('./service');

// ─────────────────────────────────────────────────────────
// EDIFICIOS
// ─────────────────────────────────────────────────────────

/**
 * GET /api/edificios
 * Lista todos los edificios.
 */
async function listarEdificios(req, res, next) {
  try {
    const edificios = await service.listarEdificios();
    res.json(edificios);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/edificios
 * Registra un nuevo edificio.
 * Body: { nombre, direccion }
 */
async function crearEdificio(req, res, next) {
  try {
    const { nombre, direccion } = req.body;
    const edificio = await service.crearEdificio({ nombre, direccion });
    res.status(201).json(edificio);
  } catch (err) {
    next(err);
  }
}

// ─────────────────────────────────────────────────────────
// AULAS
// ─────────────────────────────────────────────────────────

/**
 * GET /api/edificios/:id/aulas
 * Lista las aulas de un edificio específico.
 */
async function listarAulasPorEdificio(req, res, next) {
  try {
    const edificioId = Number(req.params.id);
    if (!Number.isInteger(edificioId) || edificioId <= 0) {
      return res.status(400).json({ error: 'El parámetro "id" debe ser un entero positivo' });
    }
    const aulas = await service.listarAulasPorEdificio(edificioId);
    res.json(aulas);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/aulas
 * Registra un aula nueva.
 * Body: { numero, capacidad, tipo, edificio_id }
 */
async function crearAula(req, res, next) {
  try {
    const { numero, capacidad, tipo, edificio_id } = req.body;
    const aula = await service.crearAula({ numero, capacidad, tipo, edificio_id });
    res.status(201).json(aula);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/aulas/:id
 * Actualiza parcialmente un aula (numero, capacidad y/o tipo).
 * Body (todos opcionales): { numero?, capacidad?, tipo? }
 */
async function actualizarAula(req, res, next) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'El parámetro "id" debe ser un entero positivo' });
    }
    const { numero, capacidad, tipo } = req.body;
    const aula = await service.actualizarAula(id, { numero, capacidad, tipo });
    res.json(aula);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listarEdificios,
  crearEdificio,
  listarAulasPorEdificio,
  crearAula,
  actualizarAula,
};
