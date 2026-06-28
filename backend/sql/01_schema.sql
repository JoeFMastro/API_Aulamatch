-- =============================================================
-- AulaMatch — Esquema inicial de base de datos
-- Fuente: Actividad4_Joel_Mastroiaco_Completo.pdf — Sección 8
-- PostgreSQL 16
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- 0. LIMPIEZA (para re-ejecuciones seguras en desarrollo)
-- ─────────────────────────────────────────────────────────────
DROP TABLE IF EXISTS asignacion      CASCADE;
DROP TABLE IF EXISTS banda_horaria   CASCADE;
DROP TABLE IF EXISTS comision        CASCADE;
DROP TABLE IF EXISTS carrera_materia CASCADE;
DROP TABLE IF EXISTS materia         CASCADE;
DROP TABLE IF EXISTS carrera         CASCADE;
DROP TABLE IF EXISTS docente         CASCADE;
DROP TABLE IF EXISTS aula            CASCADE;
DROP TABLE IF EXISTS edificio        CASCADE;
DROP TABLE IF EXISTS unidad_academica CASCADE;

DROP TYPE IF EXISTS tipo_aula          CASCADE;
DROP TYPE IF EXISTS modalidad          CASCADE;
DROP TYPE IF EXISTS turno              CASCADE;
DROP TYPE IF EXISTS dia_semana         CASCADE;
DROP TYPE IF EXISTS estado_asignacion  CASCADE;
DROP TYPE IF EXISTS tipo_clase         CASCADE;

-- ─────────────────────────────────────────────────────────────
-- 1. ENUMERACIONES CONTROLADAS (Sección 8.1)
-- ─────────────────────────────────────────────────────────────

CREATE TYPE tipo_aula AS ENUM (
    'AULA',
    'LABORATORIO',
    'AUDITORIO',
    'SALA_VIDEOCONFERENCIA'
);

CREATE TYPE modalidad AS ENUM (
    'PRESENCIAL',
    'VIRTUAL',
    'HIBRIDA'
);

CREATE TYPE turno AS ENUM (
    'MANANA',
    'TARDE',
    'NOCHE'
);

CREATE TYPE dia_semana AS ENUM (
    'LUNES',
    'MARTES',
    'MIERCOLES',
    'JUEVES',
    'VIERNES',
    'SABADO'
);

CREATE TYPE estado_asignacion AS ENUM (
    'PENDIENTE',
    'ASIGNADA',
    'CONFLICTO'
);

CREATE TYPE tipo_clase AS ENUM (
    'TEORICA',
    'PRACTICA',
    'TEORICO_PRACTICA'
);

-- ─────────────────────────────────────────────────────────────
-- 2. TABLAS (orden respeta dependencias de FK)
-- ─────────────────────────────────────────────────────────────

-- 2.1 edificio
-- (creado antes que unidad_academica para resolver la referencia circular)
CREATE TABLE edificio (
    id        SERIAL       PRIMARY KEY,
    nombre    VARCHAR(100) NOT NULL,
    direccion VARCHAR(200) NOT NULL
);

-- 2.2 unidad_academica
-- Nota: edificio_preferencia_id es NULLABLE (una UA puede no tener preferencia)
CREATE TABLE unidad_academica (
    id                      SERIAL       PRIMARY KEY,
    nombre                  VARCHAR(120) NOT NULL UNIQUE,
    edificio_preferencia_id INTEGER      REFERENCES edificio(id)
                                         ON DELETE SET NULL
                                         ON UPDATE CASCADE
);

-- 2.3 aula
CREATE TABLE aula (
    id          SERIAL      PRIMARY KEY,
    numero      VARCHAR(20) NOT NULL,
    capacidad   INTEGER     NOT NULL CHECK (capacidad > 0),
    tipo        tipo_aula   NOT NULL,
    edificio_id INTEGER     NOT NULL REFERENCES edificio(id)
                                     ON DELETE RESTRICT
                                     ON UPDATE CASCADE
);

CREATE INDEX idx_aula_edificio          ON aula (edificio_id);
CREATE INDEX idx_aula_tipo_capacidad    ON aula (tipo, capacidad);

-- 2.4 carrera
CREATE TABLE carrera (
    id                   SERIAL       PRIMARY KEY,
    nombre               VARCHAR(120) NOT NULL,
    codigo               VARCHAR(20)  NOT NULL UNIQUE,
    unidad_academica_id  INTEGER      NOT NULL REFERENCES unidad_academica(id)
                                               ON DELETE RESTRICT
                                               ON UPDATE CASCADE
);

