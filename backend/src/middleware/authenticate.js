/**
 * middleware/authenticate.js
 * Verifica la firma y vigencia del JWT en el header Authorization.
 *
 * Flujo esperado:
 *   1. Extraer token de: Authorization: Bearer <token>
 *   2. Verificar con jwt.verify(token, process.env.JWT_SECRET)
 *   3. Si válido → adjuntar payload a req.user y llamar next()
 *   4. Si inválido/expirado → responder 401 Unauthorized
 *
 * Payload esperado (sección 10.4):
 *   { sub, nombre, rol, unidadAcademicaId, iat, exp }
 *
 * TODO: instalar dependencia → npm install jsonwebtoken
 */
'use strict';

// const jwt = require('jsonwebtoken');
// 
// module.exports = (req, res, next) => {
//   const authHeader = req.headers['authorization'];
//   if (!authHeader?.startsWith('Bearer ')) {
//     return res.status(401).json({ error: 'Token no proporcionado' });
//   }
//   const token = authHeader.slice(7);
//   try {
//     req.user = jwt.verify(token, process.env.JWT_SECRET);
//     next();
//   } catch {
//     res.status(401).json({ error: 'Token inválido o expirado' });
//   }
// };
