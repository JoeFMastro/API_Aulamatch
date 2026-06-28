'use strict';

/**
 * AulaMatch — Script de migración para producción (Render)
 *
 * Aplica en orden los archivos SQL de deploy/init-db/ contra la base
 * de datos apuntada por DATABASE_URL.
 *
 * Uso:
 *   DATABASE_URL=postgresql://... npm run migrate
 *
 * Requisitos:
 *   - DATABASE_URL definida en el entorno (Render la provee automáticamente
 *     cuando se vincula una Render Postgres database al Web Service).
 *   - La base de datos debe estar vacía (primera vez) o se debe pasar
 *     --force para re-ejecutar sobre una base existente (DESTRUCTIVO).
 *
 * Comportamiento ante base ya migrada:
 *   Si las tablas principales ya existen, el script aborta con un mensaje
 *   claro en vez de pisar datos silenciosamente (01_schema.sql empieza
 *   con DROP TABLE ... CASCADE, lo que destruiría datos en producción).
 *
 * Para re-ejecutar (base de datos de desarrollo o emergencia):
 *   MIGRATE_FORCE=true DATABASE_URL=... npm run migrate
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Tablas principales que se crean en 01_schema.sql — usadas para
// detectar si la base ya fue migrada.
const SENTINEL_TABLES = ['aula', 'comision', 'asignacion', 'usuario'];

// Archivos SQL a ejecutar, en orden estricto.
const SQL_FILES = [
  '01_schema.sql',
  '02_usuarios.sql',
  '03_notificaciones.sql',
];

async function migrate() {
  // ── 1. Validar DATABASE_URL ──────────────────────────────────────────────
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error(
      '[migrate] ERROR: DATABASE_URL no está definida en el entorno.\n' +
      '[migrate] Definila antes de correr el script:\n' +
      '[migrate]   DATABASE_URL=postgresql://user:pass@host:5432/db npm run migrate'
    );
    process.exit(1);
  }

  const forceMode = process.env.MIGRATE_FORCE === 'true';

  const client = new Client({ 
    connectionString: databaseUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    console.log('[migrate] Conectado a la base de datos.');

    // ── 2. Detectar si la base ya fue migrada ──────────────────────────────
    if (!forceMode) {
      const existingTables = [];
      for (const table of SENTINEL_TABLES) {
        const res = await client.query(
          `SELECT 1 FROM information_schema.tables
           WHERE table_schema = 'public' AND table_name = $1`,
          [table]
        );
        if (res.rows.length > 0) {
          existingTables.push(table);
        }
      }

      if (existingTables.length > 0) {
        console.error(
          `[migrate] ERROR: La base de datos ya contiene las siguientes tablas:\n` +
          `[migrate]   ${existingTables.join(', ')}\n` +
          `[migrate]\n` +
          `[migrate] Las migraciones NO se aplicaron para evitar pérdida de datos.\n` +
          `[migrate] Si esto es intencional (entorno de desarrollo, reset completo),\n` +
          `[migrate] corré el script con la variable MIGRATE_FORCE=true:\n` +
          `[migrate]   MIGRATE_FORCE=true DATABASE_URL=... npm run migrate\n` +
          `[migrate]\n` +
          `[migrate] ⚠️  ATENCIÓN: MIGRATE_FORCE=true ejecutará DROP TABLE CASCADE\n` +
          `[migrate]    sobre todas las tablas. NUNCA usar en producción con datos reales.`
        );
        process.exit(1);
      }
    } else {
      console.warn(
        '[migrate] ⚠️  MIGRATE_FORCE=true detectado. Se ejecutarán los scripts\n' +
        '[migrate]    incluyendo DROP TABLE CASCADE. Esto destruirá datos existentes.'
      );
    }

    // ── 3. Ejecutar archivos SQL en orden ──────────────────────────────────
    const sqlDir = path.resolve(__dirname, '../sql');

    for (const file of SQL_FILES) {
      const filePath = path.join(sqlDir, file);

      if (!fs.existsSync(filePath)) {
        console.error(`[migrate] ERROR: Archivo de migración no encontrado: ${filePath}`);
        process.exit(1);
      }

      console.log(`[migrate] Ejecutando ${file}...`);
      const sql = fs.readFileSync(filePath, 'utf8');

      try {
        await client.query(sql);
        console.log(`[migrate] ✓ ${file} aplicado correctamente.`);
      } catch (err) {
        console.error(`[migrate] ERROR al ejecutar ${file}:`);
        console.error(`[migrate]   ${err.message}`);
        process.exit(1);
      }
    }

    console.log('\n[migrate] ✅ Todas las migraciones aplicadas correctamente.');
    console.log('[migrate] Podés verificar el estado con:');
    console.log('[migrate]   GET https://<tu-servicio>.onrender.com/api/health');

  } catch (err) {
    console.error('[migrate] ERROR de conexión:', err.message);
    console.error('[migrate] Verificá que DATABASE_URL sea válida y que la base esté accesible.');
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
