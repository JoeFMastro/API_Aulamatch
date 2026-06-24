'use strict';

require('dotenv').config();

const REQUIRED = [
  'JWT_SECRET',
];

// Validar conexión a base de datos: se requiere DATABASE_URL o el conjunto de variables individuales
const hasDatabaseUrl = !!process.env.DATABASE_URL;
const hasIndividualDbVars = [
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
].every(key => !!process.env[key]);

if (!hasDatabaseUrl && !hasIndividualDbVars) {
  throw new Error(
    '[config/env] Variable de entorno de base de datos faltante: se requiere DATABASE_URL o el conjunto completo de (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD)'
  );
}

for (const key of REQUIRED) {
  if (!process.env[key]) {
    throw new Error(`[config/env] Variable de entorno requerida no definida: ${key}`);
  }
}

