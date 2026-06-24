'use strict';

/**
 * Middleware de autorización por rol.
 *
 * Roles del sistema (doc fuente, sección 10.4):
 *   COORDINADOR   → acceso total
 *   ADMINISTRATIVO → acceso operativo limitado a su propia UA
 *
 * Uso en rutas:
 *   router.get('/ruta', authenticate, authorize(['COORDINADOR']), handler)
 *   router.get('/ruta', authenticate, authorize(['COORDINADOR', 'ADMINISTRATIVO']), handler)
 *
 * Nota: el filtro automático por unidadAcademicaId para ADMINISTRATIVO
 * NO se aplica aquí — es responsabilidad de cada service leer req.user.
 *
 * @param {string[]} rolesPermitidos
 */
module.exports = function authorize(rolesPermitidos) {
  return (req, res, next) => {
    if (!req.user || !rolesPermitidos.includes(req.user.rol)) {
      return res.status(403).json({
        error: `Acceso denegado. Se requiere uno de los roles: ${rolesPermitidos.join(', ')}`,
      });
    }
    next();
  };
};
