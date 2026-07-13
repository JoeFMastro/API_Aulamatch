'use strict';

// Import diferido para evitar dependencia circular (conflictos → asignaciones → conflictos)
// Se resuelve con require() dentro de la función, no en el top-level.
const getConflictosService = () => require('../conflictos/service');

/**
 * asignaciones/service.js
 *
 * Implementa el motor de asignación automática de AulaMatch y los
 * servicios de asignación manual asistida.
 *
 * ────────────────────────────────────────────────────────────────
 * DECISIÓN DOCUMENTADA — inferirTipoAula(modalidad, tiposClase)
 * ────────────────────────────────────────────────────────────────
 * El pseudocódigo original nombra la función pero no define la regla.
 * La siguiente regla es una propuesta propia, documentada como tal:
 *
 *   1. Modalidad VIRTUAL → tipo_aula = SALA_VIDEOCONFERENCIA
 *      (independientemente del tipo_clase)
 *   2. Modalidad PRESENCIAL | HIBRIDA:
 *      a. Si ALGUNA banda tiene tipo_clase = PRACTICA → LABORATORIO
 *         (las prácticas requieren equipamiento especializado)
 *      b. Si ALGUNA banda tiene tipo_clase = TEORICA y cupo >= UMBRAL_AUDITORIO
 *         → AUDITORIO  (clases magistrales con alta asistencia)
 *         UMBRAL_AUDITORIO = 80 alumnos (configurable vía constante)
 *      c. En cualquier otro caso → AULA
 *
 * Justificación:
 *   - VIRTUAL siempre necesita videoconferencia, sin importar el contenido.
 *   - La práctica define el espacio físico más que la teoría.
 *   - El auditorio solo se reserva para clases masivas (>= 80) porque
 *     ocupar un auditorio para grupos chicos es ineficiente.
 *   - HIBRIDA usa la misma lógica que PRESENCIAL para el espacio físico.
 *
 * ────────────────────────────────────────────────────────────────
 * DECISIÓN DOCUMENTADA — existeSuperposicion (SQL)
 * ────────────────────────────────────────────────────────────────
 * Detecta si un aula ya tiene una asignación activa (estado <> CONFLICTO)
 * en la misma franja horaria que alguna banda de la comisión candidata.
 *
 * Condición de solapamiento horaria entre [A.inicio, A.fin) y [B.inicio, B.fin):
 *   A.inicio < B.fin  AND  A.fin > B.inicio
 * (Intervalos que se tocan en el extremo NO se consideran solapamiento.)
 *
 * La query corrobora además que sea el mismo día de la semana.
 * Se excluyen asignaciones en estado 'CONFLICTO' (ya son problemáticas
 * y no deben bloquear nuevas asignaciones válidas).
 */

const db = require('../../config/db');

// ─────────────────────────────────────────────────────────────────
// CONSTANTES DE CONFIGURACIÓN
// ─────────────────────────────────────────────────────────────────

const UMBRAL_AUDITORIO = 80; // alumnos inscriptos mínimos para requerir AUDITORIO

const ESTADOS_VALIDOS = ['PENDIENTE', 'ASIGNADA', 'CONFLICTO'];

// ─────────────────────────────────────────────────────────────────
// HELPERS INTERNOS
// ─────────────────────────────────────────────────────────────────

/**
 * Infiere el tipo de aula requerido dada la modalidad de la comisión
 * y el conjunto de tipos de clase de sus bandas horarias.
 *
 * @param {'PRESENCIAL'|'VIRTUAL'|'HIBRIDA'} modalidad
 * @param {string[]} tiposClase  Array de valores tipo_clase de las bandas
 * @param {number}   inscriptos  Cantidad de alumnos inscriptos
 * @returns {'AULA'|'LABORATORIO'|'AUDITORIO'|'SALA_VIDEOCONFERENCIA'}
 */
