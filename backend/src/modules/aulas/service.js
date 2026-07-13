'use strict';

const db = require('../../config/db');

const TIPOS_AULA_VALIDOS = ['AULA', 'LABORATORIO', 'AUDITORIO', 'SALA_VIDEOCONFERENCIA'];

// ─────────────────────────────────────────────────────────
// EDIFICIOS
// ─────────────────────────────────────────────────────────

async function listarEdificios() {
  const { rows } = await db.query(
    'SELECT id, nombre, direccion FROM edificio ORDER BY nombre ASC'
  );
  return rows;
}

async function crearEdificio({ nombre, direccion }) {
  if (!nombre?.trim()) { const e = new Error('El campo "nombre" es obligatorio'); e.status = 400; throw e; }
  if (!direccion?.trim()) { const e = new Error('El campo "direccion" es obligatorio'); e.status = 400; throw e; }
  const { rows } = await db.query(
    `INSERT INTO edificio (nombre, direccion) VALUES ($1, $2) RETURNING id, nombre, direccion`,
    [nombre.trim(), direccion.trim()]
  );
  return rows[0];
}

async function obtenerEdificioPorId(id) {
  const { rows } = await db.query('SELECT id, nombre, direccion FROM edificio WHERE id = $1', [id]);
  if (rows.length === 0) { const e = new Error(`Edificio con id ${id} no encontrado`); e.status = 404; throw e; }
  return rows[0];
}

async function actualizarEdificio(id, { nombre, direccion }) {
  await obtenerEdificioPorId(id);
  const sets = []; const vals = []; let i = 1;
  if (nombre !== undefined) {
    if (!nombre?.trim()) { const e = new Error('"nombre" no puede estar vacío'); e.status = 400; throw e; }
    sets.push(`nombre=$${i++}`); vals.push(nombre.trim());
  }
  if (direccion !== undefined) {
    if (!direccion?.trim()) { const e = new Error('"direccion" no puede estar vacío'); e.status = 400; throw e; }
    sets.push(`direccion=$${i++}`); vals.push(direccion.trim());
  }
  if (sets.length === 0) { const e = new Error('Sin campos a actualizar'); e.status = 400; throw e; }
  vals.push(id);
  const { rows } = await db.query(
    `UPDATE edificio SET ${sets.join(',')} WHERE id=$${i} RETURNING id, nombre, direccion`,
    vals
  );
  return rows[0];
}

async function eliminarEdificio(id) {
  await obtenerEdificioPorId(id);
  const { rows: dep } = await db.query('SELECT COUNT(*) AS cnt FROM aula WHERE edificio_id=$1', [id]);
  if (Number(dep[0].cnt) > 0) {
    const e = new Error(`No se puede eliminar: el edificio tiene ${dep[0].cnt} aula(s) asociada(s)`);
    e.status = 409; throw e;
  }
  await db.query('DELETE FROM edificio WHERE id=$1', [id]);
}

// ─────────────────────────────────────────────────────────
// AULAS
// ─────────────────────────────────────────────────────────

async function listarAulas() {
  const { rows } = await db.query(
    `SELECT a.id, a.numero, a.capacidad, a.tipo, a.edificio_id, e.nombre AS edificio_nombre
     FROM aula a
     JOIN edificio e ON e.id = a.edificio_id
     ORDER BY e.nombre, a.numero ASC`
  );
  return rows;
}

async function listarAulasPorEdificio(edificioId) {
  await obtenerEdificioPorId(edificioId);
  const { rows } = await db.query(
    `SELECT a.id, a.numero, a.capacidad, a.tipo, a.edificio_id, e.nombre AS edificio_nombre
     FROM aula a
     JOIN edificio e ON e.id = a.edificio_id
     WHERE a.edificio_id=$1
     ORDER BY a.numero ASC`,
    [edificioId]
  );
  return rows;
}

