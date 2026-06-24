/**
 * server.js — Arranca el servidor HTTP con reintento de conexión a base de datos
 */
'use strict';

require('./src/config/env');   // Carga .env antes que nada
const app  = require('./src/app');
const { query } = require('./src/config/db');

const PORT = process.env.PORT || 3000;
const MAX_RETRIES = 5;
const RETRY_DELAY = 3000; // 3 segundos

async function startServer(attempt = 1) {
  try {
    // Probar conexión real a la base de datos antes de escuchar peticiones
    await query('SELECT 1');
    console.log('[db] Conexión establecida con éxito a PostgreSQL.');

    app.listen(PORT, () => {
      console.log(`[AulaMatch] Servidor corriendo en http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error(`[db] Intento ${attempt}/${MAX_RETRIES} de conexión a PostgreSQL fallido:`, err.message);

    if (attempt < MAX_RETRIES) {
      console.log(`[db] Reintentando en ${RETRY_DELAY / 1000} segundos...`);
      setTimeout(() => startServer(attempt + 1), RETRY_DELAY);
    } else {
      console.error('[db] Se superó el número máximo de reintentos de conexión. Saliendo del proceso...');
      process.exit(1);
    }
  }
}

startServer();
