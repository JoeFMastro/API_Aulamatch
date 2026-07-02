'use strict';

/**
 * reportes/service.js
 * Consultas transversales de solo lectura para la generación de reportes.
 */

const db = require('../../config/db');

const DIA_NOMBRES_CORTOS = {
  LUNES: 'Lun',
  MARTES: 'Mar',
  MIERCOLES: 'Mié',
  JUEVES: 'Jue',
  VIERNES: 'Vie',
  SABADO: 'Sáb'
};

const DIA_ORDEN = {
  LUNES: 1,
  MARTES: 2,
  MIERCOLES: 3,
  JUEVES: 4,
  VIERNES: 5,
  SABADO: 6
};

const OPERATING_START = '08:00:00';
const OPERATING_END = '22:00:00';

/**
 * Calcula la duración en horas entre dos cadenas de tiempo HH:MM:SS.
 * @param {string} start
 * @param {string} end
 * @returns {number}
 */
function getDurationInHours(start, end) {
  const [sH, sM] = start.split(':').map(Number);
  const [eH, eM] = end.split(':').map(Number);
  return (eH - sH) + (eM - sM) / 60;
}

/**
 * Sweeps a day's timeline (08:00 to 22:00) to find free slots.
 * @param {string} day
 * @param {object[]} occupied  Array de bloques ocupados ordenados por hora_inicio
 * @returns {object[]}
 */
function getFreeSlotsForDay(day, occupied) {
  const free = [];
  let current = OPERATING_START;

  for (const block of occupied) {
    if (block.hora_inicio > current) {
      free.push({
        dia: day,
        hora_inicio: current.slice(0, 5),
        hora_fin: block.hora_inicio.slice(0, 5)
      });
    }
    if (block.hora_fin > current) {
      current = block.hora_fin;
    }
  }

  if (current < OPERATING_END) {
    free.push({
      dia: day,
      hora_inicio: current.slice(0, 5),
      hora_fin: OPERATING_END.slice(0, 5)
    });
  }

  return free;
}

/**
 * Obtiene la lista de asignaciones para el reporte.
 *
 * @param {object} filtros
 * @param {number} filtros.anio
 * @param {number} filtros.cuatrimestre
 * @param {number} [filtros.unidadAcademicaId]
 * @param {string} [filtros.estado]
 * @returns {Promise<object[]>}
 */
