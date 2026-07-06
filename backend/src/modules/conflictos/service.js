'use strict';

/**
 * conflictos/service.js
 *
 * Implementa las dos verificaciones de conflicto validadas en el diseño:
 *
 *   Verificación 1 — Superposición horaria
 *   Verificación 2 — Cupo excedido
 *
 * Y los tres servicios públicos del módulo:
 *   - detectarConflictos(asignacion)  → ejecuta ambas verificaciones
 *   - listarConflictos(filtros)       → GET /api/conflictos
 *   - obtenerMetricas()               → GET /api/conflictos/metricas
 *   - detectarPorPeriodo(anio, cuatrimestre) → POST /api/conflictos/detectar
 *
 * ────────────────────────────────────────────────────────────────
 * DECISIÓN — Almacenamiento de notificaciones: tabla `notificacion`
 * ────────────────────────────────────────────────────────────────
 * Se persiste en DB (no en logs) para:
 *   - Trazabilidad auditada entre reinicios del contenedor
 *   - Consulta SQL directa en /metricas (sin parsear archivos)
 *   - Marcado de "atendida" cuando el coordinador resuelve el conflicto
 * Ver justificación completa en deploy/init-db/03_notificaciones.sql
 */

const db = require('../../config/db');

// ─────────────────────────────────────────────────────────────────
// TIPOS DE CONFLICTO (constantes, no ENUM en DB para extensibilidad)
// ─────────────────────────────────────────────────────────────────

const TIPOS_CONFLICTO = {
  SUPERPOSICION_HORARIA: 'SUPERPOSICION_HORARIA',
  CUPO_EXCEDIDO:         'CUPO_EXCEDIDO',
};

// ─────────────────────────────────────────────────────────────────
// NOTIFICACIÓN (inmediata y obligatoria por cada conflicto)
// ─────────────────────────────────────────────────────────────────

/**
 * Registra una notificación de conflicto en la tabla `notificacion`.
 * Se invoca de forma síncrona (await) para garantizar inmediatez.
 *
 * @param {number} asignacionId
 * @param {string} tipoConflicto  'SUPERPOSICION_HORARIA' | 'CUPO_EXCEDIDO'
 * @param {string} detalle        Descripción legible del problema
 */
async function notificar(asignacionId, tipoConflicto, detalle) {
  await db.query(
    `INSERT INTO notificacion (asignacion_id, tipo_conflicto, detalle, atendida, created_at)
     VALUES ($1, $2, $3, false, NOW())`,
    [asignacionId, tipoConflicto, detalle]
  );
  // Log estructurado adicional (útil en desarrollo)
  console.log(`[conflicto] asignacion=${asignacionId} tipo=${tipoConflicto} | ${detalle}`);
}

// ─────────────────────────────────────────────────────────────────
// VERIFICACIÓN 1 — Superposición horaria
// ─────────────────────────────────────────────────────────────────

/**
 * Detecta si una asignación tiene superposición horaria con otra
 * asignación activa en el mismo aula.
 *
 * Regla exacta (pseudocódigo fuente):
 *   PARA CADA banda EN comision.bandasHorarias:
 *     SI EXISTE otra asignacion WHERE
 *       aula_id = asignacion.aula_id
 *       AND estado != 'CONFLICTO'
 *       AND banda_horaria.dia = banda.dia
 *       AND NOT (hora_fin <= banda.hora_inicio OR hora_inicio >= banda.hora_fin)
 *     → marcarConflicto + notificar
 *
 * Devuelve los detalles de la superposición encontrada (qué banda, con
 * qué comisión) para incluir en la notificación.
 *
 * @param {object} asignacion  { id, aula_id, comision_id }
 * @returns {Promise<{conflicto: boolean, detalles: object[]}>}
 */
