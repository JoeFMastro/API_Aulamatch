/**
 * server.js — Arranca el servidor HTTP
 * Lee PORT desde variables de entorno (.env)
 */
'use strict';

require('./src/config/env');   // Carga .env antes que nada
const app  = require('./src/app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`[AulaMatch] Servidor corriendo en http://localhost:${PORT}`);
});
