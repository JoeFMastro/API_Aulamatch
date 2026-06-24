'use strict';

require('dotenv').config();

const REQUIRED = [
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'JWT_SECRET',
];

for (const key of REQUIRED) {
  if (!process.env[key]) {
    throw new Error(`[config/env] Variable de entorno requerida no definida: ${key}`);
  }
}
