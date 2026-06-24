'use strict';

/**
 * academico/service.js
 * Lógica de consultas académicas.
 *
 * IMPORTANTE — filtros por rol (sección 10.4):
 *   ADMINISTRATIVO: las queries de carreras, materias y comisiones se
 *                   filtran automáticamente por su unidadAcademicaId del JWT.
 *   COORDINADOR: sin restricción de UA (acceso total).
 *
 * Enums válidos (del esquema 01_schema.sql):
 *   modalidad    → PRESENCIAL | VIRTUAL | HIBRIDA
 *   turno        → MANANA | TARDE | NOCHE
 *   cuatrimestre → 1 | 2
 *   tipo_clase   → TEORICA | PRACTICA | TEORICO_PRACTICA
 */

const db = require('../../config/db');

const MODALIDADES_VALIDAS  = ['PRESENCIAL', 'VIRTUAL', 'HIBRIDA'];
const TURNOS_VALIDOS       = ['MANANA', 'TARDE', 'NOCHE'];

// ─────────────────────────────────────────────────────────────
// UNIDADES ACADÉMICAS
// ─────────────────────────────────────────────────────────────

/**
 * Lista todas las unidades académicas, ordenadas por nombre.
 * Acceso: COORDINADOR y ADMINISTRATIVO (sin filtro — la propia UA
 * del ADMINISTRATIVO ya está en su token; no necesita un listado filtrado).
 * @returns {Promise<object[]>}
 */
async function listarUnidadesAcademicas() {
  const { rows } = await db.query(
    `SELECT ua.id,
            ua.nombre,
            ua.edificio_preferencia_id,
            e.nombre AS edificio_preferencia_nombre
       FROM unidad_academica ua
       LEFT JOIN edificio e ON e.id = ua.edificio_preferencia_id
      ORDER BY ua.nombre ASC`
  );
  return rows;
}

// ─────────────────────────────────────────────────────────────
// CARRERAS
// ─────────────────────────────────────────────────────────────

/**
 * Lista carreras con filtro opcional por unidad_academica_id.
 * Si el usuario es ADMINISTRATIVO, el filtro de UA se aplica siempre
 * desde el JWT, independientemente del query param enviado.
 *
 * @param {{ unidadAcademicaId?: number }} filtros
 * @returns {Promise<object[]>}
 */
