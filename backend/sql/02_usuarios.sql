-- =============================================================
-- AulaMatch — Migración 02: Tabla de usuarios para autenticación
-- NOTA: Esta tabla NO forma parte de las 9 entidades de dominio
-- definidas en la sección 8 del documento fuente. Es infraestructura
-- de autenticación/autorización, independiente del modelo de negocio.
-- La tabla de dominio más cercana (docente) NO se mezcla con esta.
-- PostgreSQL 16
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- 0. TIPO ENUMERADO DE ROL
-- ─────────────────────────────────────────────────────────────
DROP TYPE IF EXISTS rol_usuario CASCADE;

CREATE TYPE rol_usuario AS ENUM (
    'COORDINADOR',
    'ADMINISTRATIVO'
);

-- ─────────────────────────────────────────────────────────────
-- 1. TABLA usuario
--
-- Campos:
--   id                  — PK auto-incremental
--   nombre              — nombre visible, incluido en el JWT
--   email               — login único (identificador de acceso)
--   password_hash       — hash bcrypt (cost 12)
--   rol                 — COORDINADOR | ADMINISTRATIVO
--   unidad_academica_id — FK opcional a unidad_academica;
--                         NULL para COORDINADOR (acceso total),
--                         obligatorio para ADMINISTRATIVO
--   activo              — soft-delete: FALSE desactiva el usuario
--                         sin borrar el registro
--   created_at          — auditoría de creación
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS usuario CASCADE;

CREATE TABLE usuario (
    id                  SERIAL       PRIMARY KEY,
    nombre              VARCHAR(120) NOT NULL,
    email               VARCHAR(150) NOT NULL UNIQUE,
    password_hash       VARCHAR(72)  NOT NULL,   -- bcrypt digest máx 72 chars efectivos
    rol                 rol_usuario  NOT NULL,
    unidad_academica_id INTEGER      REFERENCES unidad_academica(id)
                                     ON DELETE SET NULL
                                     ON UPDATE CASCADE,
    activo              BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    -- Garantizar que ADMINISTRATIVO siempre tenga UA asignada
    CONSTRAINT chk_administrativo_ua
        CHECK (
            rol = 'COORDINADOR'
            OR (rol = 'ADMINISTRATIVO' AND unidad_academica_id IS NOT NULL)
        )
);

CREATE INDEX idx_usuario_email  ON usuario (email);
CREATE INDEX idx_usuario_rol    ON usuario (rol);

-- ─────────────────────────────────────────────────────────────
-- 2. SEED MÍNIMO (solo para desarrollo/pruebas)
--
-- Contraseñas en texto plano aquí → hash generado con:
--   bcrypt.hashSync('Admin1234!', 12)
--   bcrypt.hashSync('Coord1234!', 12)
--
-- Los hashes a continuación son ejemplos pre-calculados.
-- Deben regenerarse si se cambian las contraseñas.
--
--   coordinador@aulamatch.edu  / Coord1234!
--   admin@aulamatch.edu        / Admin1234!
-- ─────────────────────────────────────────────────────────────

-- Insertar UA de prueba solo si no existe (para idempotencia)
INSERT INTO unidad_academica (nombre)
SELECT 'Facultad Regional Buenos Aires'
WHERE NOT EXISTS (
    SELECT 1 FROM unidad_academica WHERE nombre = 'Facultad Regional Buenos Aires'
);

-- Seed de usuarios (idempotente por ON CONFLICT)
INSERT INTO usuario (nombre, email, password_hash, rol, unidad_academica_id)
VALUES
  (
    'Coordinador General',
    'coordinador@aulamatch.edu',
    -- hash de: Coord1234!  (bcrypt, cost 12)
    '$2b$12$Ad6ofdvd9do2QIHmPuO2.OzTG51QbzNRFvIkgktLp5Tzk9iRErT3.',
    'COORDINADOR',
    NULL   -- COORDINADOR no requiere UA
  ),
  (
    'Administrativo FRBA',
    'admin@aulamatch.edu',
    -- hash de: Admin1234!  (bcrypt, cost 12)
    '$2b$12$6JhmNY6PRFjtOF9Ud6BIH.dBCPq2HPmps86yMjV5S0QpfXlmQ2p06',
    'ADMINISTRATIVO',
    (SELECT id FROM unidad_academica WHERE nombre = 'Facultad Regional Buenos Aires' LIMIT 1)
  )
ON CONFLICT (email) DO NOTHING;

-- =============================================================
-- NOTAS IMPORTANTES
-- =============================================================
-- [1] El campo password_hash almacena el output de bcrypt (60-72 chars).
--     Usar VARCHAR(72) es suficiente; nunca almacenar la contraseña en claro.
--
-- [2] Los hashes del seed son ejemplos. Para producción, regenerar con
--     el script scripts/generate-seed-hashes.js (ver README).
--
-- [3] Esta migración debe ejecutarse DESPUÉS de 01_schema.sql porque
--     referencia la tabla unidad_academica.
--
-- [4] El campo activo=FALSE permite deshabilitar usuarios sin eliminarlos,
--     preservando integridad referencial en tablas de auditoría futuras.
-- =============================================================
