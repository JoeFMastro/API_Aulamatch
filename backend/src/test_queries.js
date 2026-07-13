'use strict';
require('dotenv').config({ path: '.env.test' });
const { pool } = require('./config/db');

async function run() {
  const client = await pool.connect();
  try {
    console.log("=== Testing listarConflictos query ===");
    const r1 = await client.query(`
      SELECT
        a.id AS id,
        a.estado,
        co.id AS comision_id,
        co.codigo AS comision_codigo,
        (
          SELECT string_agg(LEFT(bh.dia::text, 2) || ' ' || LEFT(bh.hora_inicio::text, 5) || '\u2013' || LEFT(bh.hora_fin::text, 5), ', ')
          FROM banda_horaria bh
          WHERE bh.comision_id = co.id
        ) AS horario,
        COALESCE(
          json_agg(
            json_build_object('id', n.id, 'tipo_conflicto', n.tipo_conflicto)
            ORDER BY n.created_at DESC
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
      LIMIT 5
    `);
    console.log("listarConflictos OK:", r1.rows.length, "rows");
    if (r1.rows.length > 0) console.log("Sample:", JSON.stringify(r1.rows[0], null, 2));

    console.log("\n=== Testing metricas query ===");
    const r2 = await client.query(`
      SELECT
        COUNT(DISTINCT a.id) FILTER (WHERE a.estado = 'CONFLICTO') AS conflictos_activos,
        COUNT(DISTINCT a.id) FILTER (WHERE a.estado = 'ASIGNADA') AS asignaciones_activas
      FROM asignacion a
      JOIN comision co ON co.id = a.comision_id
      JOIN materia m ON m.id = co.materia_id
      JOIN unidad_academica ua ON ua.id = m.unidad_academica_id
      LEFT JOIN notificacion n ON n.asignacion_id = a.id
      WHERE 1=1
    `);
    console.log("metricas OK:", r2.rows[0]);

  } catch (err) {
    console.error("ERROR:", err.message);
    console.error("Code:", err.code);
    console.error("Position:", err.position);
    console.error("Hint:", err.hint);
  } finally {
    client.release();
    await pool.end();
  }
}
run();
