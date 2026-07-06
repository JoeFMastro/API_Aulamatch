require('dotenv').config({ path: '.env.test' });
const service = require('./src/modules/conflictos/service');
const { pool } = require('./src/config/db');

async function run() {
  try {
    console.log("Calling listarConflictos...");
    await service.listarConflictos();
    console.log("Success listarConflictos!");

    console.log("Calling obtenerMetricas...");
    await service.obtenerMetricas();
    console.log("Success obtenerMetricas!");
  } catch (err) {
    console.error("ERROR:", err);
  } finally {
    await pool.end();
  }
}
run();