async function verificarSuperposicionHoraria(asignacion) {
  const { rows } = await db.query(
    `SELECT
        bh_nueva.id        AS banda_nueva_id,
        bh_nueva.dia       AS dia,
        bh_nueva.hora_inicio AS hora_inicio_nueva,
        bh_nueva.hora_fin    AS hora_fin_nueva,
        bh_existente.hora_inicio AS hora_inicio_existente,
        bh_existente.hora_fin    AS hora_fin_existente,
        a_existente.id     AS asignacion_conflicto_id,
        a_existente.comision_id AS comision_conflicto_id,
        co_existente.codigo AS comision_conflicto_codigo
       FROM banda_horaria bh_nueva
       JOIN asignacion a_existente
         ON a_existente.aula_id = $1           -- mismo aula
        AND a_existente.id     <> $2           -- diferente asignacion
        AND a_existente.estado <> 'CONFLICTO'  -- ignorar asignaciones ya conflictivas
       JOIN banda_horaria bh_existente
         ON bh_existente.comision_id = a_existente.comision_id
        AND bh_existente.dia = bh_nueva.dia    -- mismo día
        AND NOT (
              bh_existente.hora_fin   <= bh_nueva.hora_inicio
              OR bh_existente.hora_inicio >= bh_nueva.hora_fin
            )                                  -- solapamiento de intervalos
       JOIN comision co_existente
         ON co_existente.id = a_existente.comision_id
      WHERE bh_nueva.comision_id = $3          -- bandas de nuestra comisión`,
    [asignacion.aula_id, asignacion.id, asignacion.comision_id]
  );

  return {
    conflicto: rows.length > 0,
    detalles:  rows,
  };
}

// ─────────────────────────────────────────────────────────────────
// VERIFICACIÓN 2 — Cupo excedido
// ─────────────────────────────────────────────────────────────────

/**
 * Detecta si la comisión tiene más inscriptos que la capacidad del aula.
 *
 * Regla exacta (pseudocódigo fuente):
 *   SI comision.inscriptos > aula.capacidad → marcarConflicto + notificar
 *
 * @param {object} asignacion  { id, aula_id, comision_id }
 * @returns {Promise<{conflicto: boolean, inscriptos: number, capacidad: number}>}
 */
async function verificarCupoExcedido(asignacion) {
  const { rows } = await db.query(
    `SELECT co.inscriptos, au.capacidad
       FROM asignacion a
       JOIN comision co ON co.id = a.comision_id
       JOIN aula     au ON au.id = a.aula_id
      WHERE a.id = $1`,
    [asignacion.id]
  );

  if (rows.length === 0) return { conflicto: false };

  const { inscriptos, capacidad } = rows[0];
  return {
    conflicto:   Number(inscriptos) > Number(capacidad),
    inscriptos:  Number(inscriptos),
    capacidad:   Number(capacidad),
  };
}

// ─────────────────────────────────────────────────────────────────
// FUNCIÓN PRINCIPAL — detectarConflictos(asignacion)
// ─────────────────────────────────────────────────────────────────

/**
 * Ejecuta las dos verificaciones de conflicto sobre una asignación.
 * Sigue el orden exacto del pseudocódigo:
 *   1. Verificación de superposición horaria
 *   2. Verificación de cupo excedido
 *
 * Ambas son independientes y secuenciales; cada una puede disparar
 * su propia notificación. Una asignación puede tener AMBOS tipos
 * de conflicto simultáneamente.
 *
 * Si se detecta algún conflicto:
 *   - UPDATE asignacion SET estado = 'CONFLICTO'
 *   - INSERT en notificacion (inmediato y obligatorio)
 *
 * Si no hay conflicto:
 *   - No modifica el estado (permanece ASIGNADA)
 *
 * @param {{ id: number, aula_id: number, comision_id: number }} asignacion
 * @returns {Promise<{ id: number, tiposConflicto: string[], sinConflicto: boolean }>}
 */
