'use strict';

const express      = require('express');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// ── Middlewares globales ───────────────────────────────────────
app.use(express.json());

// ── Health check (público) ────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  try {
    const { query } = require('./config/db');
    await query('SELECT 1');
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected', timestamp: new Date().toISOString() });
  }
});

// ── Módulos ───────────────────────────────────────────────────
app.use('/api', require('./modules/aulas/routes'));

// Módulos pendientes de implementación:
// app.use('/api/auth',         require('./modules/auth/routes'));
// app.use('/api',              require('./modules/academico/routes'));
// app.use('/api/asignaciones', require('./modules/asignaciones/routes'));
// app.use('/api/conflictos',   require('./modules/conflictos/routes'));
// app.use('/api/reportes',     require('./modules/reportes/routes'));

// ── Error handler (siempre al final) ─────────────────────────
app.use(errorHandler);

module.exports = app;
