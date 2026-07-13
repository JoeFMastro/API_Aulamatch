'use strict';
require('./config/env');
const { pool } = require('./config/db');
async function run() {
  const { rows } = await pool.query('SELECT email, rol FROM usuario LIMIT 5');
  console.log('Users:', rows);
  await pool.end();
}
run().catch(console.error);