async function obtenerAsignaciones({ anio, cuatrimestre, unidadAcademicaId, estado }) {
  const params = [Number(anio), Number(cuatrimestre)];
  const where = ['co.anio = $1', 'co.cuatrimestre = $2'];

  if (unidadAcademicaId != null) {
    params.push(Number(unidadAcademicaId));
    where.push(`m.unidad_academica_id = $${params.length}`);
  }

  if (estado) {
    params.push(estado);
    where.push(`a.estado = $${params.length}::estado_asignacion`);
  }

  const whereClause = where.join(' AND ');

  // BUG FIX #1 y #2:
  // La query original tenía dos LEFT JOIN al mismo nivel (carrera_materia × banda_horaria)
  // que generaban un producto cartesiano: si una comisión tiene 3 carreras y 2 bandas,
  // cada carrera se repetía 2 veces y cada banda 3 veces en el GROUP BY.
  // Adicionalmente, json_agg(DISTINCT jsonb_build_object(...)) no está soportado en
  // PostgreSQL (solo array_agg acepta DISTINCT).
  //
  // Solución: reemplazar ambas relaciones M:N por subconsultas correlacionadas
  // independientes, evitando el JOIN cruzado.
  const { rows } = await db.query(
    `SELECT
       co.codigo                  AS comision_codigo,
       m.nombre                   AS materia_nombre,
       (
         SELECT COALESCE(array_agg(DISTINCT c2.nombre ORDER BY c2.nombre), '{}')
         FROM carrera_materia cm2
         JOIN carrera c2 ON c2.id = cm2.carrera_id
         WHERE cm2.materia_id = m.id
       )                          AS carreras,
       ua.nombre                  AS unidad_academica_nombre,
       d.apellido                 AS docente_apellido,
       d.nombre                   AS docente_nombre,
       co.cupo,
       co.inscriptos,
       au.numero                  AS aula_numero,
       e.nombre                   AS edificio_nombre,
       co.modalidad,
       co.turno,
       a.estado                   AS estado_asignacion,
       a.es_manual,
       a.fecha_asignacion,
       (
         SELECT COALESCE(
           json_agg(
             jsonb_build_object(
               'dia',        bh2.dia,
               'hora_inicio', bh2.hora_inicio,
               'hora_fin',    bh2.hora_fin
             )
             ORDER BY bh2.dia, bh2.hora_inicio
           ),
           '[]'::json
         )
         FROM banda_horaria bh2
         WHERE bh2.comision_id = co.id
       )                          AS bandas
     FROM asignacion a
     JOIN comision co ON co.id = a.comision_id
     JOIN materia m  ON m.id  = co.materia_id
     JOIN unidad_academica ua ON ua.id = m.unidad_academica_id
     JOIN docente d  ON d.id  = co.docente_id
     JOIN aula au    ON au.id = a.aula_id
     JOIN edificio e ON e.id  = au.edificio_id
     WHERE ${whereClause}
     ORDER BY m.nombre ASC, co.codigo ASC`,
    params
  );

  return rows.map(row => {
    const bandas = Array.isArray(row.bandas) ? row.bandas : [];
    // Las bandas ya vienen ordenadas desde la subconsulta SQL (ORDER BY dia, hora_inicio).
    // Re-ordenamos en JS usando DIA_ORDEN para respetar el orden lun→sáb.
    bandas.sort((a, b) => {
      const diaA = DIA_ORDEN[a.dia] ?? 99;
      const diaB = DIA_ORDEN[b.dia] ?? 99;
      if (diaA !== diaB) return diaA - diaB;
      return a.hora_inicio.localeCompare(b.hora_inicio);
    });

    const horario = bandas
      .map(b => `${DIA_NOMBRES_CORTOS[b.dia] || b.dia} ${b.hora_inicio.slice(0, 5)}-${b.hora_fin.slice(0, 5)}`)
      .join(' / ');

    const { bandas: _, ...cleanRow } = row;
    return {
      ...cleanRow,
      horario
    };
  });
}

/**
 * Obtiene el reporte de disponibilidad de aulas agrupado por edificio.
 *
 * Criterio de cálculo de ocupación:
 * Se asume un horario operativo estándar de lunes a sábado de 08:00 a 22:00 (14 horas diarias).
 * Esto da un total de 84 horas (bloques de 1 hora) disponibles por semana por aula.
 * El porcentaje de ocupación se calcula como la suma de las horas de los bloques asignados sobre 84, multiplicado por 100.
 *
 * @param {object} filtros
 * @param {number} filtros.anio
 * @param {number} filtros.cuatrimestre
 * @param {number} [filtros.edificioId]
 * @param {string} [filtros.dia]
 * @returns {Promise<object[]>}
 */
