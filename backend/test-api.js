require('dotenv').config({ path: '.env' });
const jwt = require('jsonwebtoken');
const db = require('./src/config/db');

async function test() {
  const { rows } = await db.query("SELECT * FROM usuario WHERE rol = 'COORDINADOR' LIMIT 1");
  const token = jwt.sign(
    { sub: rows[0].id, nombre: rows[0].nombre, rol: rows[0].rol, unidadAcademicaId: rows[0].unidad_academica_id },
    process.env.JWT_SECRET || 'secreto',
    { expiresIn: '1h' }
  );
  
  try {
    const res = await fetch('http://localhost:3002/api/aulas', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Status:', res.status);
    const body = await res.text();
    console.log('Body:', body);
  } catch (err) {
    console.error(err);
  }
  process.exit();
}
test();
