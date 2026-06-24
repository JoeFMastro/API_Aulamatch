/**
 * config/db.js — Pool de conexión a PostgreSQL
 *
 * Usa la librería `pg` (node-postgres).
 * La cadena de conexión se construye desde variables de entorno.
 *
 * TODO: instalar dependencia →  npm install pg
 * TODO: exportar `pool` y función `query(text, params)`
 */
'use strict';

// const { Pool } = require('pg');
// 
// const pool = new Pool({
//   host:     process.env.DB_HOST,
//   port:     Number(process.env.DB_PORT) || 5432,
//   database: process.env.DB_NAME,
//   user:     process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
// });
// 
// /**
//  * Ejecuta una query parametrizada.
//  * @param {string} text   - Sentencia SQL con placeholders $1, $2 …
//  * @param {any[]}  params - Valores para los placeholders
//  */
// const query = (text, params) => pool.query(text, params);
// 
// module.exports = { pool, query };
