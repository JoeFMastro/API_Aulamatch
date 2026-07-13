'use strict';
require('./config/env');
const { pool } = require('./config/db');

async function run() {
  const client = await pool.connect();
  try {
    // Check what data exists
    const counts = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM asignacion WHERE estado = 'CONFLICTO') AS conflictos,
        (SELECT COUNT(*) FROM asignacion WHERE estado = 'ASIGNADA') AS asignadas,
        (SELECT COUNT(*) FROM banda_horaria) AS bandas,
        (SELECT COUNT(*) FROM notificacion) AS notifs
    `);
    console.log('Data counts:', counts.rows[0]);

    // Test the actual listarConflictos query
    console.log('\n=== Testing listarConflictos query ===');
    const r = await client.query(`
      SELECT
        a.id AS id,
        a.id AS asignacion_id,
        a.estado,
        a.es_manual,
        a.fecha_asignacion,
        a.comision_id,
        co.codigo AS comision_codigo,
        co.inscriptos,
        co.cupo,
        co.modalidad,
        co.turno,
        co.anio,
        co.cuatrimestre,
        a.aula_id,
        au.numero AS aula_numero,
        au.tipo AS aula_tipo,
        au.capacidad AS aula_capacidad,
        e.id AS edificio_id,
        e.nombre AS edificio_nombre,
        m.nombre AS materia_nombre,
        ua.id AS unidad_academica_id,
        ua.nombre AS unidad_academica_nombre,
        (
          SELECT string_agg(LEFT(bh.dia::text, 2) || ' ' || LEFT(bh.hora_inicio::text, 5) || '–' || LEFT(bh.hora_fin::text, 5), ', ')
          FROM banda_horaria bh
          WHERE bh.comision_id = co.id
        ) AS horario,
        COALESCE(
          json_agg(
            json_build_object(
              'id', n.id,
              'tipo_conflicto', n.tipo_conflicto,
              'detalle', n.detalle,
              'atendida', n.atendida,
              'created_at', n.created_at
            ) ORDER BY n.created_at DESC
          ) FILTER (WHERE n.id IS NOT NULL),
          '[]'
        ) AS notificaciones
      FROM asignacion a
      JOIN comision co ON co.id = a.comision_id
      JOIN materia m ON m.id = co.materia_id
      JOIN unidad_academica ua ON ua.id = m.unidad_academica_id
      JOIN aula au ON au.id = a.aula_id
      JOIN edificio e ON e.id = au.edificio_id
      LEFT JOIN notificacion n ON n.asignacion_id = a.id
      WHERE a.estado = 'CONFLICTO'
      GROUP BY a.id, co.id, m.id, ua.id, au.id, e.id
      ORDER BY a.fecha_asignacion DESC
    `);
    console.log('Query OK, rows:', r.rows.length);
    if (r.rows.length > 0) {
      console.log('Sample horario:', r.rows[0].horario);
    }

    // Test metricas query too
    console.log('\n=== Testing metricas query ===');
    const m = await client.query(`
      SELECT
        COUNT(DISTINCT a.id) FILTER (WHERE a.estado = 'CONFLICTO') AS conflictos_activos,
        COUNT(DISTINCT a.id) FILTER (WHERE a.estado = 'ASIGNADA') AS asignaciones_activas,
        COUNT(DISTINCT a.id) FILTER (WHERE a.estado = 'ASIGNADA' AND a.fecha_asignacion >= NOW() - INTERVAL '24 hours') AS asignadas_ultimas_24h,
        COUNT(DISTINCT n.id) FILTER (WHERE n.tipo_conflicto = 'SUPERPOSICION_HORARIA' AND a.estado = 'CONFLICTO') AS notif_superposicion,
        COUNT(DISTINCT n.id) FILTER (WHERE n.tipo_conflicto = 'CUPO_EXCEDIDO' AND a.estado = 'CONFLICTO') AS notif_cupo_excedido,
        COUNT(DISTINCT n.id) FILTER (WHERE n.atendida = FALSE) AS notificaciones_no_atendidas
      FROM asignacion a
      JOIN comision co ON co.id = a.comision_id
      JOIN materia m ON m.id = co.materia_id
      JOIN unidad_academica ua ON ua.id = m.unidad_academica_id
      LEFT JOIN notificacion n ON n.asignacion_id = a.id
      WHERE 1=1
    `);
    console.log('Metricas OK:', m.rows[0]);
    
  } catch(err) {
    console.error('ERROR:', err.message);
    console.error('Code:', err.code);
    console.error('Detail:', err.detail);
    console.error('Hint:', err.hint);
    console.error('Position:', err.position);
  } finally {
    client.release();
    await pool.end();
  }
}
run();