-- 2.5 materia
CREATE TABLE materia (
    id                  SERIAL       PRIMARY KEY,
    nombre              VARCHAR(120) NOT NULL,
    codigo              VARCHAR(20)  NOT NULL UNIQUE,
    unidad_academica_id INTEGER      NOT NULL REFERENCES unidad_academica(id)
                                              ON DELETE RESTRICT
                                              ON UPDATE CASCADE
);

-- 2.6 carrera_materia (tabla de unión M:N — Sección 5.1, decisión 6)
CREATE TABLE carrera_materia (
    carrera_id INTEGER NOT NULL REFERENCES carrera(id)
                               ON DELETE CASCADE
                               ON UPDATE CASCADE,
    materia_id INTEGER NOT NULL REFERENCES materia(id)
                               ON DELETE CASCADE
                               ON UPDATE CASCADE,
    PRIMARY KEY (carrera_id, materia_id)
);

CREATE INDEX idx_carrera_materia_materia ON carrera_materia (materia_id);

-- 2.7 docente
CREATE TABLE docente (
    id       SERIAL       PRIMARY KEY,
    nombre   VARCHAR(80)  NOT NULL,
    apellido VARCHAR(80)  NOT NULL,
    cargo    VARCHAR(100)             -- NULLABLE según documento fuente
);

-- 2.8 comision
CREATE TABLE comision (
    id           SERIAL      PRIMARY KEY,
    codigo       VARCHAR(30) NOT NULL UNIQUE,
    cupo         INTEGER     NOT NULL CHECK (cupo > 0),
    inscriptos   INTEGER     NOT NULL DEFAULT 0,
    modalidad    modalidad   NOT NULL,
    turno        turno       NOT NULL,
    cuatrimestre SMALLINT    NOT NULL CHECK (cuatrimestre IN (1, 2)),
    anio         SMALLINT    NOT NULL,
    materia_id   INTEGER     NOT NULL REFERENCES materia(id)
                                      ON DELETE RESTRICT
                                      ON UPDATE CASCADE,
    docente_id   INTEGER     NOT NULL REFERENCES docente(id)
                                      ON DELETE RESTRICT
                                      ON UPDATE CASCADE
);

CREATE INDEX idx_comision_materia ON comision (materia_id);
CREATE INDEX idx_comision_periodo ON comision (anio, cuatrimestre);

-- 2.9 banda_horaria
CREATE TABLE banda_horaria (
    id          SERIAL     PRIMARY KEY,
    dia         dia_semana NOT NULL,
    hora_inicio TIME       NOT NULL,
    hora_fin    TIME       NOT NULL CHECK (hora_fin > hora_inicio),
    tipo_clase  tipo_clase NOT NULL,
    comision_id INTEGER    NOT NULL REFERENCES comision(id)
                                    ON DELETE CASCADE
                                    ON UPDATE CASCADE
);

CREATE INDEX idx_banda_comision ON banda_horaria (comision_id);

-- 2.10 asignacion
CREATE TABLE asignacion (
    id               SERIAL            PRIMARY KEY,
    estado           estado_asignacion NOT NULL DEFAULT 'PENDIENTE',
    fecha_asignacion TIMESTAMP         NOT NULL DEFAULT NOW(),
    es_manual        BOOLEAN           NOT NULL DEFAULT FALSE,
    comision_id      INTEGER           NOT NULL REFERENCES comision(id)
                                                ON DELETE RESTRICT
                                                ON UPDATE CASCADE,
    aula_id          INTEGER           NOT NULL REFERENCES aula(id)
                                                ON DELETE RESTRICT
                                                ON UPDATE CASCADE
);

CREATE INDEX idx_asignacion_comision        ON asignacion (comision_id);
CREATE INDEX idx_asignacion_aula_estado     ON asignacion (aula_id, estado);
CREATE INDEX idx_asignacion_estado          ON asignacion (estado);

-- ─────────────────────────────────────────────────────────────
-- 3. NOTAS DE IMPLEMENTACIÓN
-- ─────────────────────────────────────────────────────────────
-- [AMBIGÜEDAD SEÑALADA]
-- La tabla `usuario` (para autenticación con JWT, sección 10.4)
-- no está definida en la sección 8. Será necesario crearla en
-- una migración posterior (02_auth.sql) cuando se implemente el
-- módulo auth. Campos mínimos anticipados: id, email, password_hash,
-- rol (COORDINADOR | ADMINISTRATIVO), unidad_academica_id.
--
-- [REFERENCIA CIRCULAR RESUELTA]
-- unidad_academica.edificio_preferencia_id → edificio(id)
-- Se resuelve creando `edificio` antes que `unidad_academica`.
-- No se usó ALTER TABLE diferido para mantener compatibilidad total.
-- =============================================================