async function obtenerDisponibilidad({ anio, cuatrimestre, edificioId, dia }) {
  // 1. Obtener todas las aulas (con filtro por edificio opcional)
  const queryAulas = `
    SELECT
      au.id AS aula_id,
      au.numero AS aula_numero,
      au.tipo AS aula_tipo,
      au.capacidad AS aula_capacidad,
      au.edificio_id,
      e.nombre AS edificio_nombre
    FROM aula au
    JOIN edificio e ON e.id = au.edificio_id
    WHERE ($1::int IS NULL OR au.edificio_id = $1)
    ORDER BY e.nombre ASC, au.numero ASC
  `;

  const { rows: aulas } = await db.query(queryAulas, [edificioId ? Number(edificioId) : null]);

  // 2. Obtener todas las asignaciones activas del periodo.
  // NOTA: el ENUM estado_asignacion solo contiene PENDIENTE, ASIGNADA y CONFLICTO.
  // No existen los valores CANCELADA ni RECHAZADA, por lo que un NOT IN con esos
  // valores causa un error de tipo en PostgreSQL. Se usa IN explícito con los
  // valores válidos que sí queremos incluir en el reporte de ocupación.
  const queryAsignaciones = `
    SELECT
      a.aula_id,
      bh.dia,
      bh.hora_inicio,
      bh.hora_fin,
      co.codigo AS comision_codigo
    FROM asignacion a
    JOIN comision co ON co.id = a.comision_id
    JOIN banda_horaria bh ON bh.comision_id = co.id
    WHERE co.anio = $1
      AND co.cuatrimestre = $2
      AND a.estado IN ('PENDIENTE', 'ASIGNADA', 'CONFLICTO')
  `;

  const { rows: asignaciones } = await db.query(queryAsignaciones, [Number(anio), Number(cuatrimestre)]);

  // Agrupar asignaciones en memoria por aula_id
  const asignacionesPorAula = {};
  for (const a of asignaciones) {
    if (!asignacionesPorAula[a.aula_id]) {
      asignacionesPorAula[a.aula_id] = [];
    }
    asignacionesPorAula[a.aula_id].push({
      dia: a.dia,
      hora_inicio: a.hora_inicio,
      hora_fin: a.hora_fin,
      comision_codigo: a.comision_codigo
    });
  }

  // Listar los días a procesar para bloques libres
  const diasAProcesar = dia
    ? [dia.toUpperCase()]
    : ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

  // Agrupar por edificio
  const edificioMap = {};

  for (const aula of aulas) {
    const allWeeklyOccupied = asignacionesPorAula[aula.aula_id] || [];

    // Calcular ocupación porcentual semanal (criterio: 84 horas posibles)
    let totalWeeklyHours = 0;
    for (const block of allWeeklyOccupied) {
      totalWeeklyHours += getDurationInHours(block.hora_inicio, block.hora_fin);
    }
    const ocupacion_pct = Math.round((totalWeeklyHours / 84) * 10000) / 100;

    // Bloques ocupados (filtrados por dia si corresponde)
    const bloques_ocupados = allWeeklyOccupied
      .filter(block => !dia || block.dia === dia.toUpperCase())
      .map(block => ({
        dia: block.dia,
        hora_inicio: block.hora_inicio.slice(0, 5),
        hora_fin: block.hora_fin.slice(0, 5),
        comision_codigo: block.comision_codigo
      }))
      .sort((a, b) => {
        if (DIA_ORDEN[a.dia] !== DIA_ORDEN[b.dia]) {
          return DIA_ORDEN[a.dia] - DIA_ORDEN[b.dia];
        }
        return a.hora_inicio.localeCompare(b.hora_inicio);
      });

    // Bloques libres (calculados para cada día a procesar)
    const bloques_libres = [];
    for (const d of diasAProcesar) {
      const occupiedOnDay = allWeeklyOccupied
        .filter(block => block.dia === d)
        .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));

      const freeOnDay = getFreeSlotsForDay(d, occupiedOnDay);
      bloques_libres.push(...freeOnDay);
    }

    // BUG FIX #4: agregar campo bloques_asignados requerido por la especificación.
    // La spec pide explícitamente este campo (conteo de bloques ocupados antes del
    // filtro por dia, es decir, el total semanal).
    const aulaObj = {
      id: aula.aula_id,
      numero: aula.aula_numero,
      tipo: aula.aula_tipo,
      capacidad: aula.aula_capacidad,
      bloques_asignados: allWeeklyOccupied.length,
      ocupacion_pct,
      bloques_ocupados,
      bloques_libres
    };

    // Agrupar bajo su edificio
    if (!edificioMap[aula.edificio_id]) {
      edificioMap[aula.edificio_id] = {
        edificio_id: aula.edificio_id,
        edificio_nombre: aula.edificio_nombre,
        aulas: []
      };
    }
    edificioMap[aula.edificio_id].aulas.push(aulaObj);
  }

  return Object.values(edificioMap);
}

module.exports = {
  obtenerAsignaciones,
  obtenerDisponibilidad
};
