require('dotenv').config({ path: '.env' });
const { jwtSign } = require('./src/utils/jwt');
const db = require('./src/config/db');

async function test() {
  const { rows } = await db.query("SELECT * FROM usuario WHERE rol = 'COORDINADOR' LIMIT 1");
  const token = jwtSign(rows[0]);
  console.log(token);
  process.exit();
}
test();
