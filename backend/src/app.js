/**
 * app.js — Punto de entrada de la aplicación Express
 * AulaMatch API
 *
 * Responsabilidades:
 *  - Instanciar Express y configurar middlewares globales
 *  - Montar los routers de cada módulo bajo /api
 *  - Registrar el middleware global de manejo de errores
 *
 * TODO (implementar en etapas posteriores):
 *  - Importar y montar módulos: auth, aulas, academico,
 *    asignaciones, conflictos, reportes
 *  - Configurar CORS, helmet, morgan, express.json()
 */

'use strict';

const express = require('express');

const app = express();

// ── Middlewares globales ────────────────────────────────────
app.use(express.json());

// ── Health check (público, sin autenticación) ───────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Routers de módulos (se montan aquí) ─────────────────────
// app.use('/api/auth',               require('./modules/auth/routes'));
// app.use('/api/edificios',          require('./modules/aulas/routes'));
// app.use('/api/aulas',              require('./modules/aulas/routes'));
// app.use('/api',                    require('./modules/academico/routes'));
// app.use('/api/asignaciones',       require('./modules/asignaciones/routes'));
// app.use('/api/conflictos',         require('./modules/conflictos/routes'));
// app.use('/api/reportes',           require('./modules/reportes/routes'));

// ── Middleware de errores (siempre al final) ─────────────────
// app.use(require('./middleware/errorHandler'));

module.exports = app;