async function detectarConflictos(asignacion) {
  const tiposDetectados = [];

  // ── Verificación 1: Superposición horaria ──────────────────────
  const v1 = await verificarSuperposicionHoraria(asignacion);
  if (v1.conflicto) {
    tiposDetectados.push(TIPOS_CONFLICTO.SUPERPOSICION_HORARIA);

    // Construir detalle legible identificando qué banda solapó con quién
    const bandaIds = [...new Set(v1.detalles.map(d => d.banda_nueva_id))];
    const comisionesConflicto = [...new Set(v1.detalles.map(d => d.comision_conflicto_codigo))];
    const detalle = [
      `Superposición horaria detectada en aula_id=${asignacion.aula_id}.`,
      `Banda(s) afectada(s): [${bandaIds.join(', ')}].`,
      `Conflicto con comisión(es): [${comisionesConflicto.join(', ')}].`,
    ].join(' ');

    await notificar(asignacion.id, TIPOS_CONFLICTO.SUPERPOSICION_HORARIA, detalle);
  }

  // ── Verificación 2: Cupo excedido ─────────────────────────────
  const v2 = await verificarCupoExcedido(asignacion);
  if (v2.conflicto) {
    tiposDetectados.push(TIPOS_CONFLICTO.CUPO_EXCEDIDO);

    const detalle = [
      `Cupo excedido: comisión tiene ${v2.inscriptos} inscriptos`,
      `pero el aula (id=${asignacion.aula_id}) tiene capacidad ${v2.capacidad}.`,
      `Exceso: ${v2.inscriptos - v2.capacidad} alumnos.`,
    ].join(' ');

    await notificar(asignacion.id, TIPOS_CONFLICTO.CUPO_EXCEDIDO, detalle);
  }

  // ── Marcar estado en DB si hay al menos un conflicto ──────────
  if (tiposDetectados.length > 0) {
    await db.query(
      `UPDATE asignacion SET estado = 'CONFLICTO' WHERE id = $1`,
      [asignacion.id]
    );
  }

  return {
    id:             asignacion.id,
    tiposConflicto: tiposDetectados,
    sinConflicto:   tiposDetectados.length === 0,
  };
}

// ─────────────────────────────────────────────────────────────────
// DETECCIÓN POR PERÍODO (POST /api/conflictos/detectar)
// ─────────────────────────────────────────────────────────────────

/**
 * Ejecuta detectarConflictos sobre todas las asignaciones activas
 * (estado ASIGNADA) del período indicado.
 *
 * También puede invocarse sin parámetros para escanear TODAS las
 * asignaciones en estado ASIGNADA independientemente del período.
 *
 * @param {{ anio?: number, cuatrimestre?: number }} opciones
 * @returns {Promise<{ procesadas: number, conflictosNuevos: object[], resumen: object }>}
 */
async function detectarPorPeriodo({ anio, cuatrimestre } = {}) {
  const params = [];
  const where  = [`a.estado = 'ASIGNADA'`];

  if (anio) {
    params.push(Number(anio));
    where.push(`co.anio = $${params.length}`);
  }
  if (cuatrimestre) {
    const c = Number(cuatrimestre);
    if (c !== 1 && c !== 2) {
      const err = new Error('"cuatrimestre" debe ser 1 o 2');
      err.status = 400;
      throw err;
    }
    params.push(c);
    where.push(`co.cuatrimestre = $${params.length}`);
  }

  const whereClause = `WHERE ${where.join(' AND ')}`;

  const { rows: asignaciones } = await db.query(
    `SELECT a.id, a.aula_id, a.comision_id
       FROM asignacion a
       JOIN comision co ON co.id = a.comision_id
      ${whereClause}`,
    params
  );

  const conflictosNuevos = [];
  let sinConflicto = 0;

  for (const asig of asignaciones) {
    const resultado = await detectarConflictos(asig);
    if (!resultado.sinConflicto) {
      conflictosNuevos.push(resultado);
    } else {
      sinConflicto++;
    }
  }

  return {
    procesadas:      asignaciones.length,
    conflictosNuevos,
    resumen: {
      total:           asignaciones.length,
      conConflicto:    conflictosNuevos.length,
      sinConflicto,
    },
  };
}

// ─────────────────────────────────────────────────────────────────
// LISTADO DE CONFLICTOS (GET /api/conflictos)
// ─────────────────────────────────────────────────────────────────

