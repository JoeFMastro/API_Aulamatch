#!/usr/bin/env node
/**
 * scripts/generate-seed-hashes.js
 *
 * Genera los hashes bcrypt (cost 12) para las contraseñas del seed de desarrollo.
 * Usar estos hashes en deploy/init-db/02_usuarios.sql.
 *
 * Uso:
 *   node scripts/generate-seed-hashes.js
 *
 * Salida:
 *   Hash para coordinador@aulamatch.edu (Coord1234!) : $2b$12$...
 *   Hash para admin@aulamatch.edu       (Admin1234!) : $2b$12$...
 */

'use strict';

const bcrypt = require('bcryptjs');

const COST = 12;

const seeds = [
  { email: 'coordinador@aulamatch.edu', password: 'Coord1234!' },
  { email: 'admin@aulamatch.edu',       password: 'Admin1234!' },
];

(async () => {
  console.log(`\nGenerando hashes bcrypt (cost=${COST})…\n`);

  for (const { email, password } of seeds) {
    const hash = await bcrypt.hash(password, COST);
    console.log(`  ${email} / ${password}`);
    console.log(`  hash: ${hash}\n`);
  }

  console.log('Copiar los hashes al archivo deploy/init-db/02_usuarios.sql\n');
})();
