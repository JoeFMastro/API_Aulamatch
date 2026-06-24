'use strict';

const db = require('../../config/db');

// Valores válidos del enum tipo_aula (doc fuente, sección 8.1)
const TIPOS_AULA_VALIDOS = ['AULA', 'LABORATORIO', 'AUDITORIO', 'SALA_VIDEOCONFERENCIA'];

// ─────────────────────────────────────────────────────────
// EDIFICIOS
// ─────────────────────────────────────────────────────────

/**
 * Devuelve todos los edificios ordenados por nombre.
 * @returns {Promise<object[]>}
 */
async function listarEdificios() {
  const { rows } = await db.query(
    'SELECT id, nombre, direccion FROM edificio ORDER BY nombre ASC'
  );
  return rows;
}

/**
 * Crea un nuevo edificio.
 * @param {{ nombre: string, direccion: string }} datos
 * @returns {Promise<object>} El edificio creado
 */
async function crearEdificio({ nombre, direccion }) {
  if (!nombre?.trim()) {
    const err = new Error('El campo "nombre" es obligatorio');
    err.status = 400;
    throw err;
  }
  if (!direccion?.trim()) {
    const err = new Error('El campo "direccion" es obligatorio');
    err.status = 400;
    throw err;
  }

  const { rows } = await db.query(
    `INSERT INTO edificio (nombre, direccion)
     VALUES ($1, $2)
     RETURNING id, nombre, direccion`,
    [nombre.trim(), direccion.trim()]
  );
  return rows[0];
}

/**
 * Devuelve un edificio por id, o lanza 404 si no existe.
 * @param {number} id
 * @returns {Promise<object>}
 */
async function obtenerEdificioPorId(id) {
  const { rows } = await db.query(
    'SELECT id, nombre, direccion FROM edificio WHERE id = $1',
    [id]
  );
  if (rows.length === 0) {
    const err = new Error(`Edificio con id ${id} no encontrado`);
    err.status = 404;
    throw err;
  }
  return rows[0];
}

// ─────────────────────────────────────────────────────────
// AULAS
// ─────────────────────────────────────────────────────────

/**
 * Lista las aulas de un edificio específico.
 * @param {number} edificioId
 * @returns {Promise<object[]>}
 */
async function listarAulasPorEdificio(edificioId) {
  // Verificar que el edificio exista antes de listar
  await obtenerEdificioPorId(edificioId);

  const { rows } = await db.query(
    `SELECT a.id, a.numero, a.capacidad, a.tipo, a.edificio_id,
            e.nombre AS edificio_nombre
     FROM aula a
     JOIN edificio e ON e.id = a.edificio_id
     WHERE a.edificio_id = $1
     ORDER BY a.numero ASC`,
    [edificioId]
  );
  return rows;
}

/**
 * Crea un aula nueva.
 * @param {{ numero: string, capacidad: number, tipo: string, edificio_id: number }} datos
 * @returns {Promise<object>} El aula creada
 */
async function crearAula({ numero, capacidad, tipo, edificio_id }) {
  // Validaciones de negocio
  if (!numero?.trim()) {
    const err = new Error('El campo "numero" es obligatorio');
    err.status = 400;
    throw err;
  }
  const cap = Number(capacidad);
  if (!Number.isInteger(cap) || cap <= 0) {
    const err = new Error('La "capacidad" debe ser un entero mayor a 0');
    err.status = 400;
    throw err;
  }
  if (!TIPOS_AULA_VALIDOS.includes(tipo)) {
    const err = new Error(
      `Tipo de aula inválido. Valores permitidos: ${TIPOS_AULA_VALIDOS.join(', ')}`
    );
    err.status = 400;
    throw err;
  }
  if (!edificio_id) {
    const err = new Error('El campo "edificio_id" es obligatorio');
    err.status = 400;
    throw err;
  }

  // Verificar que el edificio exista (la FK lo garantiza en BD, pero damos error descriptivo)
  await obtenerEdificioPorId(Number(edificio_id));

  const { rows } = await db.query(
    `INSERT INTO aula (numero, capacidad, tipo, edificio_id)
     VALUES ($1, $2, $3::tipo_aula, $4)
     RETURNING id, numero, capacidad, tipo, edificio_id`,
    [numero.trim(), cap, tipo, Number(edificio_id)]
  );
  return rows[0];
}

/**
 * Actualiza los datos de un aula existente (PATCH — solo los campos enviados).
 * Campos actualizables: numero, capacidad, tipo.
 * edificio_id NO es actualizable (cambiar un aula de edificio es una operación
 * de negocio que requiere validación adicional futura).
 *
 * @param {number} id
 * @param {{ numero?: string, capacidad?: number, tipo?: string }} campos
 * @returns {Promise<object>} El aula actualizada
 */
async function actualizarAula(id, campos) {
  // Verificar que el aula exista
  const { rows: aulaRows } = await db.query(
    'SELECT id FROM aula WHERE id = $1',
    [id]
  );
  if (aulaRows.length === 0) {
    const err = new Error(`Aula con id ${id} no encontrada`);
    err.status = 404;
    throw err;
  }

  // Construir SET dinámico solo con los campos recibidos
  const sets = [];
  const valores = [];
  let idx = 1;

  if (campos.numero !== undefined) {
    if (!campos.numero?.trim()) {
      const err = new Error('El campo "numero" no puede estar vacío');
      err.status = 400;
      throw err;
    }
    sets.push(`numero = $${idx++}`);
    valores.push(campos.numero.trim());
  }

  if (campos.capacidad !== undefined) {
    const cap = Number(campos.capacidad);
    if (!Number.isInteger(cap) || cap <= 0) {
      const err = new Error('La "capacidad" debe ser un entero mayor a 0');
      err.status = 400;
      throw err;
    }
    sets.push(`capacidad = $${idx++}`);
    valores.push(cap);
  }

  if (campos.tipo !== undefined) {
    if (!TIPOS_AULA_VALIDOS.includes(campos.tipo)) {
      const err = new Error(
        `Tipo de aula inválido. Valores permitidos: ${TIPOS_AULA_VALIDOS.join(', ')}`
      );
      err.status = 400;
      throw err;
    }
    sets.push(`tipo = $${idx++}::tipo_aula`);
    valores.push(campos.tipo);
  }

  if (sets.length === 0) {
    const err = new Error('No se enviaron campos a actualizar (numero, capacidad, tipo)');
    err.status = 400;
    throw err;
  }

  valores.push(id); // último parámetro para el WHERE
  const { rows } = await db.query(
    `UPDATE aula SET ${sets.join(', ')}
     WHERE id = $${idx}
     RETURNING id, numero, capacidad, tipo, edificio_id`,
    valores
  );
  return rows[0];
}

module.exports = {
  listarEdificios,
  crearEdificio,
  obtenerEdificioPorId,
  listarAulasPorEdificio,
  crearAula,
  actualizarAula,
  TIPOS_AULA_VALIDOS,
};
