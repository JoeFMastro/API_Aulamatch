'use strict';

const bcrypt = require('bcryptjs');
const { query } = require('../src/config/db');

// Generar hash para la contraseña de test 'TestPassword123!'
const PASSWORD_HASH = bcrypt.hashSync('TestPassword123!', 10);

/**
 * Limpia todas las tablas de la base de datos y restablece las secuencias auto-incrementales.
 */
async function clearDatabase() {
  await query(`
    TRUNCATE TABLE 
      notificacion,
      asignacion, 
      banda_horaria, 
      comision, 
      carrera_materia, 
      materia, 
      carrera, 
      docente, 
      aula, 
      edificio, 
      unidad_academica, 
      usuario 
    RESTART IDENTITY 
    CASCADE
  `);
}

/**
 * Inserta un conjunto mínimo y controlado de datos (fixtures) para los escenarios de prueba.
 * Devuelve un objeto con las entidades creadas y sus IDs/datos para fácil referencia en los tests.
 */
async function seedDatabase() {
  // 1. Edificios
  const edifA = await query(
    "INSERT INTO edificio (nombre, direccion) VALUES ('Edificio A (Medrano)', 'Medrano 951') RETURNING id, nombre"
  );
  const edifB = await query(
    "INSERT INTO edificio (nombre, direccion) VALUES ('Edificio B (Campus)', 'Mozart 2300') RETURNING id, nombre"
  );
  
  const edificioAId = edifA.rows[0].id;
  const edificioBId = edifB.rows[0].id;

  // 2. Unidad Académica (UA) con preferencia por Edificio A
  const ua = await query(
    "INSERT INTO unidad_academica (nombre, edificio_preferencia_id) VALUES ($1, $2) RETURNING id, nombre",
    ['Facultad Regional Buenos Aires (Test)', edificioAId]
  );
  const uaId = ua.rows[0].id;

  // 3. Aulas
  // Aula A1: Medrano, Capacidad 40, tipo AULA (Edificio Preferido)
  const aulaA1 = await query(
    "INSERT INTO aula (numero, capacidad, tipo, edificio_id) VALUES ('A101', 40, 'AULA', $1) RETURNING id, numero, capacidad, tipo, edificio_id",
    [edificioAId]
  );
  // Aula A2: Medrano, Capacidad 100, tipo AUDITORIO (Edificio Preferido)
  const aulaA2 = await query(
    "INSERT INTO aula (numero, capacidad, tipo, edificio_id) VALUES ('Auditorio A', 100, 'AUDITORIO', $1) RETURNING id, numero, capacidad, tipo, edificio_id",
    [edificioAId]
  );
  // Aula B1: Campus, Capacidad 50, tipo AULA (Edificio Alternativo)
  const aulaB1 = await query(
    "INSERT INTO aula (numero, capacidad, tipo, edificio_id) VALUES ('B201', 50, 'AULA', $1) RETURNING id, numero, capacidad, tipo, edificio_id",
    [edificioBId]
  );
  // Aula B2: Campus, Capacidad 15, tipo SALA_VIDEOCONFERENCIA
  const aulaB2 = await query(
    "INSERT INTO aula (numero, capacidad, tipo, edificio_id) VALUES ('Virtual B', 15, 'SALA_VIDEOCONFERENCIA', $1) RETURNING id, numero, capacidad, tipo, edificio_id",
    [edificioBId]
  );
  // Aula B3: Campus, Capacidad 30, tipo LABORATORIO
  const aulaB3 = await query(
    "INSERT INTO aula (numero, capacidad, tipo, edificio_id) VALUES ('Lab B', 30, 'LABORATORIO', $1) RETURNING id, numero, capacidad, tipo, edificio_id",
    [edificioBId]
  );

  // 4. Usuarios (Coordinador y Administrativo)
  const coordinador = await query(
    `INSERT INTO usuario (nombre, email, password_hash, rol, unidad_academica_id)
     VALUES ($1, $2, $3, 'COORDINADOR', NULL)
     RETURNING id, email, rol`,
    ['Coordinador QA', 'coordinador_test@aulamatch.edu', PASSWORD_HASH]
  );

  const administrativo = await query(
    `INSERT INTO usuario (nombre, email, password_hash, rol, unidad_academica_id)
     VALUES ($1, $2, $3, 'ADMINISTRATIVO', $4)
     RETURNING id, email, rol, unidad_academica_id`,
    ['Admin QA', 'admin_test@aulamatch.edu', PASSWORD_HASH, uaId]
  );

  // 5. Docente, Carrera, Materia
  const docente = await query(
    "INSERT INTO docente (nombre, apellido, cargo) VALUES ('Juan', 'Perez', 'Titular') RETURNING id, nombre, apellido"
  );
  const docenteId = docente.rows[0].id;

  const carrera = await query(
    "INSERT INTO carrera (nombre, codigo, unidad_academica_id) VALUES ('Ingeniería en Sistemas de Información', 'K-SISTEMAS', $1) RETURNING id, nombre",
    [uaId]
  );
  const carreraId = carrera.rows[0].id;

  const materia = await query(
    "INSERT INTO materia (nombre, codigo, unidad_academica_id) VALUES ('Diseño de Sistemas', 'K3001', $1) RETURNING id, nombre",
    [uaId]
  );
  const materiaId = materia.rows[0].id;

  // Asociar carrera y materia
  await query("INSERT INTO carrera_materia (carrera_id, materia_id) VALUES ($1, $2)", [carreraId, materiaId]);

  // 6. Comisiones y Bandas Horarias
  // Comisión 1 (Caso feliz - AULA): 25 alumnos, PRESENCIAL, Lunes 08:00 - 12:00, Año 2026, Cuatrimestre 1
  const com1 = await query(
    `INSERT INTO comision (codigo, cupo, inscriptos, modalidad, turno, cuatrimestre, anio, materia_id, docente_id)
     VALUES ('C1_HAPPY', 30, 25, 'PRESENCIAL', 'MANANA', 1, 2026, $1, $2) RETURNING id, codigo`,
    [materiaId, docenteId]
  );
  await query(
    "INSERT INTO banda_horaria (dia, hora_inicio, hora_fin, tipo_clase, comision_id) VALUES ('LUNES', '08:00:00', '12:00:00', 'TEORICA', $1)",
    [com1.rows[0].id]
  );

  // Comisión 2 (Auditorio Priority): 85 alumnos, PRESENCIAL, Martes 14:00 - 18:00, Año 2026, Cuatrimestre 1
  const com2 = await query(
    `INSERT INTO comision (codigo, cupo, inscriptos, modalidad, turno, cuatrimestre, anio, materia_id, docente_id)
     VALUES ('C2_AUDITORIO', 100, 85, 'PRESENCIAL', 'TARDE', 1, 2026, $1, $2) RETURNING id, codigo`,
    [materiaId, docenteId]
  );
  await query(
    "INSERT INTO banda_horaria (dia, hora_inicio, hora_fin, tipo_clase, comision_id) VALUES ('MARTES', '14:00:00', '18:00:00', 'TEORICA', $1)",
    [com2.rows[0].id]
  );

  // Comisión 3 (Sin Aula Disponible - Excede capacidad de todas las aulas): 120 alumnos, PRESENCIAL, Miércoles 08:00 - 12:00, Año 2026, Cuatrimestre 1
  const com3 = await query(
    `INSERT INTO comision (codigo, cupo, inscriptos, modalidad, turno, cuatrimestre, anio, materia_id, docente_id)
     VALUES ('C3_SIN_AULA', 150, 120, 'PRESENCIAL', 'MANANA', 1, 2026, $1, $2) RETURNING id, codigo`,
    [materiaId, docenteId]
  );
  await query(
    "INSERT INTO banda_horaria (dia, hora_inicio, hora_fin, tipo_clase, comision_id) VALUES ('MIERCOLES', '08:00:00', '12:00:00', 'TEORICA', $1)",
    [com3.rows[0].id]
  );

  // Comisión 4 (Superposición 1): 20 alumnos, PRESENCIAL, Jueves 08:00 - 12:00, Año 2026, Cuatrimestre 1
  const com4 = await query(
    `INSERT INTO comision (codigo, cupo, inscriptos, modalidad, turno, cuatrimestre, anio, materia_id, docente_id)
     VALUES ('C4_SOLAPE_1', 30, 20, 'PRESENCIAL', 'MANANA', 1, 2026, $1, $2) RETURNING id, codigo`,
    [materiaId, docenteId]
  );
  await query(
    "INSERT INTO banda_horaria (dia, hora_inicio, hora_fin, tipo_clase, comision_id) VALUES ('JUEVES', '08:00:00', '12:00:00', 'TEORICA', $1)",
    [com4.rows[0].id]
  );

  // Comisión 5 (Superposición 2 - Solapa con Comisión 4): 20 alumnos, PRESENCIAL, Jueves 09:00 - 13:00, Año 2026, Cuatrimestre 1
  const com5 = await query(
    `INSERT INTO comision (codigo, cupo, inscriptos, modalidad, turno, cuatrimestre, anio, materia_id, docente_id)
     VALUES ('C5_SOLAPE_2', 30, 20, 'PRESENCIAL', 'MANANA', 1, 2026, $1, $2) RETURNING id, codigo`,
    [materiaId, docenteId]
  );
  await query(
    "INSERT INTO banda_horaria (dia, hora_inicio, hora_fin, tipo_clase, comision_id) VALUES ('JUEVES', '09:00:00', '13:00:00', 'TEORICA', $1)",
    [com5.rows[0].id]
  );

  // Comisión 6 (Cupo Excedido manual): 60 alumnos, PRESENCIAL, Viernes 08:00 - 12:00, Año 2026, Cuatrimestre 1
  const com6 = await query(
    `INSERT INTO comision (codigo, cupo, inscriptos, modalidad, turno, cuatrimestre, anio, materia_id, docente_id)
     VALUES ('C6_CUPO_EXC', 70, 60, 'PRESENCIAL', 'MANANA', 1, 2026, $1, $2) RETURNING id, codigo`,
    [materiaId, docenteId]
  );
  await query(
    "INSERT INTO banda_horaria (dia, hora_inicio, hora_fin, tipo_clase, comision_id) VALUES ('VIERNES', '08:00:00', '12:00:00', 'TEORICA', $1)",
    [com6.rows[0].id]
  );

  // Comisión 7 (Sala Videoconferencia): 10 alumnos, VIRTUAL, Lunes 14:00 - 18:00, Año 2026, Cuatrimestre 1
  const com7 = await query(
    `INSERT INTO comision (codigo, cupo, inscriptos, modalidad, turno, cuatrimestre, anio, materia_id, docente_id)
     VALUES ('C7_VIRTUAL', 15, 10, 'VIRTUAL', 'TARDE', 1, 2026, $1, $2) RETURNING id, codigo`,
    [materiaId, docenteId]
  );
  await query(
    "INSERT INTO banda_horaria (dia, hora_inicio, hora_fin, tipo_clase, comision_id) VALUES ('LUNES', '14:00:00', '18:00:00', 'PRACTICA', $1)",
    [com7.rows[0].id]
  );

  // Comisión 8 (Laboratorio): 25 alumnos, PRESENCIAL, Martes 08:00 - 12:00, Año 2026, Cuatrimestre 1
  const com8 = await query(
    `INSERT INTO comision (codigo, cupo, inscriptos, modalidad, turno, cuatrimestre, anio, materia_id, docente_id)
     VALUES ('C8_LAB', 30, 25, 'PRESENCIAL', 'MANANA', 1, 2026, $1, $2) RETURNING id, codigo`,
    [materiaId, docenteId]
  );
  await query(
    "INSERT INTO banda_horaria (dia, hora_inicio, hora_fin, tipo_clase, comision_id) VALUES ('MARTES', '08:00:00', '12:00:00', 'PRACTICA', $1)",
    [com8.rows[0].id]
  );

  return {
    edificios: {
      edificioAId,
      edificioBId,
    },
    unidadAcademica: {
      id: uaId,
    },
    aulas: {
      aulaA1: aulaA1.rows[0],
      aulaA2: aulaA2.rows[0],
      aulaB1: aulaB1.rows[0],
      aulaB2: aulaB2.rows[0],
      aulaB3: aulaB3.rows[0],
    },
    usuarios: {
      coordinador: coordinador.rows[0],
      administrativo: administrativo.rows[0],
    },
    comisiones: {
      com1: com1.rows[0],
      com2: com2.rows[0],
      com3: com3.rows[0],
      com4: com4.rows[0],
      com5: com5.rows[0],
      com6: com6.rows[0],
      com7: com7.rows[0],
      com8: com8.rows[0],
    },
  };
}

module.exports = {
  clearDatabase,
  seedDatabase,
  resetDbAndSeed: async () => {
    await clearDatabase();
    return seedDatabase();
  },
};
