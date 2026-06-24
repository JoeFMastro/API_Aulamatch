/**
 * auth/service.js
 * Lógica de negocio de autenticación
 * TODO: verificar usuario en tabla `usuario` (migración 02_auth.sql)
 * TODO: comparar password_hash con bcrypt
 * TODO: firmar JWT con { sub, nombre, rol, unidadAcademicaId, exp }
 *
 * Estructura del payload JWT (doc fuente, sección 10.4):
 * { sub, nombre, rol, unidadAcademicaId, iat, exp }
 *
 * Roles válidos: COORDINADOR | ADMINISTRATIVO
 */
'use strict';
