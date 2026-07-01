'use strict';

const path = require('path');
// Cargar variables de entorno de test antes de requerir la app
require('dotenv').config({ path: path.resolve(__dirname, '../.env.test') });

const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/db');
const { resetDbAndSeed } = require('./fixtures');

describe('Módulo de Reportes', () => {
  let tokens = {};

  beforeEach(async () => {
    // Reiniciar y poblar la base de datos de test antes de cada test
    const seeded = await resetDbAndSeed();

    // Obtener tokens de autenticación
    const coordLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'coordinador_test@aulamatch.edu',
        password: 'TestPassword123!'
      });
    tokens.coordinador = coordLogin.body.token;

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin_test@aulamatch.edu',
        password: 'TestPassword123!'
      });
    tokens.administrativo = adminLogin.body.token;

    // Crear un par de asignaciones para tener datos en el reporte
    // C1_HAPPY (Comision ID: 1) -> Aula A1 (Aula ID: 1)
    await pool.query(
      `INSERT INTO asignacion (estado, es_manual, comision_id, aula_id)
       VALUES ('ASIGNADA', false, 1, 1)`
    );

    // C2_AUDITORIO (Comision ID: 2) -> Aula A2 (Aula ID: 2)
    await pool.query(
      `INSERT INTO asignacion (estado, es_manual, comision_id, aula_id)
       VALUES ('CONFLICTO', true, 2, 2)`
    );
  });

  afterAll(async () => {
    // Cerrar el pool de conexiones al terminar todas las pruebas de este archivo
    await pool.end();
  });

  describe('GET /api/reportes/asignaciones', () => {
    it('debería bloquear acceso si no se proporciona token', async () => {
      const res = await request(app).get('/api/reportes/asignaciones?anio=2026&cuatrimestre=1');
      expect(res.status).toBe(401);
    });

    it('debería retornar 400 si faltan anio o cuatrimestre', async () => {
      const res = await request(app)
        .get('/api/reportes/asignaciones?anio=2026')
        .set('Authorization', `Bearer ${tokens.coordinador}`);
      expect(res.status).toBe(400);
      expect(res.body.error).toContain('obligatorios');
    });

    it('debería retornar el reporte en JSON para COORDINADOR con todos los campos especificados', async () => {
      const res = await request(app)
        .get('/api/reportes/asignaciones?anio=2026&cuatrimestre=1')
        .set('Authorization', `Bearer ${tokens.coordinador}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      const first = res.body[0];
      expect(first).toHaveProperty('comision_codigo');
      expect(first).toHaveProperty('materia_nombre');
      expect(first).toHaveProperty('carreras');
      expect(first).toHaveProperty('unidad_academica_nombre');
      expect(first).toHaveProperty('docente_apellido');
      expect(first).toHaveProperty('docente_nombre');
      expect(first).toHaveProperty('cupo');
      expect(first).toHaveProperty('inscriptos');
      expect(first).toHaveProperty('aula_numero');
      expect(first).toHaveProperty('edificio_nombre');
      expect(first).toHaveProperty('horario');
      expect(first).toHaveProperty('modalidad');
      expect(first).toHaveProperty('turno');
      expect(first).toHaveProperty('estado_asignacion');
      expect(first).toHaveProperty('es_manual');
      expect(first).toHaveProperty('fecha_asignacion');

      // Verificar que el formato de horario se resuma correctamente
      // C1_HAPPY: LUNES 08:00 - 12:00 -> "Lun 08:00-12:00"
      const happy = res.body.find(a => a.comision_codigo === 'C1_HAPPY');
      expect(happy.horario).toBe('Lun 08:00-12:00');
    });

    it('debería exportar en CSV si se especifica ?formato=csv', async () => {
      const res = await request(app)
        .get('/api/reportes/asignaciones?anio=2026&cuatrimestre=1&formato=csv')
        .set('Authorization', `Bearer ${tokens.coordinador}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('attachment; filename="asignaciones_2026_1.csv"');

      const csvText = res.text;
      // Verificar presencia de BOM de UTF-8
      expect(csvText.charCodeAt(0)).toBe(0xFEFF);

      // Verificar la cabecera del CSV
      expect(csvText).toContain('comision_codigo,materia_nombre,carreras');
      expect(csvText).toContain('C1_HAPPY');
      expect(csvText).toContain('Lun 08:00-12:00');
    });

    it('debería aplicar el filtro de unidad académica automáticamente si es un ADMINISTRATIVO', async () => {
      // El administrador_test pertenece a la UA de test
      // Creamos otra UA y otra comision/asignación para verificar el aislamiento
      const otraUa = await pool.query(
        "INSERT INTO unidad_academica (nombre) VALUES ('Otra Facultad Regional') RETURNING id"
      );
      const otraUaId = otraUa.rows[0].id;

      const otraMateria = await pool.query(
        "INSERT INTO materia (nombre, codigo, unidad_academica_id) VALUES ('Analisis Matematico I', 'AM1', $1) RETURNING id",
        [otraUaId]
      );
      const otraMateriaId = otraMateria.rows[0].id;

      const otraComision = await pool.query(
        `INSERT INTO comision (codigo, cupo, inscriptos, modalidad, turno, cuatrimestre, anio, materia_id, docente_id)
         VALUES ('CO_OTRA_UA', 50, 40, 'PRESENCIAL', 'MANANA', 1, 2026, $1, 1) RETURNING id`,
        [otraMateriaId]
      );
      
      // Asignarla a la misma aula A1
      await pool.query(
        `INSERT INTO asignacion (estado, es_manual, comision_id, aula_id)
         VALUES ('ASIGNADA', false, $1, 1)`,
        [otraComision.rows[0].id]
      );

      // Consultar como COORDINADOR (debe ver ambas)
      const resCoord = await request(app)
        .get('/api/reportes/asignaciones?anio=2026&cuatrimestre=1')
        .set('Authorization', `Bearer ${tokens.coordinador}`);
      expect(resCoord.body.length).toBe(3);

      // Consultar como ADMINISTRATIVO (solo debe ver las de su UA, excluyendo CO_OTRA_UA)
      const resAdmin = await request(app)
        .get('/api/reportes/asignaciones?anio=2026&cuatrimestre=1')
        .set('Authorization', `Bearer ${tokens.administrativo}`);
      
      expect(resAdmin.body.length).toBe(2);
      expect(resAdmin.body.some(a => a.comision_codigo === 'CO_OTRA_UA')).toBe(false);
    });
  });

  describe('GET /api/reportes/disponibilidad', () => {
    it('debería bloquear acceso a un ADMINISTRATIVO con HTTP 403', async () => {
      const res = await request(app)
        .get('/api/reportes/disponibilidad?anio=2026&cuatrimestre=1')
        .set('Authorization', `Bearer ${tokens.administrativo}`);
      expect(res.status).toBe(403);
    });

    it('debería permitir el acceso al COORDINADOR y retornar aulas agrupadas por edificio', async () => {
      const res = await request(app)
        .get('/api/reportes/disponibilidad?anio=2026&cuatrimestre=1')
        .set('Authorization', `Bearer ${tokens.coordinador}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      const edif = res.body[0];
      expect(edif).toHaveProperty('edificio_id');
      expect(edif).toHaveProperty('edificio_nombre');
      expect(edif).toHaveProperty('aulas');

      const aulaObj = edif.aulas[0];
      expect(aulaObj).toHaveProperty('id');
      expect(aulaObj).toHaveProperty('numero');
      expect(aulaObj).toHaveProperty('tipo');
      expect(aulaObj).toHaveProperty('capacidad');
      expect(aulaObj).toHaveProperty('ocupacion_pct');
      expect(aulaObj).toHaveProperty('bloques_ocupados');
      expect(aulaObj).toHaveProperty('bloques_libres');

      // Aula A101 (capacidad 40, tipo AULA) tiene asignada C1_HAPPY (LUNES 08:00 - 12:00 = 4 horas)
      // Ocupación: (4 / 84) * 100 = 4.76%
      const A101 = edif.aulas.find(a => a.numero === 'A101');
      expect(A101.ocupacion_pct).toBe(4.76);
      expect(A101.bloques_ocupados.length).toBe(1);
      expect(A101.bloques_ocupados[0].comision_codigo).toBe('C1_HAPPY');

      // Validar cálculo de bloques libres para Lunes en A101:
      // Ocupado: 08:00 - 12:00.
      // Libre: 12:00 - 22:00
      const lunesLibres = A101.bloques_libres.filter(b => b.dia === 'LUNES');
      expect(lunesLibres.length).toBe(1);
      expect(lunesLibres[0].hora_inicio).toBe('12:00');
      expect(lunesLibres[0].hora_fin).toBe('22:00');
    });

    it('debería filtrar disponibilidad por dia de forma consistente sin omitir aulas', async () => {
      const res = await request(app)
        .get('/api/reportes/disponibilidad?anio=2026&cuatrimestre=1&dia=LUNES')
        .set('Authorization', `Bearer ${tokens.coordinador}`);

      expect(res.status).toBe(200);

      // El aula Auditorio A (A2) no tiene clases los Lunes (tiene C2_AUDITORIO los Martes 14:00 - 18:00)
      // Debe seguir existiendo en el listado, pero con bloques ocupados vacíos para el Lunes
      const edif = res.body.find(e => e.edificio_nombre.includes('Edificio A'));
      const auditorio = edif.aulas.find(a => a.numero === 'Auditorio A');

      expect(auditorio).toBeDefined();
      expect(auditorio.bloques_ocupados.length).toBe(0); // Lunes vacío
      
      // Bloques libres del Lunes: debe ser el rango completo (08:00 - 22:00)
      expect(auditorio.bloques_libres.length).toBe(1);
      expect(auditorio.bloques_libres[0].dia).toBe('LUNES');
      expect(auditorio.bloques_libres[0].hora_inicio).toBe('08:00');
      expect(auditorio.bloques_libres[0].hora_fin).toBe('22:00');

      // Su ocupación porcentual semanal debe seguir reflejando el Martes (4 horas -> 4.76%)
      expect(auditorio.ocupacion_pct).toBe(4.76);
    });
  });
});
