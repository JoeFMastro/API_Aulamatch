'use strict';

const path = require('path');
// Cargar variables de entorno de test antes de requerir la app
require('dotenv').config({ path: path.resolve(__dirname, '../.env.test') });

const request = require('supertest');
const app = require('../src/app');
const { pool, query } = require('../src/config/db');
const { resetDbAndSeed } = require('./fixtures');

describe('Módulo de Conflictos y Resolución', () => {
  let token;
  let fixtures;

  beforeAll(async () => {
    // Inicializar DB por primera vez
    fixtures = await resetDbAndSeed();

    // Obtener token de COORDINADOR
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'coordinador_test@aulamatch.edu',
        password: 'TestPassword123!',
      });
    token = loginResponse.body.token;
  });

  beforeEach(async () => {
    // Resetear base de datos para cada test para asegurar aislamiento
    fixtures = await resetDbAndSeed();
  });

  afterAll(async () => {
    await pool.end();
  });

  it('Caso Asignación Sin Conflicto: asignación manual válida no genera conflictos ni notificaciones', async () => {
    // Comisión 1 (C1_HAPPY) tiene 25 inscriptos, Lunes 08:00 - 12:00.
    // Aula A1 (A101) tiene capacidad 40, está vacía.
    const response = await request(app)
      .post('/api/asignaciones')
      .set('Authorization', `Bearer ${token}`)
      .send({
        comision_id: fixtures.comisiones.com1.id,
        aula_id: fixtures.aulas.aulaA1.id,
      });

    expect(response.status).toBe(201);
    expect(response.body.estado).toBe('ASIGNADA');
    expect(response.body.es_manual).toBe(true);

    // Verificar en la DB que no existan notificaciones de conflicto creadas para esta asignación
    const { rows: notifs } = await query(
      'SELECT * FROM notificacion WHERE asignacion_id = $1',
      [response.body.id]
    );
    expect(notifs.length).toBe(0);
  });

  it('Caso Conflicto por Cupo Excedido: asignación manual a un aula más chica que el cupo requerido genera CONFLICTO y notificación', async () => {
    // Comisión 6 (C6_CUPO_EXC) tiene 60 inscriptos.
    // Intentamos asignarla a Aula B1 (B201), que tiene capacidad 50.
    const response = await request(app)
      .post('/api/asignaciones')
      .set('Authorization', `Bearer ${token}`)
      .send({
        comision_id: fixtures.comisiones.com6.id,
        aula_id: fixtures.aulas.aulaB1.id,
      });

    expect(response.status).toBe(201);

    // Consultar el estado actualizado de la asignación en la base de datos
    const { rows: [asigActualizada] } = await query(
      'SELECT estado FROM asignacion WHERE id = $1',
      [response.body.id]
    );

    expect(asigActualizada.estado).toBe('CONFLICTO');

    // Verificar que se haya creado la notificación de conflicto correspondiente
    const { rows: notifs } = await query(
      'SELECT * FROM notificacion WHERE asignacion_id = $1 AND atendida = FALSE',
      [response.body.id]
    );

    expect(notifs.length).toBe(1);
    expect(notifs[0].tipo_conflicto).toBe('CUPO_EXCEDIDO');
    expect(notifs[0].detalle).toContain('Cupo excedido');
  });

  it('Caso Conflicto por Superposición Horaria: dos comisiones asignadas en la misma aula y horario generan CONFLICTO tras la detección', async () => {
    const com4Id = fixtures.comisiones.com4.id; // Jueves 08:00 - 12:00 (C4_SOLAPE_1)
    const com5Id = fixtures.comisiones.com5.id; // Jueves 09:00 - 13:00 (C5_SOLAPE_2) - Solapa con C4
    const aulaId = fixtures.aulas.aulaA1.id;

    // Insertar directamente la primera asignación vía SQL en estado ASIGNADA
    const { rows: [asig4] } = await query(
      "INSERT INTO asignacion (estado, es_manual, comision_id, aula_id) VALUES ('ASIGNADA', true, $1, $2) RETURNING id",
      [com4Id, aulaId]
    );

    // Insertar directamente la segunda asignación (superpuesta) vía SQL en estado ASIGNADA
    // (Bypasseando el control 409 de la API para poder probar el motor de conflictos)
    const { rows: [asig5] } = await query(
      "INSERT INTO asignacion (estado, es_manual, comision_id, aula_id) VALUES ('ASIGNADA', true, $1, $2) RETURNING id",
      [com5Id, aulaId]
    );

    // Ejecutar detección manual de conflictos masiva
    const detectResponse = await request(app)
      .post('/api/conflictos/detectar')
      .set('Authorization', `Bearer ${token}`);

    expect(detectResponse.status).toBe(200);

    // La primera asignación debe haber pasado a estado CONFLICTO (se procesa primero en el loop)
    const { rows: [asig4Actualizada] } = await query(
      'SELECT estado FROM asignacion WHERE id = $1',
      [asig4.id]
    );
    expect(asig4Actualizada.estado).toBe('CONFLICTO');

    // Debe haberse creado una notificación de tipo SUPERPOSICION_HORARIA vinculada a la primera asignación
    const { rows: notifs } = await query(
      'SELECT * FROM notificacion WHERE asignacion_id = $1 AND atendida = FALSE',
      [asig4.id]
    );
    expect(notifs.length).toBe(1);
    expect(notifs[0].tipo_conflicto).toBe('SUPERPOSICION_HORARIA');
    expect(notifs[0].detalle).toContain('Superposición horaria');
  });

  it('Caso Flujo Completo de Resolución: detectar conflicto -> buscar aulas compatibles -> reasignar -> verificar estado ASIGNADA', async () => {
    // 1. Crear un conflicto por cupo excedido: Comisión 6 (60 alumnos) en Aula B1 (capacidad 50)
    const response = await request(app)
      .post('/api/asignaciones')
      .set('Authorization', `Bearer ${token}`)
      .send({
        comision_id: fixtures.comisiones.com6.id,
        aula_id: fixtures.aulas.aulaB1.id,
      });

    const asignacionId = response.body.id;
    const comisionId = fixtures.comisiones.com6.id;

    // Verificar que efectivamente está en CONFLICTO
    const { rows: [asigConflicto] } = await query(
      'SELECT estado FROM asignacion WHERE id = $1',
      [asignacionId]
    );
    expect(asigConflicto.estado).toBe('CONFLICTO');

    // 2. Solicitar aulas compatibles para la comisión en conflicto
    // endpoint: GET /api/asignaciones/:comision_id/aulas-compatibles
    const compatResponse = await request(app)
      .get(`/api/asignaciones/${comisionId}/aulas-compatibles`)
      .set('Authorization', `Bearer ${token}`);

    expect(compatResponse.status).toBe(200);
    expect(Array.isArray(compatResponse.body)).toBe(true);
    expect(compatResponse.body.length).toBeGreaterThan(0);

    // Debe incluir Aula A2 (capacidad 100), la cual tiene suficiente capacidad (100 >= 60)
    const aulaCompatible = compatResponse.body.find(a => Number(a.capacidad) >= 60);
    expect(aulaCompatible).toBeDefined();

    // 3. Reasignar a la nueva aula compatible y cambiar estado a ASIGNADA
    // endpoint: PATCH /api/asignaciones/:id
    const patchResponse = await request(app)
      .patch(`/api/asignaciones/${asignacionId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        aula_id: aulaCompatible.id,
        estado: 'ASIGNADA',
      });

    expect(patchResponse.status).toBe(200);
    expect(patchResponse.body.estado).toBe('ASIGNADA');
    expect(patchResponse.body.es_manual).toBe(true);
    expect(patchResponse.body.aula_id).toBe(aulaCompatible.id);

    // 4. Verificar que las notificaciones de conflicto fueron marcadas como atendidas
    const { rows: notifs } = await query(
      'SELECT atendida FROM notificacion WHERE asignacion_id = $1',
      [asignacionId]
    );
    
    expect(notifs.length).toBeGreaterThan(0);
    expect(notifs.every(n => n.atendida === true)).toBe(true);
  });

  it('GET /api/conflictos: devuelve los conflictos detectados con los datos cruzados correctos (incluyendo horario de la banda)', async () => {
    // Generar un conflicto de superposición horaria para forzar el JOIN con banda_horaria
    const com4Id = fixtures.comisiones.com4.id; // Jueves 08:00 - 12:00
    const com5Id = fixtures.comisiones.com5.id; // Jueves 09:00 - 13:00
    const aulaId = fixtures.aulas.aulaA1.id;

    // Forzar el estado de CONFLICTO insertando las asignaciones
    await query(
      "INSERT INTO asignacion (estado, es_manual, comision_id, aula_id) VALUES ('CONFLICTO', true, $1, $2)",
      [com4Id, aulaId]
    );
    await query(
      "INSERT INTO asignacion (estado, es_manual, comision_id, aula_id) VALUES ('CONFLICTO', true, $1, $2)",
      [com5Id, aulaId]
    );

    // Ejecutar el endpoint a probar
    const response = await request(app)
      .get('/api/conflictos')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.length).toBeGreaterThanOrEqual(2);

    const asigConflicto = response.body.find(a => a.comision_id === com4Id || a.comision_id === com5Id);
    expect(asigConflicto).toBeDefined();
    expect(asigConflicto.horario).toBeDefined();
    expect(typeof asigConflicto.horario).toBe('string');
    // Para com4 o com5, la banda es Jueves. Las 2 primeras letras extraídas por LEFT() son 'JU'
    expect(asigConflicto.horario).toContain('JU ');
  });
});