async function crearAula({ numero, capacidad, tipo, edificio_id }) {
  if (!numero?.trim()) { const e = new Error('El campo "numero" es obligatorio'); e.status = 400; throw e; }
  const cap = Number(capacidad);
  if (!Number.isInteger(cap) || cap <= 0) { const e = new Error('"capacidad" debe ser un entero mayor a 0'); e.status = 400; throw e; }
  if (!TIPOS_AULA_VALIDOS.includes(tipo)) { const e = new Error(`Tipo inválido. Valores: ${TIPOS_AULA_VALIDOS.join(', ')}`); e.status = 400; throw e; }
  if (!edificio_id) { const e = new Error('"edificio_id" es obligatorio'); e.status = 400; throw e; }
  await obtenerEdificioPorId(Number(edificio_id));
  const { rows } = await db.query(
    `INSERT INTO aula (numero, capacidad, tipo, edificio_id)
     VALUES ($1,$2,$3::tipo_aula,$4)
     RETURNING id, numero, capacidad, tipo, edificio_id`,
    [numero.trim(), cap, tipo, Number(edificio_id)]
  );
  return rows[0];
}

async function actualizarAula(id, campos) {
  const { rows: ex } = await db.query('SELECT id FROM aula WHERE id=$1', [id]);
  if (ex.length === 0) { const e = new Error(`Aula ${id} no encontrada`); e.status = 404; throw e; }
  const sets = []; const vals = []; let i = 1;
  if (campos.numero !== undefined) {
    if (!campos.numero?.trim()) { const e = new Error('"numero" no puede estar vacío'); e.status = 400; throw e; }
    sets.push(`numero=$${i++}`); vals.push(campos.numero.trim());
  }
  if (campos.capacidad !== undefined) {
    const cap = Number(campos.capacidad);
    if (!Number.isInteger(cap) || cap <= 0) { const e = new Error('"capacidad" debe ser un entero >0'); e.status = 400; throw e; }
    sets.push(`capacidad=$${i++}`); vals.push(cap);
  }
  if (campos.tipo !== undefined) {
    if (!TIPOS_AULA_VALIDOS.includes(campos.tipo)) { const e = new Error('Tipo inválido'); e.status = 400; throw e; }
    sets.push(`tipo=$${i++}::tipo_aula`); vals.push(campos.tipo);
  }
  if (campos.edificio_id !== undefined) {
    await obtenerEdificioPorId(Number(campos.edificio_id));
    sets.push(`edificio_id=$${i++}`); vals.push(Number(campos.edificio_id));
  }
  if (sets.length === 0) { const e = new Error('Sin campos a actualizar'); e.status = 400; throw e; }
  vals.push(id);
  const { rows } = await db.query(
    `UPDATE aula SET ${sets.join(',')} WHERE id=$${i} RETURNING id, numero, capacidad, tipo, edificio_id`,
    vals
  );
  return rows[0];
}

async function eliminarAula(id) {
  const { rows: ex } = await db.query('SELECT id FROM aula WHERE id=$1', [id]);
  if (ex.length === 0) { const e = new Error(`Aula ${id} no encontrada`); e.status = 404; throw e; }
  // Verificar asignaciones activas (estado != PENDIENTE significa asignada o en conflicto)
  const { rows: dep } = await db.query(
    `SELECT COUNT(*) AS cnt FROM asignacion WHERE aula_id=$1`,
    [id]
  );
  if (Number(dep[0].cnt) > 0) {
    const e = new Error(`No se puede eliminar: el aula tiene ${dep[0].cnt} asignación(es) asociada(s)`);
    e.status = 409; throw e;
  }
  await db.query('DELETE FROM aula WHERE id=$1', [id]);
}

module.exports = {
  listarEdificios,
  crearEdificio,
  obtenerEdificioPorId,
  actualizarEdificio,
  eliminarEdificio,
  listarAulas,
  listarAulasPorEdificio,
  crearAula,
  actualizarAula,
  eliminarAula,
  TIPOS_AULA_VALIDOS,
};