function inferirTipoAula(modalidad, tiposClase, inscriptos) {
  // Regla 1: VIRTUAL siempre → sala de videoconferencia
  if (modalidad === 'VIRTUAL') return 'SALA_VIDEOCONFERENCIA';

  // Reglas para PRESENCIAL e HIBRIDA
  if (tiposClase.includes('PRACTICA')) return 'LABORATORIO';

  if (tiposClase.includes('TEORICA') && Number(inscriptos) >= UMBRAL_AUDITORIO) {
    return 'AUDITORIO';
  }

  return 'AULA';
}

/**
 * Verifica si existe superposición horaria entre un aula y un conjunto
 * de bandas horarias, usando una consulta SQL eficiente.
 *
 * Excluye asignaciones en estado CONFLICTO (no bloquean nuevas asignaciones).
 *
 * @param {number}   aulaId
 * @param {object[]} bandas  Array de { dia, hora_inicio, hora_fin }
 * @returns {Promise<boolean>} true si hay superposición
 */
async function existeSuperposicion(aulaId, bandas) {
  if (!bandas || bandas.length === 0) return false;

  // Construir condiciones OR para cada banda de la comisión candidata
  // Condición de solapamiento: bh_existente.inicio < banda.fin AND bh_existente.fin > banda.inicio
  const condiciones = bandas.map((_, i) => {
    const diaIdx    = i * 3 + 1;
    const inicioIdx = i * 3 + 2;
    const finIdx    = i * 3 + 3;
    return `(bh.dia = $${diaIdx}::dia_semana
             AND bh.hora_inicio < $${finIdx}::time
             AND bh.hora_fin    > $${inicioIdx}::time)`;
  });

  const params = [];
  for (const b of bandas) {
    params.push(b.dia, b.hora_inicio, b.hora_fin);
  }
  params.push(aulaId); // último param para el WHERE de asignacion

  const aulaParam = `$${params.length}`;

  const { rows } = await db.query(
    `SELECT 1
       FROM asignacion a
       JOIN banda_horaria bh ON bh.comision_id = a.comision_id
      WHERE a.aula_id = ${aulaParam}
        AND a.estado  <> 'CONFLICTO'
        AND (${condiciones.join(' OR ')})
      LIMIT 1`,
    params
  );
  return rows.length > 0;
}

/**
 * Obtiene las bandas horarias de una comisión.
 * @param {number} comisionId
 * @returns {Promise<object[]>} Array de { id, dia, hora_inicio, hora_fin, tipo_clase }
 */
async function obtenerBandasDeComision(comisionId) {
  const { rows } = await db.query(
    `SELECT id, dia, hora_inicio, hora_fin, tipo_clase
       FROM banda_horaria
      WHERE comision_id = $1`,
    [comisionId]
  );
  return rows;
}

/**
 * Query de asignación completa (usada en listar y detalle).
 * @param {string} whereClause
 * @param {any[]}  params
 */
async function _queryAsignaciones(whereClause, params) {
  const { rows } = await db.query(
    `SELECT
        a.id,
        a.estado,
        a.fecha_asignacion,
        a.es_manual,
        a.comision_id,
        co.codigo            AS comision_codigo,
        co.cupo,
        co.inscriptos,
        co.modalidad,
        co.turno,
        co.cuatrimestre,
        co.anio,
        a.aula_id,
        au.numero            AS aula_numero,
        au.tipo              AS aula_tipo,
        au.capacidad         AS aula_capacidad,
        e.id                 AS edificio_id,
        e.nombre             AS edificio_nombre,
        m.id                 AS materia_id,
        m.nombre             AS materia_nombre,
        ua.id                AS unidad_academica_id,
        ua.nombre            AS unidad_academica_nombre,
        d.nombre || ' ' || d.apellido AS docente_nombre,
        (
            SELECT json_agg(json_build_object('id', c.id, 'nombre', c.nombre, 'codigo', c.codigo))
            FROM carrera_materia cm
            JOIN carrera c ON c.id = cm.carrera_id
            WHERE cm.materia_id = m.id
        ) AS carrera_nombre
     FROM asignacion a
     JOIN comision          co ON co.id  = a.comision_id
     LEFT JOIN docente      d  ON d.id   = co.docente_id
     JOIN materia           m  ON m.id   = co.materia_id
     JOIN unidad_academica  ua ON ua.id  = m.unidad_academica_id
     JOIN aula              au ON au.id  = a.aula_id
     JOIN edificio          e  ON e.id   = au.edificio_id
    ${whereClause}
    ORDER BY a.fecha_asignacion DESC`,
    params
  );
  return rows;
}

