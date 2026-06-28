'use strict';

const express      = require('express');
const cors         = require('cors');
const morgan       = require('morgan');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// ── Middlewares globales ───────────────────────────────────────
// Configuración dinámica de CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS;
if (allowedOrigins) {
  const originsArray = allowedOrigins.split(',').map(o => o.trim());
  app.use(cors({
    origin: (origin, callback) => {
      // Permitir peticiones sin origen (como curl o tests)
      if (!origin) return callback(null, true);
      if (originsArray.includes(origin) || originsArray.includes('*')) {
        return callback(null, true);
      }
      return callback(new Error('Bloqueado por CORS: Origen no permitido'));
    },
    credentials: true
  }));
} else {
  console.warn('[CORS] ADVERTENCIA: ALLOWED_ORIGINS no está definida. CORS está abierto a cualquier origen (*).');
  app.use(cors());
}
app.use(morgan('dev'));
app.use(express.json());

// ── Health check (público) ────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  try {
    const { query } = require('./config/db');
    await query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

// ── Módulos ───────────────────────────────────────────────────
app.use('/api/auth', require('./modules/auth/routes'));
app.use('/api',      require('./modules/aulas/routes'));

app.use('/api', require('./modules/academico/routes'));

app.use('/api/asignaciones', require('./modules/asignaciones/routes'));
app.use('/api/conflictos',   require('./modules/conflictos/routes'));

// Módulos pendientes de implementación:
// app.use('/api/reportes',     require('./modules/reportes/routes'));

// ── Error handler (siempre al final) ─────────────────────────
app.use(errorHandler);

module.exports = app;