/**
 * Lista las asignaciones en estado CONFLICTO, incluyendo las notificaciones
 * asociadas agrupadas por asignación.
 *
 * Filtros opcionales: unidadAcademicaId (forzado para ADMINISTRATIVO)
 *
 * @param {{ unidadAcademicaId?: number }} filtros
 * @returns {Promise<object[]>}
 */
async function listarConflictos({ unidadAcademicaId } = {}) {
  const params = [];
  const where  = [`a.estado = 'CONFLICTO'`];

  if (unidadAcademicaId) {
    params.push(Number(unidadAcademicaId));
    where.push(`ua.id = $${params.length}`);
  }

  const whereClause = `WHERE ${where.join(' AND ')}`;

  const { rows } = await db.query(
    `SELECT
        a.id                  AS id,
        a.id                  AS asignacion_id,
        a.estado,
        a.es_manual,
        a.fecha_asignacion,
        a.comision_id,
        co.codigo             AS comision_codigo,
        co.inscriptos,
        co.cupo,
        co.modalidad,
        co.turno,
        co.anio,
        co.cuatrimestre,
        a.aula_id,
        au.numero             AS aula_numero,
        au.tipo               AS aula_tipo,
        au.capacidad          AS aula_capacidad,
        e.id                  AS edificio_id,
        e.nombre              AS edificio_nombre,
        m.nombre              AS materia_nombre,
        ua.id                 AS unidad_academica_id,
        ua.nombre             AS unidad_academica_nombre,
        (
          SELECT string_agg(LEFT(bh.dia::text, 2) || ' ' || LEFT(bh.hora_inicio::text, 5) || '–' || LEFT(bh.hora_fin::text, 5), ', ')
          FROM banda_horaria bh
          WHERE bh.comision_id = co.id
        ) AS horario,
        COALESCE(
          json_agg(
            json_build_object(
              'id',             n.id,
              'tipo_conflicto', n.tipo_conflicto,
              'detalle',        n.detalle,
              'atendida',       n.atendida,
              'created_at',     n.created_at
            ) ORDER BY n.created_at DESC
          ) FILTER (WHERE n.id IS NOT NULL),
          '[]'
        ) AS notificaciones
       FROM asignacion a
       JOIN comision         co ON co.id  = a.comision_id
       JOIN materia          m  ON m.id   = co.materia_id
       JOIN unidad_academica ua ON ua.id  = m.unidad_academica_id
       JOIN aula             au ON au.id  = a.aula_id
       JOIN edificio         e  ON e.id   = au.edificio_id
       LEFT JOIN notificacion n ON n.asignacion_id = a.id
      ${whereClause}
      GROUP BY a.id, co.id, m.id, ua.id, au.id, e.id
      ORDER BY a.fecha_asignacion DESC`,
    params
  );

  return rows;
}

// ─────────────────────────────────────────────────────────────────
// MÉTRICAS (GET /api/conflictos/metricas)
// ─────────────────────────────────────────────────────────────────

/**
 * Calcula los contadores para las cards del panel de conflictos.
 *
 * Métricas incluidas (mínimo viable documentado):
 *   - conflictos_activos     : asignaciones en estado CONFLICTO ahora
 *   - asignaciones_pendientes: comisiones sin asignación activa (ningún estado)
 *   - asignadas_hoy          : asignaciones creadas en las últimas 24h con estado ASIGNADA
 *   - notificaciones_no_atendidas: notificaciones con atendida=FALSE
 *   - superposiciones         : conflictos de tipo SUPERPOSICION_HORARIA activos
 *   - cupos_excedidos         : conflictos de tipo CUPO_EXCEDIDO activos
 *
 * Criterio de "mínimo viable": se incluyen todos los contadores que
 * aparecen en el diagrama del panel de conflictos del documento fuente
 * (sección UI/UX), más notificaciones_no_atendidas para gestión interna.
 *
 * @param {{ unidadAcademicaId?: number }} filtros
 * @returns {Promise<object>}
 */
