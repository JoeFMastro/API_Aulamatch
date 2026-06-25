'use strict';

const path = require('path');
// Cargar variables de entorno de test antes de requerir la app
require('dotenv').config({ path: path.resolve(__dirname, '../.env.test') });

const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/db');
const { resetDbAndSeed } = require('./fixtures');

describe('Módulo de Asignaciones (Motor Automático)', () => {
  let token;
  let fixtures;

  beforeAll(async () => {
    // Inicializar DB por primera vez
    fixtures = await resetDbAndSeed();

    // Obtener token de COORDINADOR para las peticiones del motor
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'coordinador_test@aulamatch.edu',
        password: 'TestPassword123!',
      });
    token = loginResponse.body.token;
  });

  beforeEach(async () => {
    // Limpiar y resetear base de datos para cada test para asegurar aislamiento
    fixtures = await resetDbAndSeed();
  });

  afterAll(async () => {
    await pool.end();
  });

  describe('POST /api/asignaciones/automatica', () => {
    it('Caso Feliz: comisión con cupo y horario compatibles se asigna con estado ASIGNADA y esManual=false', async () => {
      // Ejecutar motor automático para el período de los fixtures (2026, cuatrimestre 1)
      const response = await request(app)
        .post('/api/asignaciones/automatica')
        .set('Authorization', `Bearer ${token}`)
        .send({
          anio: 2026,
          cuatrimestre: 1,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('resumen');
      expect(response.body.resumen).toHaveProperty('total');
      expect(response.body.resumen).toHaveProperty('asignadas');
      expect(response.body.resumen).toHaveProperty('fallidas');

      // Buscar la asignación de la comisión 'C1_HAPPY'
      const asignadas = response.body.asignadas;
      const happyAsig = asignadas.find(a => a.comision_codigo === 'C1_HAPPY');

      expect(happyAsig).toBeDefined();
      expect(happyAsig.estado).toBe('ASIGNADA');
      expect(happyAsig.es_manual).toBe(false);

      // Verificar que el aula elegida tiene capacidad >= inscriptos
      // C1_HAPPY tiene 25 inscriptos, y debería asignarse a Aula A1 (capacidad 40)
      expect(happyAsig.aula_numero).toBe('A101');
      expect(happyAsig.aula_tipo).toBe('AULA');
    });

    it('Caso Prioridad por Edificio Preferido: elige el aula en edificio preferido ante múltiples opciones compatibles', async () => {
      // C1_HAPPY (inscriptos: 25) es compatible con Aula A1 (Edif A, cap 40) y Aula B1 (Edif B, cap 50).
      // La UA prefiere Edificio A, por lo tanto el motor debe elegir Aula A1.
      const response = await request(app)
        .post('/api/asignaciones/automatica')
        .set('Authorization', `Bearer ${token}`)
        .send({
          anio: 2026,
          cuatrimestre: 1,
        });

      expect(response.status).toBe(200);
      const asignadas = response.body.asignadas;
      const happyAsig = asignadas.find(a => a.comision_codigo === 'C1_HAPPY');

      expect(happyAsig).toBeDefined();
      // Aula A101 está en Edificio A (preferido)
      expect(happyAsig.aula_numero).toBe('A101');
    });

    it('Caso Sin Aula Disponible: una comisión que excede la capacidad de todas las aulas queda registrada como fallida sin romper el lote', async () => {
      // C3_SIN_AULA tiene 120 inscriptos. La capacidad máxima de nuestras aulas es 100 (Aula A2).
      // Debe terminar en las asignaciones fallidas/pendientes del resumen.
      const response = await request(app)
        .post('/api/asignaciones/automatica')
        .set('Authorization', `Bearer ${token}`)
        .send({
          anio: 2026,
          cuatrimestre: 1,
        });

      expect(response.status).toBe(200);
      
      const pendientes = response.body.pendientes;
      const sinAulaPend = pendientes.find(p => p.comision_codigo === 'C3_SIN_AULA');

      expect(sinAulaPend).toBeDefined();
      expect(sinAulaPend.motivo).toBe('SIN_AULA_DISPONIBLE');
      expect(sinAulaPend.tipo_aula_requerido).toBe('AUDITORIO');

      // Verificar que el fallo no interrumpió el resto del lote (resumen correcto)
      // De las comisiones del periodo (HAPPY, AUDITORIO, SIN_AULA, SOLAPE_1, SOLAPE_2, CUPO_EXC, VIRTUAL, LAB)
      // Deberían asignarse la mayoría, excepto la de 120 inscriptos (C3_SIN_AULA).
      expect(response.body.resumen.fallidas).toBeGreaterThanOrEqual(1);
      expect(response.body.resumen.asignadas).toBeGreaterThan(0);
    });

    it('Caso de No Duplicación: ejecutar /automatica dos veces sobre el mismo período no duplica asignaciones', async () => {
      // Primera ejecución
      const firstResponse = await request(app)
        .post('/api/asignaciones/automatica')
        .set('Authorization', `Bearer ${token}`)
        .send({
          anio: 2026,
          cuatrimestre: 1,
        });

      expect(firstResponse.status).toBe(200);
      const totalAsignadasFirst = firstResponse.body.resumen.asignadas;

      // Segunda ejecución consecutiva
      const secondResponse = await request(app)
        .post('/api/asignaciones/automatica')
        .set('Authorization', `Bearer ${token}`)
        .send({
          anio: 2026,
          cuatrimestre: 1,
        });

      expect(secondResponse.status).toBe(200);
      // En la segunda corrida, como todas las comisiones compatibles del período ya fueron asignadas,
      // la cantidad de comisiones a procesar debería ser 0 y el resumen debe reflejar que no se asignó nada nuevo.
      expect(secondResponse.body.resumen.asignadas).toBe(0);
    });
  });
});
