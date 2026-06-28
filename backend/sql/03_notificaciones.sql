-- =============================================================
-- AulaMatch — Migración 03: Tabla de notificaciones de conflictos
-- =============================================================
-- DECISIÓN DOCUMENTADA — Almacenamiento de notificaciones:
--
-- El esquema original (01_schema.sql) no define tabla de notificaciones.
-- Se eligió crear una tabla `notificacion` liviana en lugar de usar logs
-- estructurados (stdout/archivo) por las siguientes razones:
--
--   1. TRAZABILIDAD: los logs de proceso se rotan y pierden. Una tabla
--      permite consultar el historial completo de notificaciones por
--      asignación, incluso semanas después.
--   2. ENDPOINT DE MÉTRICAS: GET /api/conflictos/metricas puede incluir
--      "notificaciones no atendidas" sin parsear archivos de log.
--   3. RESOLUCIÓN DEL FLUJO: cuando un coordinador resuelve un conflicto,
--      es posible marcar las notificaciones asociadas como atendidas,
--      cerrando el ciclo auditable.
--   4. COSTO BAJO: el volumen de notificaciones es proporcional al número
--      de asignaciones con conflicto — no hay riesgo de tabla masiva.
--
-- Alternativa descartada: logs estructurados con Winston/Pino.
-- Motivo: no persisten entre reinicios del contenedor sin volumen dedicado,
-- y no ofrecen la consulta SQL que requieren las métricas del panel.
-- =============================================================

DROP TABLE IF EXISTS notificacion CASCADE;

CREATE TABLE notificacion (
    id              SERIAL        PRIMARY KEY,
    asignacion_id   INTEGER       NOT NULL REFERENCES asignacion(id)
                                           ON DELETE CASCADE
                                           ON UPDATE CASCADE,
    tipo_conflicto  VARCHAR(40)   NOT NULL,  -- 'SUPERPOSICION_HORARIA' | 'CUPO_EXCEDIDO'
    detalle         TEXT,                    -- descripción legible del conflicto detectado
    atendida        BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notificacion_asignacion ON notificacion (asignacion_id);
CREATE INDEX idx_notificacion_atendida   ON notificacion (atendida);
CREATE INDEX idx_notificacion_tipo       ON notificacion (tipo_conflicto);

-- =============================================================
-- NOTAS:
-- [1] tipo_conflicto es VARCHAR en lugar de ENUM porque puede
--     extenderse en el futuro sin migración de tipo.
-- [2] atendida=TRUE se marca cuando el coordinador resuelve el
--     conflicto vía PATCH /api/asignaciones/:id.
-- [3] ON DELETE CASCADE: si se elimina la asignación (DELETE),
--     sus notificaciones se eliminan en cascada (no quedan huérfanas).
-- =============================================================
