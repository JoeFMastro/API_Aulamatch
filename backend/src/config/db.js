'use strict';

const { Pool } = require('pg');

const poolConfig = process.env.DATABASE_URL
  ? { 
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    }
  : {
      host:     process.env.DB_HOST,
      port:     Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME,
      user:     process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    };

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('[db] Error inesperado en cliente inactivo:', err.message);
  process.exit(1);
});

/**
 * Ejecuta una query parametrizada sobre el pool.
 * @param {string} text    Sentencia SQL con placeholders $1, $2 …
 * @param {any[]}  [params] Valores para los placeholders
 * @returns {Promise<import('pg').QueryResult>}
 */
const query = (text, params) => pool.query(text, params);

/**
 * Obtiene un cliente dedicado del pool (para transacciones).
 * Recordar llamar a client.release() siempre en el bloque finally.
 */
const getClient = () => pool.connect();

module.exports = { pool, query, getClient };