// ─────────────────────────────────────────────────────────────────
// LISTADO DE ASIGNACIONES
// ─────────────────────────────────────────────────────────────────

/**
 * Lista asignaciones con filtros opcionales.
 *
 * Filtros disponibles:
 *   unidadAcademicaId, carreraId, edificioId, turno, modalidad, estado
 *
 * Si el usuario es ADMINISTRATIVO, unidadAcademicaId se fuerza desde el JWT.
 *
 * @param {object} filtros
 * @returns {Promise<object[]>}
 */
async function listarAsignaciones(filtros = {}) {
  const { unidadAcademicaId, carreraId, edificioId, turno, modalidad, estado } = filtros;

  const params = [];
  const where  = [];

  if (unidadAcademicaId) {
    params.push(Number(unidadAcademicaId));
    where.push(`ua.id = $${params.length}`);
  }

  if (carreraId) {
    params.push(Number(carreraId));
    where.push(
      `co.materia_id IN (
         SELECT cm.materia_id FROM carrera_materia cm WHERE cm.carrera_id = $${params.length}
       )`
    );
  }

  if (edificioId) {
    params.push(Number(edificioId));
    where.push(`au.edificio_id = $${params.length}`);
  }

  if (turno) {
    params.push(turno);
    where.push(`co.turno = $${params.length}::turno`);
  }

  if (modalidad) {
    params.push(modalidad);
    where.push(`co.modalidad = $${params.length}::modalidad`);
  }

  if (estado) {
    if (!ESTADOS_VALIDOS.includes(estado)) {
      const err = new Error(`Estado inválido. Valores: ${ESTADOS_VALIDOS.join(', ')}`);
      err.status = 400;
      throw err;
    }
    params.push(estado);
    where.push(`a.estado = $${params.length}::estado_asignacion`);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  return _queryAsignaciones(whereClause, params);
}

// ─────────────────────────────────────────────────────────────────
// AULAS COMPATIBLES (reutilizable por el motor y el endpoint GET)
// ─────────────────────────────────────────────────────────────────

/**
 * Busca aulas compatibles (por capacidad y tipo) que estén disponibles en el horario
 * de la comisión. Se exporta para uso en resolución asistida y motor automático.
 *
 * @param {number} comision_id
 * @returns {Promise<object[]>} Lista de aulas disponibles ordenadas por preferencia/capacidad
 */
async function obtenerAulasCompatibles(comision_id) {
  // 1. Obtener datos de la comisión
  const { rows: comRows } = await db.query(
    `SELECT co.id, co.inscriptos, co.modalidad,
            ua.edificio_preferencia_id
       FROM comision co
       JOIN materia          m  ON m.id  = co.materia_id
       JOIN unidad_academica ua ON ua.id = m.unidad_academica_id
      WHERE co.id = $1`,
    [comision_id]
  );
  if (comRows.length === 0) {
    const err = new Error(`Comisión con id ${comision_id} no encontrada`);
    err.status = 404;
    throw err;
  }
  const com = comRows[0];

  // 2. Obtener bandas horarias de la comisión
  const bandas = await obtenerBandasDeComision(comision_id);
  const tiposClase = [...new Set(bandas.map(b => b.tipo_clase))];

  // 3. Inferir tipo de aula requerido
  const tipoRequerido = inferirTipoAula(com.modalidad, tiposClase, com.inscriptos);

  // 4. Obtener aulas candidatas por tipo y capacidad
  let tiposAceptados;
  if (tipoRequerido === 'AULA') {
    tiposAceptados = ['AULA', 'AUDITORIO']; // un auditorio puede usarse como aula
  } else if (tipoRequerido === 'AUDITORIO') {
    tiposAceptados = ['AUDITORIO'];
  } else {
    // LABORATORIO y SALA_VIDEOCONFERENCIA: coincidencia exacta
    tiposAceptados = [tipoRequerido];
  }

  const tiposParam = tiposAceptados.map((_, i) => `$${i + 2}::tipo_aula`).join(', ');
  const { rows: candidatas } = await db.query(
    `SELECT a.id, a.numero, a.capacidad, a.tipo, a.edificio_id,
            e.nombre AS edificio_nombre,
            CASE WHEN a.edificio_id = $1 THEN 0 ELSE 1 END AS orden_preferencia
       FROM aula a
       JOIN edificio e ON e.id = a.edificio_id
      WHERE a.tipo IN (${tiposParam})
        AND a.capacidad >= $${tiposAceptados.length + 2}
      ORDER BY orden_preferencia ASC, a.capacidad ASC`,
    [
      com.edificio_preferencia_id ?? -1,
      ...tiposAceptados,
      com.inscriptos,
    ]
  );

  // 5. Filtrar por disponibilidad horaria (sin superposición)
  const disponibles = [];
  for (const aula of candidatas) {
    const superposicion = await existeSuperposicion(aula.id, bandas);
    if (!superposicion) {
      disponibles.push(aula);
    }
  }

  return disponibles;
}

// ─────────────────────────────────────────────────────────────────
// MOTOR DE ASIGNACIÓN AUTOMÁTICA
// ─────────────────────────────────────────────────────────────────

/**
 * Ejecuta el motor de asignación automática para un período.
 *
 * Sigue exactamente el flujo del pseudocódigo validado (v2):
 *   1. Obtener comisiones sin asignación activa (ASIGNADA) del período
 *   2. Ordenar por inscriptos descendente (cupo mayor = prioridad mayor)
 *   3. Para cada comisión: buscar aulas candidatas por tipo y capacidad
 *   4. Ordenar candidatas: edificio preferido primero, luego por capacidad
 *      sobrante ascendente (aula.capacidad - comision.inscriptos).
 *      El ORDER BY SQL garantiza que, tras filtrar superposición horaria,
 *      la primera aula disponible sea la de menor desperdicio de capacidad.
 *   5. Elegir la primera candidata sin superposición (= menor capacidad sobrante)
 *   6. Crear registro en asignacion con estado='ASIGNADA', es_manual=false
 *
 * Idempotencia: las comisiones que ya tienen asignación ASIGNADA
 * se EXCLUYEN del proceso, evitando duplicados en ejecuciones repetidas.
 *
 * @param {number} anio
 * @param {number} cuatrimestre
 * @returns {Promise<{asignadas: object[], pendientes: object[], resumen: object}>}
 */
async function ejecutarAsignacionAutomatica(anio, cuatrimestre) {
  // Validaciones del período
  const anioNum = Number(anio);
  const cuatriNum = Number(cuatrimestre);

  if (!anioNum || anioNum < 2000 || anioNum > 2100) {
    const err = new Error('"anio" debe ser un año válido entre 2000 y 2100');
    err.status = 400;
    throw err;
  }
  if (cuatriNum !== 1 && cuatriNum !== 2) {
    const err = new Error('"cuatrimestre" debe ser 1 o 2');
    err.status = 400;
    throw err;
  }

  // ── Paso 1: Obtener comisiones sin asignación ASIGNADA del período ──
  // Una comisión "sin aula" es la que NO tiene ninguna asignación en estado ASIGNADA.
  const { rows: comisiones } = await db.query(
    `SELECT co.id,
            co.codigo,
            co.inscriptos,
            co.cupo,
            co.modalidad,
            co.turno,
            co.cuatrimestre,
            co.anio,
            ua.edificio_preferencia_id
       FROM comision co
       JOIN materia          m  ON m.id  = co.materia_id
       JOIN unidad_academica ua ON ua.id = m.unidad_academica_id
      WHERE co.anio         = $1
        AND co.cuatrimestre = $2
        AND NOT EXISTS (
          SELECT 1 FROM asignacion a
           WHERE a.comision_id = co.id
             AND a.estado = 'ASIGNADA'
        )
      ORDER BY co.inscriptos DESC -- Paso 2: mayor cupo primero`,
    [anioNum, cuatriNum]
  );

  const asignadas  = [];
  const pendientes = [];

  // ── Pasos 3-6: Asignar comisión por comisión ──
  for (const com of comisiones) {
    // Obtener bandas y tipo requerido (reutiliza lógica de aulasCompatibles)
    const bandas = await obtenerBandasDeComision(com.id);
    const tiposClase = [...new Set(bandas.map(b => b.tipo_clase))];
    const tipoRequerido = inferirTipoAula(com.modalidad, tiposClase, com.inscriptos);

    // Tipos aceptados (misma regla que en aulasCompatiblesParaComision)
    let tiposAceptados;
    if (tipoRequerido === 'AULA') {
      tiposAceptados = ['AULA', 'AUDITORIO'];
    } else if (tipoRequerido === 'AUDITORIO') {
      tiposAceptados = ['AUDITORIO'];
    } else {
      tiposAceptados = [tipoRequerido];
    }

    const tiposParam = tiposAceptados.map((_, i) => `$${i + 2}::tipo_aula`).join(', ');

    // ── Buscar candidatas: tipo + capacidad, ordenadas por edificio preferido
    //    y luego por capacidad sobrante ascendente (menor desperdicio primero).
    //    Equivale al paso 4 del pseudocódigo v2:
    //      aulasDisponibles ← ordenarPorCampoAscendente(
    //          aulasDisponibles, clave = aula.capacidad - comision.inscriptos
    //      )
    //    El ORDER BY se aplica ANTES del filtro de superposición, de modo que
    //    la primera candidata que pase el filtro sea automáticamente la óptima.
    const { rows: candidatas } = await db.query(
      `SELECT a.id, a.numero, a.capacidad, a.tipo, a.edificio_id
         FROM aula a
        WHERE a.tipo IN (${tiposParam})
          AND a.capacidad >= $${tiposAceptados.length + 2}
        ORDER BY
          CASE WHEN a.edificio_id = $1 THEN 0 ELSE 1 END ASC,
          (a.capacidad - $${tiposAceptados.length + 2}) ASC`,
      [
        com.edificio_preferencia_id ?? -1,
        ...tiposAceptados,
        com.inscriptos,
      ]
    );

    // ── Filtrar por disponibilidad horaria ──
    // La primera candidata sin superposición es la de menor capacidad sobrante
    // dentro de su grupo de preferencia (edificio preferido > alternativas).
    let aulaElegida = null;
    for (const aula of candidatas) {
      const superposicion = await existeSuperposicion(aula.id, bandas);
      if (!superposicion) {
        aulaElegida = aula;
        break;
      }
    }

    if (aulaElegida) {
      // ── Crear asignación ──
      const { rows: [nuevaAsignacion] } = await db.query(
        `INSERT INTO asignacion (estado, es_manual, comision_id, aula_id, fecha_asignacion)
         VALUES ('ASIGNADA', false, $1, $2, NOW())
         RETURNING id, estado, es_manual, comision_id, aula_id, fecha_asignacion`,
        [com.id, aulaElegida.id]
      );

      // ── Detección de conflictos post-inserción (momento 2: motor automático) ──
      // Se ejecuta sobre la asignación recién creada antes de incluirla en el resultado.
      const conflictosService = getConflictosService();
      await conflictosService.detectarConflictos({
        id:          nuevaAsignacion.id,
        aula_id:     nuevaAsignacion.aula_id,
        comision_id: nuevaAsignacion.comision_id,
      });

      asignadas.push({
        ...nuevaAsignacion,
        comision_codigo: com.codigo,
        aula_numero:     aulaElegida.numero,
        aula_tipo:       aulaElegida.tipo,
      });
    } else {
      // Sin aula disponible — registrar como pendiente
      pendientes.push({
        comision_id:     com.id,
        comision_codigo: com.codigo,
        inscriptos:      com.inscriptos,
        tipo_aula_requerido: tipoRequerido,
        motivo: 'SIN_AULA_DISPONIBLE',
      });
    }
  }

  return {
    asignadas,
    pendientes,
    resumen: {
      total:    comisiones.length,
      asignadas: asignadas.length,
      fallidas:  pendientes.length,
    },
  };
}

// ─────────────────────────────────────────────────────────────────
// ASIGNACIÓN MANUAL
// ─────────────────────────────────────────────────────────────────

/**
 * Crea una asignación manual para una comisión.
 * Valida que no haya superposición antes de insertar.
 *
 * @param {{ comision_id: number, aula_id: number }} datos
 * @returns {Promise<object>}
 */
async function crearAsignacionManual({ comision_id, aula_id }) {
  if (!comision_id || !aula_id) {
    const err = new Error('Los campos "comision_id" y "aula_id" son obligatorios');
    err.status = 400;
    throw err;
  }

  // Verificar que la comisión no tenga ya asignación ASIGNADA
  const { rows: existentes } = await db.query(
    `SELECT id FROM asignacion
      WHERE comision_id = $1 AND estado = 'ASIGNADA'`,
    [Number(comision_id)]
  );
  if (existentes.length > 0) {
    const err = new Error(
      `La comisión ${comision_id} ya tiene una asignación activa (id: ${existentes[0].id}). Use PATCH para reasignar.`
    );
    err.status = 409;
    throw err;
  }

  // Verificar superposición horaria
  const bandas = await obtenerBandasDeComision(Number(comision_id));
  const superposicion = await existeSuperposicion(Number(aula_id), bandas);
  if (superposicion) {
    const err = new Error(
      'Superposición horaria: El aula seleccionada ya tiene una asignación en ese horario. Elija otra aula.'
    );
    err.status = 409;
    throw err;
  }

  // Verificar cupo (capacidad vs inscriptos)
  const { rows: [aula] } = await db.query('SELECT capacidad FROM aula WHERE id=$1', [Number(aula_id)]);
  const { rows: [comision] } = await db.query('SELECT inscriptos FROM comision WHERE id=$1', [Number(comision_id)]);
  if (aula.capacidad < comision.inscriptos) {
    const err = new Error(
      `Conflicto de cupo: El aula tiene capacidad para ${aula.capacidad}, pero la comisión tiene ${comision.inscriptos} inscriptos.`
    );
    err.status = 409;
    throw err;
  }

  const { rows: [asignacion] } = await db.query(
    `INSERT INTO asignacion (estado, es_manual, comision_id, aula_id, fecha_asignacion)
     VALUES ('ASIGNADA', true, $1, $2, NOW())
     RETURNING id, estado, es_manual, comision_id, aula_id, fecha_asignacion`,
    [Number(comision_id), Number(aula_id)]
  );

  // ── Detección de conflictos post-inserción (momento 1: asignación manual) ──
  const conflictosService = getConflictosService();
  await conflictosService.detectarConflictos({
    id:          asignacion.id,
    aula_id:     asignacion.aula_id,
    comision_id: asignacion.comision_id,
  });

  return asignacion;
}

// ─────────────────────────────────────────────────────────────────
// REASIGNACIÓN (PATCH)
// ─────────────────────────────────────────────────────────────────

/**
 * Reasigna o actualiza una asignación existente.
 * Campos actualizables: aula_id, estado.
 * Si se cambia aula_id, verifica superposición.
 *
 * @param {number} id
 * @param {{ aula_id?: number, estado?: string }} campos
 * @returns {Promise<object>}
 */
async function actualizarAsignacion(id, campos) {
  const { rows: actual } = await db.query(
    `SELECT a.*, co.id AS comision_id_co
       FROM asignacion a
       JOIN comision co ON co.id = a.comision_id
      WHERE a.id = $1`,
    [id]
  );
  if (actual.length === 0) {
    const err = new Error(`Asignación con id ${id} no encontrada`);
    err.status = 404;
    throw err;
  }

  const asig = actual[0];
  const sets   = [];
  const params = [];
  let   idx    = 1;

  if (campos.aula_id !== undefined) {
    const nuevoAulaId = Number(campos.aula_id);
    // Verificar superposición con el nuevo aula
    const bandas = await obtenerBandasDeComision(asig.comision_id);
    const superposicion = await existeSuperposicion(nuevoAulaId, bandas);
    if (superposicion) {
      const err = new Error('El aula seleccionada ya tiene un conflicto de horario.');
      err.status = 409;
      throw err;
    }
    params.push(nuevoAulaId);
    sets.push(`aula_id = $${idx++}`);
    // Marcar como manual si se cambia el aula manualmente
    params.push(true);
    sets.push(`es_manual = $${idx++}`);
  }

  if (campos.estado !== undefined) {
    if (!ESTADOS_VALIDOS.includes(campos.estado)) {
      const err = new Error(`Estado inválido. Valores: ${ESTADOS_VALIDOS.join(', ')}`);
      err.status = 400;
      throw err;
    }
    params.push(campos.estado);
    sets.push(`estado = $${idx++}::estado_asignacion`);
  }

  if (sets.length === 0) {
    const err = new Error('No se enviaron campos actualizables (aula_id, estado)');
    err.status = 400;
    throw err;
  }

  params.push(id);
  const { rows: [updated] } = await db.query(
    `UPDATE asignacion SET ${sets.join(', ')}
      WHERE id = $${idx}
      RETURNING id, estado, es_manual, comision_id, aula_id, fecha_asignacion`,
    params
  );

  // ── Detección de conflictos post-actualización (momento 1: reasignación PATCH) ──
  // Solo se ejecuta si se cambió el aula (nueva asignación de espacio físico).
  // Si solo cambió el estado (ej: resolución manual), no re-detectamos.
  if (campos.aula_id !== undefined) {
    const conflictosService = getConflictosService();
    // Si la reasignación resuelve un conflicto anterior, marcar notificaciones como atendidas
    if (asig.estado === 'CONFLICTO') {
      await conflictosService.marcarNotificacionesAtendidas(id);
    }
    // Verificar conflictos sobre la nueva asignación
    await conflictosService.detectarConflictos({
      id:          updated.id,
      aula_id:     updated.aula_id,
      comision_id: updated.comision_id,
    });
  }

  return updated;
}

// ─────────────────────────────────────────────────────────────────
// ELIMINACIÓN
// ─────────────────────────────────────────────────────────────────

/**
 * Elimina una asignación, liberando el aula para futuras asignaciones.
 * Solo COORDINADOR puede ejecutar este servicio (controlado en routes).
 *
 * @param {number} id
 * @returns {Promise<object>} La asignación eliminada
 */
async function eliminarAsignacion(id) {
  const { rows } = await db.query(
    `DELETE FROM asignacion
      WHERE id = $1
      RETURNING id, comision_id, aula_id, estado`,
    [id]
  );
  if (rows.length === 0) {
    const err = new Error(`Asignación con id ${id} no encontrada`);
    err.status = 404;
    throw err;
  }
  return rows[0];
}

// ─────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────

module.exports = {
  listarAsignaciones,
  obtenerAulasCompatibles,
  ejecutarAsignacionAutomatica,
  crearAsignacionManual,
  actualizarAsignacion,
  eliminarAsignacion,
  // Exponer para tests unitarios
  inferirTipoAula,
  existeSuperposicion,
};
