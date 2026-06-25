'use strict';

const path = require('path');
// Cargar variables de entorno de test antes de requerir la app
require('dotenv').config({ path: path.resolve(__dirname, '../.env.test') });

const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/db');
const { resetDbAndSeed } = require('./fixtures');
const jwt = require('jsonwebtoken');

describe('Módulo de Autenticación y Autorización (Auth)', () => {
  beforeEach(async () => {
    // Reiniciar y poblar la base de datos de test antes de cada test
    await resetDbAndSeed();
  });

  afterAll(async () => {
    // Cerrar el pool de conexiones al terminar todas las pruebas de este archivo
    await pool.end();
  });

  describe('POST /api/auth/login', () => {
    it('debería autenticar correctamente con credenciales válidas y devolver un JWT estructurado', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'coordinador_test@aulamatch.edu',
          password: 'TestPassword123!',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('usuario');
      expect(response.body.usuario.email).toBe('coordinador_test@aulamatch.edu');
      expect(response.body.usuario.rol).toBe('COORDINADOR');

      // Verificar la estructura y firma del JWT retornado
      const decoded = jwt.verify(response.body.token, process.env.JWT_SECRET);
      expect(decoded).toHaveProperty('sub');
      expect(decoded).toHaveProperty('nombre');
      expect(decoded).toHaveProperty('rol');
      expect(decoded).toHaveProperty('unidadAcademicaId');
      expect(decoded.rol).toBe('COORDINADOR');
      expect(decoded.unidadAcademicaId).toBeNull();
    });

    it('debería fallar con HTTP 401 para credenciales inválidas (usuario inexistente)', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'inexistente@aulamatch.edu',
          password: 'TestPassword123!',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      // Debe evitar dar detalles de cuál campo falló (para seguridad)
      expect(response.body.error).toBe('Credenciales inválidas');
    });

    it('debería fallar con HTTP 401 para credenciales inválidas (contraseña incorrecta)', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'coordinador_test@aulamatch.edu',
          password: 'ContrasenaIncorrecta123',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Credenciales inválidas');
    });
  });

  describe('Protección de rutas por JWT', () => {
    it('debería bloquear con HTTP 401 el acceso a una ruta protegida si no se proporciona token', async () => {
      const response = await request(app)
        .get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Autenticación requerida');
    });

    it('debería bloquear con HTTP 401 el acceso a una ruta protegida si el token es inválido', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer token_invalido_123456');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Token inválido');
    });
  });

  describe('Protección de rutas por Rol', () => {
    it('debería permitir al COORDINADOR acceder a endpoints exclusivos de coordinador', async () => {
      // Iniciar sesión como COORDINADOR
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'coordinador_test@aulamatch.edu',
          password: 'TestPassword123!',
        });
      
      const token = loginResponse.body.token;

      // DELETE /api/asignaciones/:id es exclusivo de COORDINADOR
      // Intentamos eliminar una asignación inexistente (debería retornar 404, pero NO 403)
      const response = await request(app)
        .delete('/api/asignaciones/999')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body.error).not.toContain('Acceso denegado');
    });

    it('debería bloquear con HTTP 403 al ADMINISTRATIVO que intente acceder a endpoints exclusivos de coordinador', async () => {
      // Iniciar sesión como ADMINISTRATIVO
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin_test@aulamatch.edu',
          password: 'TestPassword123!',
        });
      
      const token = loginResponse.body.token;

      // DELETE /api/asignaciones/:id es exclusivo de COORDINADOR
      const response = await request(app)
        .delete('/api/asignaciones/999')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Acceso denegado. Se requiere uno de los roles: COORDINADOR');
    });
  });
});
