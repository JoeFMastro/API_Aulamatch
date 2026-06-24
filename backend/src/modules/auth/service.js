'use strict';

/**
 * auth/service.js
 * Lógica de negocio de autenticación.
 *
 * Responsabilidades:
 *   - Consultar la tabla `usuario` para validar credenciales
 *   - Comparar contraseña con bcrypt
 *   - Firmar y devolver el JWT con el payload especificado
 *
 * Payload JWT (estructura_jwt — sección 10.4):
 *   { sub, nombre, rol, unidadAcademicaId, iat, exp }
 *
 * Roles válidos: COORDINADOR | ADMINISTRATIVO
 */

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { query } = require('../../config/db');

// ─────────────────────────────────────────────────────────────
// Helpers privados
// ─────────────────────────────────────────────────────────────

/**
 * Busca un usuario activo por email.
 * @param {string} email
 * @returns {Promise<object|null>}
 */
async function findUserByEmail(email) {
  const result = await query(
    `SELECT id, nombre, email, password_hash, rol, unidad_academica_id
       FROM usuario
      WHERE email = $1
        AND activo = TRUE
      LIMIT 1`,
    [email]
  );
  return result.rows[0] ?? null;
}

/**
 * Construye el payload del JWT según la especificación (estructura_jwt).
 * No se agregan campos más allá de lo especificado.
 * @param {object} user  Fila de la tabla usuario
 * @returns {object}
 */
function buildJwtPayload(user) {
  return {
    sub:               user.id,
    nombre:            user.nombre,
    rol:               user.rol,
    unidadAcademicaId: user.unidad_academica_id ?? null,
  };
}

// ─────────────────────────────────────────────────────────────
// Servicios exportados
// ─────────────────────────────────────────────────────────────

/**
 * Valida credenciales y genera un JWT firmado.
 *
 * Estrategia de respuesta:
 *   - Se devuelve el mismo error "Credenciales inválidas" tanto si el
 *     email no existe como si la contraseña es incorrecta.
 *     Esto evita la enumeración de usuarios (user enumeration attack).
 *
 * @param {string} email
 * @param {string} password  Contraseña en claro
 * @returns {Promise<{ token: string, usuario: object }>}
 * @throws {{ status: number, message: string }}
 */
async function login(email, password) {
  if (!email || !password) {
    const err = new Error('Email y contraseña son requeridos');
    err.status = 400;
    throw err;
  }

  const user = await findUserByEmail(email.toLowerCase().trim());

  const credentialsError = () => {
    const err = new Error('Credenciales inválidas');
    err.status = 401;
    return err;
  };

  if (!user) throw credentialsError();

  const passwordOk = await bcrypt.compare(password, user.password_hash);
  if (!passwordOk) throw credentialsError();

  const payload = buildJwtPayload(user);

  const token = jwt.sign(
    payload,
    process.env.JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    }
  );

  return {
    token,
    usuario: {
      id:                user.id,
      nombre:            user.nombre,
      email:             user.email,
      rol:               user.rol,
      unidadAcademicaId: user.unidad_academica_id ?? null,
    },
  };
}

module.exports = { login };