async function obtenerMetricas({ unidadAcademicaId } = {}) {
  const uaFilter = unidadAcademicaId
    ? `AND ua.id = ${Number(unidadAcademicaId)}`
    : '';

  const { rows: [metricas] } = await db.query(
    `SELECT
        -- Conflictos activos
        COUNT(DISTINCT a.id) FILTER (
          WHERE a.estado = 'CONFLICTO'
        ) AS conflictos_activos,

        -- Asignaciones en estado ASIGNADA
        COUNT(DISTINCT a.id) FILTER (
          WHERE a.estado = 'ASIGNADA'
        ) AS asignaciones_activas,

        -- Asignadas en las últimas 24 horas
        COUNT(DISTINCT a.id) FILTER (
          WHERE a.estado = 'ASIGNADA'
            AND a.fecha_asignacion >= NOW() - INTERVAL '24 hours'
        ) AS asignadas_ultimas_24h,

        -- Conflictos por tipo (de los activos en estado CONFLICTO)
        COUNT(DISTINCT n.id) FILTER (
          WHERE n.tipo_conflicto = 'SUPERPOSICION_HORARIA'
            AND a.estado = 'CONFLICTO'
        ) AS notif_superposicion,

        COUNT(DISTINCT n.id) FILTER (
          WHERE n.tipo_conflicto = 'CUPO_EXCEDIDO'
            AND a.estado = 'CONFLICTO'
        ) AS notif_cupo_excedido,

        -- Notificaciones no atendidas (incluye resueltas aún no marcadas)
        COUNT(DISTINCT n.id) FILTER (
          WHERE n.atendida = FALSE
        ) AS notificaciones_no_atendidas

       FROM asignacion a
       JOIN comision         co ON co.id  = a.comision_id
       JOIN materia          m  ON m.id   = co.materia_id
       JOIN unidad_academica ua ON ua.id  = m.unidad_academica_id
       LEFT JOIN notificacion n  ON n.asignacion_id = a.id
      WHERE 1=1 ${uaFilter}`
  );

  // Comisiones sin ninguna asignación activa (ASIGNADA o CONFLICTO)
  const { rows: [{ sin_asignacion }] } = await db.query(
    `SELECT COUNT(*) AS sin_asignacion
       FROM comision co
       JOIN materia          m  ON m.id  = co.materia_id
       JOIN unidad_academica ua ON ua.id = m.unidad_academica_id
      WHERE NOT EXISTS (
        SELECT 1 FROM asignacion a
         WHERE a.comision_id = co.id
           AND a.estado IN ('ASIGNADA', 'CONFLICTO')
      ) ${unidadAcademicaId ? `AND ua.id = ${Number(unidadAcademicaId)}` : ''}`
  );

  return {
    conflictos_activos:           Number(metricas.conflictos_activos),
    asignaciones_activas:         Number(metricas.asignaciones_activas),
    asignadas_ultimas_24h:        Number(metricas.asignadas_ultimas_24h),
    comisiones_sin_asignacion:    Number(sin_asignacion),
    notificaciones_no_atendidas:  Number(metricas.notificaciones_no_atendidas),
    por_tipo: {
      superposicion_horaria: Number(metricas.notif_superposicion),
      cupo_excedido:         Number(metricas.notif_cupo_excedido),
    },
  };
}

// ─────────────────────────────────────────────────────────────────
// MARCAR NOTIFICACIONES COMO ATENDIDAS (uso interno del service)
// ─────────────────────────────────────────────────────────────────

/**
 * Marca todas las notificaciones de una asignación como atendidas.
 * Se invoca desde el módulo asignaciones cuando un coordinador
 * reasigna (PATCH) y el nuevo estado vuelve a ASIGNADA.
 *
 * @param {number} asignacionId
 */
async function marcarNotificacionesAtendidas(asignacionId) {
  await db.query(
    `UPDATE notificacion SET atendida = TRUE
      WHERE asignacion_id = $1 AND atendida = FALSE`,
    [asignacionId]
  );
}

// ─────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────

module.exports = {
  detectarConflictos,
  detectarPorPeriodo,
  listarConflictos,
  obtenerMetricas,
  marcarNotificacionesAtendidas,
  TIPOS_CONFLICTO,
};
