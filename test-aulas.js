const db = require('./backend/src/config/db');

async function test() {
  try {
    const { rows } = await db.query(
      `SELECT a.id, a.numero, a.capacidad, a.tipo, a.edificio_id, e.nombre AS edificio_nombre
       FROM aula a
       JOIN edificio e ON e.id = a.edificio_id
       ORDER BY e.nombre, a.numero ASC`
    );
    console.log("Aulas in DB:", rows.length);
    console.log(rows);
  } catch (err) {
    console.error("Error querying aulas:", err);
  } finally {
    process.exit();
  }
}

test();
