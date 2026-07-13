'use strict';

/**
 * academico/service.js — CRUD completo para Carreras, Materias, Docentes, Comisiones.
 *
 * Filtros por rol:
 *   ADMINISTRATIVO: carreras/materias/comisiones filtradas por su unidadAcademicaId del JWT.
 *   COORDINADOR: acceso total sin restricción de UA.
 *
 * Enums válidos:
 *   modalidad    → PRESENCIAL | VIRTUAL | HIBRIDA
 *   turno        → MANANA | TARDE | NOCHE
 *   cuatrimestre → 1 | 2
 */

const db = require('../../config/db');

const MODALIDADES_VALIDAS = ['PRESENCIAL', 'VIRTUAL', 'HIBRIDA'];
const TURNOS_VALIDOS      = ['MANANA', 'TARDE', 'NOCHE'];

// ─────────────────────────────────────────────────────────────
// UNIDADES ACADÉMICAS (solo lectura)
// ─────────────────────────────────────────────────────────────

async function listarUnidadesAcademicas() {
  const { rows } = await db.query(
    `SELECT ua.id, ua.nombre, ua.edificio_preferencia_id,
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

async function listarCarreras({ unidadAcademicaId } = {}) {
  const params = []; const where = [];
  if (unidadAcademicaId) { params.push(Number(unidadAcademicaId)); where.push(`c.unidad_academica_id=$${params.length}`); }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const { rows } = await db.query(
    `SELECT c.id, c.nombre, c.codigo, c.unidad_academica_id, ua.nombre AS unidad_academica_nombre
       FROM carrera c
       JOIN unidad_academica ua ON ua.id = c.unidad_academica_id
      ${w}
      ORDER BY c.nombre ASC`,
    params
  );
  return rows;
}

async function crearCarrera({ nombre, codigo, unidad_academica_id }) {
  if (!nombre?.trim()) { const e = new Error('"nombre" es obligatorio'); e.status = 400; throw e; }
  if (!codigo?.trim()) { const e = new Error('"codigo" es obligatorio'); e.status = 400; throw e; }
  if (!unidad_academica_id) { const e = new Error('"unidad_academica_id" es obligatorio'); e.status = 400; throw e; }
  const { rows } = await db.query(
    `INSERT INTO carrera (nombre, codigo, unidad_academica_id)
     VALUES ($1, $2, $3)
     RETURNING id, nombre, codigo, unidad_academica_id`,
    [nombre.trim(), codigo.trim().toUpperCase(), Number(unidad_academica_id)]
  );
  return rows[0];
}

async function actualizarCarrera(id, { nombre, codigo, unidad_academica_id }) {
  const { rows: ex } = await db.query('SELECT id FROM carrera WHERE id=$1', [id]);
  if (ex.length === 0) { const e = new Error(`Carrera ${id} no encontrada`); e.status = 404; throw e; }
  const sets = []; const vals = []; let i = 1;
  if (nombre !== undefined) { if (!nombre?.trim()) { const e = new Error('"nombre" no puede estar vacío'); e.status = 400; throw e; } sets.push(`nombre=$${i++}`); vals.push(nombre.trim()); }
  if (codigo !== undefined) { if (!codigo?.trim()) { const e = new Error('"codigo" no puede estar vacío'); e.status = 400; throw e; } sets.push(`codigo=$${i++}`); vals.push(codigo.trim().toUpperCase()); }
  if (unidad_academica_id !== undefined) { sets.push(`unidad_academica_id=$${i++}`); vals.push(Number(unidad_academica_id)); }
  if (sets.length === 0) { const e = new Error('Sin campos a actualizar'); e.status = 400; throw e; }
  vals.push(id);
  const { rows } = await db.query(`UPDATE carrera SET ${sets.join(',')} WHERE id=$${i} RETURNING id, nombre, codigo, unidad_academica_id`, vals);
  return rows[0];
}

async function eliminarCarrera(id) {
  const { rows: ex } = await db.query('SELECT id FROM carrera WHERE id=$1', [id]);
  if (ex.length === 0) { const e = new Error(`Carrera ${id} no encontrada`); e.status = 404; throw e; }
  // Dependencias: materias vinculadas vía carrera_materia
  const { rows: dep } = await db.query('SELECT COUNT(*) AS cnt FROM carrera_materia WHERE carrera_id=$1', [id]);
  if (Number(dep[0].cnt) > 0) {
    const e = new Error(`No se puede eliminar: la carrera tiene ${dep[0].cnt} materia(s) asociada(s). Desasocie las materias primero.`);
    e.status = 409; throw e;
  }
  await db.query('DELETE FROM carrera WHERE id=$1', [id]);
}

// ─────────────────────────────────────────────────────────────
// MATERIAS
// ─────────────────────────────────────────────────────────────

async function listarMaterias({ unidadAcademicaId, carreraId } = {}) {
  const params = []; const where = [];
  if (unidadAcademicaId) { params.push(Number(unidadAcademicaId)); where.push(`m.unidad_academica_id=$${params.length}`); }
  if (carreraId) { params.push(Number(carreraId)); where.push(`EXISTS (SELECT 1 FROM carrera_materia cm WHERE cm.materia_id=m.id AND cm.carrera_id=$${params.length})`); }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const { rows } = await db.query(
    `SELECT m.id, m.nombre, m.codigo, m.unidad_academica_id, ua.nombre AS unidad_academica_nombre,
            COALESCE(
              json_agg(json_build_object('id', c.id, 'nombre', c.nombre, 'codigo', c.codigo))
                FILTER (WHERE c.id IS NOT NULL), '[]'
            ) AS carreras
       FROM materia m
       JOIN unidad_academica ua ON ua.id = m.unidad_academica_id
       LEFT JOIN carrera_materia cm ON cm.materia_id = m.id
       LEFT JOIN carrera c ON c.id = cm.carrera_id
      ${w}
      GROUP BY m.id, m.nombre, m.codigo, m.unidad_academica_id, ua.nombre
      ORDER BY m.nombre ASC`,
    params
  );
  return rows;
}

async function crearMateria({ nombre, codigo, unidad_academica_id, carrera_ids = [] }) {
  if (!nombre?.trim()) { const e = new Error('"nombre" es obligatorio'); e.status = 400; throw e; }
  if (!codigo?.trim()) { const e = new Error('"codigo" es obligatorio'); e.status = 400; throw e; }
  if (!unidad_academica_id) { const e = new Error('"unidad_academica_id" es obligatorio'); e.status = 400; throw e; }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO materia (nombre, codigo, unidad_academica_id)
       VALUES ($1, $2, $3)
       RETURNING id, nombre, codigo, unidad_academica_id`,
      [nombre.trim(), codigo.trim().toUpperCase(), Number(unidad_academica_id)]
    );
    const materia = rows[0];
    // Insertar relaciones M:N
    for (const cid of carrera_ids) {
      await client.query('INSERT INTO carrera_materia (carrera_id, materia_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [Number(cid), materia.id]);
    }
    await client.query('COMMIT');
    return materia;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function actualizarMateria(id, { nombre, codigo, unidad_academica_id, carrera_ids }) {
  const { rows: ex } = await db.query('SELECT id FROM materia WHERE id=$1', [id]);
  if (ex.length === 0) { const e = new Error(`Materia ${id} no encontrada`); e.status = 404; throw e; }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const sets = []; const vals = []; let i = 1;
    if (nombre !== undefined) { if (!nombre?.trim()) { const e = new Error('"nombre" no puede estar vacío'); e.status = 400; throw e; } sets.push(`nombre=$${i++}`); vals.push(nombre.trim()); }
    if (codigo !== undefined) { if (!codigo?.trim()) { const e = new Error('"codigo" no puede estar vacío'); e.status = 400; throw e; } sets.push(`codigo=$${i++}`); vals.push(codigo.trim().toUpperCase()); }
    if (unidad_academica_id !== undefined) { sets.push(`unidad_academica_id=$${i++}`); vals.push(Number(unidad_academica_id)); }
    let materia;
    if (sets.length > 0) {
      vals.push(id);
      const { rows } = await client.query(`UPDATE materia SET ${sets.join(',')} WHERE id=$${i} RETURNING id, nombre, codigo, unidad_academica_id`, vals);
      materia = rows[0];
    } else {
      const { rows } = await client.query('SELECT id, nombre, codigo, unidad_academica_id FROM materia WHERE id=$1', [id]);
      materia = rows[0];
    }
    // Actualizar relaciones M:N si se proporcionó carrera_ids
    if (Array.isArray(carrera_ids)) {
      await client.query('DELETE FROM carrera_materia WHERE materia_id=$1', [id]);
      for (const cid of carrera_ids) {
        await client.query('INSERT INTO carrera_materia (carrera_id, materia_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [Number(cid), id]);
      }
    }
    await client.query('COMMIT');
    return materia;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function eliminarMateria(id) {
  const { rows: ex } = await db.query('SELECT id FROM materia WHERE id=$1', [id]);
  if (ex.length === 0) { const e = new Error(`Materia ${id} no encontrada`); e.status = 404; throw e; }
  // Dependencias: comisiones activas
  const { rows: dep } = await db.query('SELECT COUNT(*) AS cnt FROM comision WHERE materia_id=$1', [id]);
  if (Number(dep[0].cnt) > 0) {
    const e = new Error(`No se puede eliminar: la materia tiene ${dep[0].cnt} comisión(es) asociada(s)`);
    e.status = 409; throw e;
  }
  // Elimina también las relaciones M:N (carrera_materia tiene ON DELETE CASCADE sobre materia)
  await db.query('DELETE FROM materia WHERE id=$1', [id]);
}

// ─────────────────────────────────────────────────────────────
// DOCENTES
// ─────────────────────────────────────────────────────────────

async function listarDocentes() {
  const { rows } = await db.query(
    `SELECT id, nombre, apellido, cargo FROM docente ORDER BY apellido ASC, nombre ASC`
  );
  return rows;
}

async function crearDocente({ nombre, apellido, cargo }) {
  if (!nombre?.trim()) { const e = new Error('"nombre" es obligatorio'); e.status = 400; throw e; }
  if (!apellido?.trim()) { const e = new Error('"apellido" es obligatorio'); e.status = 400; throw e; }
  const { rows } = await db.query(
    `INSERT INTO docente (nombre, apellido, cargo) VALUES ($1,$2,$3) RETURNING id, nombre, apellido, cargo`,
    [nombre.trim(), apellido.trim(), cargo?.trim() || null]
  );
  return rows[0];
}

async function actualizarDocente(id, { nombre, apellido, cargo }) {
  const { rows: ex } = await db.query('SELECT id FROM docente WHERE id=$1', [id]);
  if (ex.length === 0) { const e = new Error(`Docente ${id} no encontrado`); e.status = 404; throw e; }
  const sets = []; const vals = []; let i = 1;
  if (nombre !== undefined) { if (!nombre?.trim()) { const e = new Error('"nombre" no puede estar vacío'); e.status = 400; throw e; } sets.push(`nombre=$${i++}`); vals.push(nombre.trim()); }
  if (apellido !== undefined) { if (!apellido?.trim()) { const e = new Error('"apellido" no puede estar vacío'); e.status = 400; throw e; } sets.push(`apellido=$${i++}`); vals.push(apellido.trim()); }
  if (cargo !== undefined) { sets.push(`cargo=$${i++}`); vals.push(cargo?.trim() || null); }
  if (sets.length === 0) { const e = new Error('Sin campos a actualizar'); e.status = 400; throw e; }
  vals.push(id);
  const { rows } = await db.query(`UPDATE docente SET ${sets.join(',')} WHERE id=$${i} RETURNING id, nombre, apellido, cargo`, vals);
  return rows[0];
}

async function eliminarDocente(id) {
  const { rows: ex } = await db.query('SELECT id FROM docente WHERE id=$1', [id]);
  if (ex.length === 0) { const e = new Error(`Docente ${id} no encontrado`); e.status = 404; throw e; }
  const { rows: dep } = await db.query('SELECT COUNT(*) AS cnt FROM comision WHERE docente_id=$1', [id]);
  if (Number(dep[0].cnt) > 0) {
    const e = new Error(`No se puede eliminar: el docente tiene ${dep[0].cnt} comisión(es) a cargo`);
    e.status = 409; throw e;
  }
  await db.query('DELETE FROM docente WHERE id=$1', [id]);
}

// ─────────────────────────────────────────────────────────────
// COMISIONES
// ─────────────────────────────────────────────────────────────

async function listarComisiones({ unidadAcademicaId, materiaId, anio, cuatrimestre, modalidad, turno } = {}) {
  const params = []; const where = [];
  if (unidadAcademicaId) { params.push(Number(unidadAcademicaId)); where.push(`m.unidad_academica_id=$${params.length}`); }
  if (materiaId) { params.push(Number(materiaId)); where.push(`co.materia_id=$${params.length}`); }
  if (anio) { params.push(Number(anio)); where.push(`co.anio=$${params.length}`); }
  if (cuatrimestre) { params.push(Number(cuatrimestre)); where.push(`co.cuatrimestre=$${params.length}`); }
  if (modalidad) { params.push(modalidad); where.push(`co.modalidad=$${params.length}::modalidad`); }
  if (turno) { params.push(turno); where.push(`co.turno=$${params.length}::turno`); }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const { rows } = await db.query(
    `SELECT co.id, co.codigo, co.cupo, co.inscriptos, co.modalidad, co.turno,
            co.cuatrimestre, co.anio, co.materia_id, co.docente_id,
            m.nombre AS materia_nombre,
            d.nombre || ' ' || d.apellido AS docente_nombre,
            (
                SELECT json_agg(json_build_object('dia', bh.dia, 'hora_inicio', bh.hora_inicio, 'hora_fin', bh.hora_fin, 'tipo_clase', bh.tipo_clase))
                FROM banda_horaria bh
                WHERE bh.comision_id = co.id
            ) AS bandas_horarias
       FROM comision co
       JOIN materia m ON m.id = co.materia_id
       JOIN docente d ON d.id = co.docente_id
      ${w}
      ORDER BY co.anio DESC, co.cuatrimestre DESC, co.codigo ASC`,
    params
  );
  return rows;
}

async function crearComision({ codigo, cupo, modalidad, turno, cuatrimestre, anio, materia_id, docente_id, bandas = [] }) {
  const reqs = { codigo, cupo, modalidad, turno, cuatrimestre, anio, materia_id, docente_id };
  for (const [k, v] of Object.entries(reqs)) {
    if (v === undefined || v === null || v === '') {
      const e = new Error(`El campo "${k}" es obligatorio`); e.status = 400; throw e;
    }
  }
  if (!MODALIDADES_VALIDAS.includes(modalidad)) { const e = new Error(`modalidad inválida. Valores: ${MODALIDADES_VALIDAS.join(', ')}`); e.status = 400; throw e; }
  if (!TURNOS_VALIDOS.includes(turno)) { const e = new Error(`turno inválido. Valores: ${TURNOS_VALIDOS.join(', ')}`); e.status = 400; throw e; }
  const cupoNum = Number(cupo); if (!Number.isInteger(cupoNum) || cupoNum <= 0) { const e = new Error('"cupo" debe ser entero >0'); e.status = 400; throw e; }
  const cuatriNum = Number(cuatrimestre); if (cuatriNum !== 1 && cuatriNum !== 2) { const e = new Error('"cuatrimestre" debe ser 1 o 2'); e.status = 400; throw e; }
  const anioNum = Number(anio); if (!Number.isInteger(anioNum) || anioNum < 2000 || anioNum > 2100) { const e = new Error('"anio" debe ser un año entre 2000 y 2100'); e.status = 400; throw e; }

  if (!Array.isArray(bandas)) { const e = new Error('"bandas" debe ser un arreglo'); e.status = 400; throw e; }
  for (const b of bandas) {
    if (!b.dia || !b.hora_inicio || !b.hora_fin || !b.tipo_clase) {
      const e = new Error('Cada banda debe tener dia, hora_inicio, hora_fin y tipo_clase'); e.status = 400; throw e;
    }
    if (b.hora_fin <= b.hora_inicio) {
      const e = new Error('hora_fin debe ser posterior a hora_inicio en la banda horaria'); e.status = 400; throw e;
    }
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO comision (codigo, cupo, modalidad, turno, cuatrimestre, anio, materia_id, docente_id)
       VALUES ($1,$2,$3::modalidad,$4::turno,$5,$6,$7,$8)
       RETURNING id, codigo, cupo, inscriptos, modalidad, turno, cuatrimestre, anio, materia_id, docente_id`,
      [codigo.trim(), cupoNum, modalidad, turno, cuatriNum, anioNum, Number(materia_id), Number(docente_id)]
    );
    const comision = rows[0];

    for (const b of bandas) {
      await client.query(
        `INSERT INTO banda_horaria (dia, hora_inicio, hora_fin, tipo_clase, comision_id)
         VALUES ($1::dia_semana, $2, $3, $4::tipo_clase, $5)`,
        [b.dia, b.hora_inicio, b.hora_fin, b.tipo_clase, comision.id]
      );
    }
    await client.query('COMMIT');
    return comision;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function actualizarComision(id, campos) {
  const { rows: ex } = await db.query('SELECT id FROM comision WHERE id=$1', [id]);
  if (ex.length === 0) { const e = new Error(`Comisión ${id} no encontrada`); e.status = 404; throw e; }
  
  if (campos.bandas !== undefined) {
    if (!Array.isArray(campos.bandas)) { const e = new Error('"bandas" debe ser un arreglo'); e.status = 400; throw e; }
    for (const b of campos.bandas) {
      if (!b.dia || !b.hora_inicio || !b.hora_fin || !b.tipo_clase) {
        const e = new Error('Cada banda debe tener dia, hora_inicio, hora_fin y tipo_clase'); e.status = 400; throw e;
      }
      if (b.hora_fin <= b.hora_inicio) {
        const e = new Error('hora_fin debe ser posterior a hora_inicio en la banda horaria'); e.status = 400; throw e;
      }
    }
  }

  const sets = []; const vals = []; let i = 1;
  if (campos.codigo !== undefined) { if (!campos.codigo?.trim()) { const e = new Error('"codigo" no puede estar vacío'); e.status = 400; throw e; } sets.push(`codigo=$${i++}`); vals.push(campos.codigo.trim()); }
  if (campos.cupo !== undefined) { const cupoNum = Number(campos.cupo); if (!Number.isInteger(cupoNum) || cupoNum <= 0) { const e = new Error('"cupo" debe ser entero >0'); e.status = 400; throw e; } sets.push(`cupo=$${i++}`); vals.push(cupoNum); }
  if (campos.modalidad !== undefined) { if (!MODALIDADES_VALIDAS.includes(campos.modalidad)) { const e = new Error('modalidad inválida'); e.status = 400; throw e; } sets.push(`modalidad=$${i++}::modalidad`); vals.push(campos.modalidad); }
  if (campos.turno !== undefined) { if (!TURNOS_VALIDOS.includes(campos.turno)) { const e = new Error('turno inválido'); e.status = 400; throw e; } sets.push(`turno=$${i++}::turno`); vals.push(campos.turno); }
  if (campos.cuatrimestre !== undefined) { const c = Number(campos.cuatrimestre); if (c !== 1 && c !== 2) { const e = new Error('"cuatrimestre" debe ser 1 o 2'); e.status = 400; throw e; } sets.push(`cuatrimestre=$${i++}`); vals.push(c); }
  if (campos.anio !== undefined) { sets.push(`anio=$${i++}`); vals.push(Number(campos.anio)); }
  if (campos.materia_id !== undefined) { sets.push(`materia_id=$${i++}`); vals.push(Number(campos.materia_id)); }
  if (campos.docente_id !== undefined) { sets.push(`docente_id=$${i++}`); vals.push(Number(campos.docente_id)); }
  
  if (sets.length === 0 && campos.bandas === undefined) { const e = new Error('Sin campos a actualizar'); e.status = 400; throw e; }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    let comision = ex[0];
    
    if (sets.length > 0) {
      vals.push(id);
      const { rows } = await client.query(`UPDATE comision SET ${sets.join(',')} WHERE id=$${i} RETURNING id, codigo, cupo, inscriptos, modalidad, turno, cuatrimestre, anio, materia_id, docente_id`, vals);
      comision = rows[0];
    }
    
    if (campos.bandas !== undefined) {
      await client.query('DELETE FROM banda_horaria WHERE comision_id=$1', [id]);
      for (const b of campos.bandas) {
        await client.query(
          `INSERT INTO banda_horaria (dia, hora_inicio, hora_fin, tipo_clase, comision_id)
           VALUES ($1::dia_semana, $2, $3, $4::tipo_clase, $5)`,
          [b.dia, b.hora_inicio, b.hora_fin, b.tipo_clase, id]
        );
      }
    }
    await client.query('COMMIT');
    return comision;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function eliminarComision(id) {
  const { rows: ex } = await db.query('SELECT id FROM comision WHERE id=$1', [id]);
  if (ex.length === 0) { const e = new Error(`Comisión ${id} no encontrada`); e.status = 404; throw e; }
  // Verificar asignaciones
  const { rows: dep } = await db.query('SELECT COUNT(*) AS cnt FROM asignacion WHERE comision_id=$1', [id]);
  if (Number(dep[0].cnt) > 0) {
    const e = new Error(`No se puede eliminar: la comisión tiene ${dep[0].cnt} asignación(es)`);
    e.status = 409; throw e;
  }
  await db.query('DELETE FROM comision WHERE id=$1', [id]);
}

module.exports = {
  listarUnidadesAcademicas,
  listarCarreras, crearCarrera, actualizarCarrera, eliminarCarrera,
  listarMaterias, crearMateria, actualizarMateria, eliminarMateria,
  listarDocentes, crearDocente, actualizarDocente, eliminarDocente,
  listarComisiones, crearComision, actualizarComision, eliminarComision,
};
