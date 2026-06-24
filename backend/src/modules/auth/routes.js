/**
 * auth/routes.js
 * Endpoints: POST /api/auth/login | POST /api/auth/logout | GET /api/auth/me
 * Acceso: login → público | logout/me → autenticado
 */
'use strict';
const { Router } = require('express');
// const { login, logout, me } = require('./controller');
// const authenticate = require('../../middleware/authenticate');

const router = Router();

// router.post('/login',  login);
// router.post('/logout', authenticate, logout);
// router.get('/me',      authenticate, me);

module.exports = router;