async function listarCarreras({ unidadAcademicaId } = {}) {
  const params = [];
  const where  = [];

  if (unidadAcademicaId) {
    params.push(Number(unidadAcademicaId));
    where.push(`c.unidad_academica_id = $${params.length}`);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const { rows } = await db.query(
    `SELECT c.id,
            c.nombre,
            c.codigo,
            c.unidad_academica_id,
            ua.nombre AS unidad_academica_nombre
       FROM carrera c
       JOIN unidad_academica ua ON ua.id = c.unidad_academica_id
      ${whereClause}
      ORDER BY c.nombre ASC`,
    params
  );
  return rows;
}

// ─────────────────────────────────────────────────────────────
// MATERIAS
// ─────────────────────────────────────────────────────────────

/**
 * Lista materias con filtros opcionales por UA y/o carrera.
 * Incluye el array de carreras asociadas (relación M:N carrera_materia).
 *
 * Filtros aplicables:
 *   unidadAcademicaId — filtra por la UA de la materia
 *   carreraId         — filtra materias que pertenecen a esa carrera
 *
 * @param {{ unidadAcademicaId?: number, carreraId?: number }} filtros
 * @returns {Promise<object[]>}
 */
async function listarMaterias({ unidadAcademicaId, carreraId } = {}) {
  const params = [];
  const where  = [];

  if (unidadAcademicaId) {
    params.push(Number(unidadAcademicaId));
    where.push(`m.unidad_academica_id = $${params.length}`);
  }

  if (carreraId) {
    params.push(Number(carreraId));
    // Subquery: solo materias que están en carrera_materia para esa carrera
    where.push(
      `m.id IN (SELECT cm.materia_id FROM carrera_materia cm WHERE cm.carrera_id = $${params.length})`
    );
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  // Query principal con las carreras asociadas como JSON array
  const { rows } = await db.query(
    `SELECT m.id,
            m.nombre,
            m.codigo,
            m.unidad_academica_id,
            ua.nombre AS unidad_academica_nombre,
            COALESCE(
              json_agg(
                json_build_object('id', c.id, 'nombre', c.nombre, 'codigo', c.codigo)
                ORDER BY c.nombre
              ) FILTER (WHERE c.id IS NOT NULL),
              '[]'
            ) AS carreras
       FROM materia m
       JOIN unidad_academica ua ON ua.id = m.unidad_academica_id
       LEFT JOIN carrera_materia cm ON cm.materia_id = m.id
       LEFT JOIN carrera c ON c.id = cm.carrera_id
      ${whereClause}
      GROUP BY m.id, m.nombre, m.codigo, m.unidad_academica_id, ua.nombre
      ORDER BY m.nombre ASC`,
    params
  );
  return rows;
}

// ─────────────────────────────────────────────────────────────
// DOCENTES
// ─────────────────────────────────────────────────────────────

/**
 * Lista todos los docentes ordenados por apellido y nombre.
 * @returns {Promise<object[]>}
 */
async function listarDocentes() {
  const { rows } = await db.query(
    `SELECT id, nombre, apellido, cargo
       FROM docente
      ORDER BY apellido ASC, nombre ASC`
  );
  return rows;
}

// ─────────────────────────────────────────────────────────────
// COMISIONES
// ─────────────────────────────────────────────────────────────

/**
 * Lista comisiones con filtros opcionales.
 *
 * Filtros disponibles (query params):
 *   anio             — número de año (ej: 2025)
 *   cuatrimestre     — 1 | 2
 *   unidadAcademicaId — filtra por la UA de la materia de la comisión
 *   materiaId        — filtra por materia específica
 *   modalidad        — PRESENCIAL | VIRTUAL | HIBRIDA
 *   turno            — MANANA | TARDE | NOCHE
 *
 * Comportamiento por rol:
 *   ADMINISTRATIVO → unidadAcademicaId se sobreescribe SIEMPRE con el del JWT.
 *                    No puede ver comisiones de otras UAs (lista vacía, no error).
 *   COORDINADOR    → puede filtrar por UA o ver todas.
 *
 * @param {object} filtros
 * @returns {Promise<object[]>}
 */
async function listarComisiones(filtros = {}) {
  const { anio, cuatrimestre, unidadAcademicaId, materiaId, modalidad, turno } = filtros;

  const params = [];
  const where  = [];

  if (anio) {
    params.push(Number(anio));
    where.push(`co.anio = $${params.length}`);
  }

  if (cuatrimestre) {
    const c = Number(cuatrimestre);
    if (c !== 1 && c !== 2) {
      const err = new Error('El filtro "cuatrimestre" debe ser 1 o 2');
      err.status = 400;
      throw err;
    }
    params.push(c);
    where.push(`co.cuatrimestre = $${params.length}`);
  }

  if (unidadAcademicaId) {
    params.push(Number(unidadAcademicaId));
    where.push(`m.unidad_academica_id = $${params.length}`);
  }

  if (materiaId) {
    params.push(Number(materiaId));
    where.push(`co.materia_id = $${params.length}`);
  }

  if (modalidad) {
    if (!MODALIDADES_VALIDAS.includes(modalidad)) {
      const err = new Error(
        `Modalidad inválida. Valores permitidos: ${MODALIDADES_VALIDAS.join(', ')}`
      );
      err.status = 400;
      throw err;
    }
    params.push(modalidad);
    where.push(`co.modalidad = $${params.length}::modalidad`);
  }

  if (turno) {
    if (!TURNOS_VALIDOS.includes(turno)) {
      const err = new Error(
        `Turno inválido. Valores permitidos: ${TURNOS_VALIDOS.join(', ')}`
      );
      err.status = 400;
      throw err;
    }
    params.push(turno);
    where.push(`co.turno = $${params.length}::turno`);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const { rows } = await db.query(
    `SELECT co.id,
            co.codigo,
            co.cupo,
            co.inscriptos,
            co.modalidad,
            co.turno,
            co.cuatrimestre,
            co.anio,
            co.materia_id,
            m.nombre  AS materia_nombre,
            m.codigo  AS materia_codigo,
            m.unidad_academica_id,
            ua.nombre AS unidad_academica_nombre,
            co.docente_id,
            d.nombre  AS docente_nombre,
            d.apellido AS docente_apellido
       FROM comision co
       JOIN materia m        ON m.id  = co.materia_id
       JOIN unidad_academica ua ON ua.id = m.unidad_academica_id
       JOIN docente d         ON d.id  = co.docente_id
      ${whereClause}
      ORDER BY co.anio DESC, co.cuatrimestre DESC, m.nombre ASC, co.codigo ASC`,
    params
  );
  return rows;
}

/**
 * Crea una comisión nueva.
 * Acceso: ADMINISTRATIVO (también COORDINADOR puede, pero la especificación
 * asigna la gestión de excepciones al perfil administrativo).
 *
 * Campos obligatorios del esquema (01_schema.sql):
 *   codigo, cupo, modalidad, turno, cuatrimestre, anio, materia_id, docente_id
 *
 * Campos con DEFAULT en BD (no obligatorios en API):
 *   inscriptos (DEFAULT 0)
 *
 * @param {object} datos
 * @returns {Promise<object>}
 */
async function crearComision(datos) {
  const { codigo, cupo, modalidad, turno, cuatrimestre, anio, materia_id, docente_id } = datos;

  // ── Validaciones de presencia ────────────────────────────
  const requeridos = { codigo, cupo, modalidad, turno, cuatrimestre, anio, materia_id, docente_id };
  for (const [campo, valor] of Object.entries(requeridos)) {
    if (valor === undefined || valor === null || valor === '') {
      const err = new Error(`El campo "${campo}" es obligatorio`);
      err.status = 400;
      throw err;
    }
  }

  // ── Validaciones de dominio ──────────────────────────────
  const cupoNum = Number(cupo);
  if (!Number.isInteger(cupoNum) || cupoNum <= 0) {
    const err = new Error('"cupo" debe ser un entero mayor a 0');
    err.status = 400;
    throw err;
  }

  const cuatriNum = Number(cuatrimestre);
  if (cuatriNum !== 1 && cuatriNum !== 2) {
    const err = new Error('"cuatrimestre" debe ser 1 o 2');
    err.status = 400;
    throw err;
  }

  const anioNum = Number(anio);
  if (!Number.isInteger(anioNum) || anioNum < 2000 || anioNum > 2100) {
    const err = new Error('"anio" debe ser un año válido entre 2000 y 2100');
    err.status = 400;
    throw err;
  }

  if (!MODALIDADES_VALIDAS.includes(modalidad)) {
    const err = new Error(
      `Modalidad inválida. Valores permitidos: ${MODALIDADES_VALIDAS.join(', ')}`
    );
    err.status = 400;
    throw err;
  }

  if (!TURNOS_VALIDOS.includes(turno)) {
    const err = new Error(
      `Turno inválido. Valores permitidos: ${TURNOS_VALIDOS.join(', ')}`
    );
    err.status = 400;
    throw err;
  }

  // La FK a materia y docente la valida PostgreSQL → el errorHandler mapea 23503 → 409
  const { rows } = await db.query(
    `INSERT INTO comision
       (codigo, cupo, modalidad, turno, cuatrimestre, anio, materia_id, docente_id)
     VALUES ($1, $2, $3::modalidad, $4::turno, $5, $6, $7, $8)
     RETURNING id, codigo, cupo, inscriptos, modalidad, turno,
               cuatrimestre, anio, materia_id, docente_id`,
    [
      codigo.trim(),
      cupoNum,
      modalidad,
      turno,
      cuatriNum,
      anioNum,
      Number(materia_id),
      Number(docente_id),
    ]
  );
  return rows[0];
}

module.exports = {
  listarUnidadesAcademicas,
  listarCarreras,
  listarMaterias,
  listarDocentes,
  listarComisiones,
  crearComision,
};
