/**
 * middleware/authorize.js
 * Valida que req.user.rol esté en la lista de roles permitidos.
 *
 * Roles del sistema (sección 10.4): COORDINADOR | ADMINISTRATIVO
 *
 * IMPORTANTE — filtro automático por UA:
 *   Si req.user.rol === 'ADMINISTRATIVO', las queries de service
 *   deben aplicar WHERE unidad_academica_id = req.user.unidadAcademicaId
 *   automáticamente. Este middleware NO lo hace; es responsabilidad
 *   de cada service leer req.user.
 *
 * Uso: authorize(['COORDINADOR', 'ADMINISTRATIVO'])
 */
'use strict';

// module.exports = (rolesPermitidos) => (req, res, next) => {
//   if (!rolesPermitidos.includes(req.user?.rol)) {
//     return res.status(403).json({ error: 'Acceso denegado: rol insuficiente' });
//   }
//   next();
// };
