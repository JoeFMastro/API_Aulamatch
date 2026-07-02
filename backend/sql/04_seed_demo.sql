-- =============================================================
-- AulaMatch — Migración 04: Seed de demostración
-- =============================================================
-- PROPÓSITO:
--   Poblar la base con datos realistas de UNSAM / FRBA para poder
--   demostrar todas las funcionalidades del sistema al evaluador:
--     ✓ Motor de asignación automática
--     ✓ Detección de conflictos (SUPERPOSICION_HORARIA + CUPO_EXCEDIDO)
--     ✓ Panel de asignaciones con filtros
--     ✓ Reportes JSON y CSV de asignaciones y disponibilidad
--
-- IDEMPOTENCIA:
--   Cada INSERT usa ON CONFLICT DO NOTHING o WHERE NOT EXISTS.
--   Correr este script dos veces no genera errores ni duplicados.
--
-- PREREQUISITOS:
--   01_schema.sql, 02_usuarios.sql y 03_notificaciones.sql ya aplicados.
--
-- APLICAR EN RENDER:
--   DATABASE_URL="postgresql://..." SEED_DEMO=true NODE_ENV=production npm run migrate
--
-- DATOS ASUMIDOS EXISTENTES (NO se recrean):
--   - unidad_academica id=1  → "Facultad Regional Buenos Aires" (FRBA)
--   - Los datos de edificios y aulas pre-existentes tienen ids variables
--     en producción; este seed referencia siempre por nombre, nunca
--     hardcodea IDs de esos objetos.
-- =============================================================


-- =============================================================
-- 1. EDIFICIOS
--    El edificio que ya existe en producción no se toca.
--    Agregamos 2 edificios más con nombres reales de FRBA/UNSAM.
-- =============================================================

INSERT INTO edificio (nombre, direccion)
SELECT 'Edificio Aulas Norte', 'Av. Medrano 951, CABA'
WHERE NOT EXISTS (
    SELECT 1 FROM edificio WHERE nombre = 'Edificio Aulas Norte'
);

INSERT INTO edificio (nombre, direccion)
SELECT 'Edificio Central de Ingeniería', 'Av. Medrano 951 – Pabellón Central, CABA'
WHERE NOT EXISTS (
    SELECT 1 FROM edificio WHERE nombre = 'Edificio Central de Ingeniería'
);

INSERT INTO edificio (nombre, direccion)
SELECT 'Edificio Laboratorios y Posgrado', 'Av. Medrano 951 – Pabellón Sur, CABA'
WHERE NOT EXISTS (
    SELECT 1 FROM edificio WHERE nombre = 'Edificio Laboratorios y Posgrado'
);


-- =============================================================
-- 2. AULAS
--    Distintos tipos y capacidades para que el motor automático
--    tenga candidatos variados. Referenciamos edificio por nombre.
-- =============================================================

-- Edificio Aulas Norte
INSERT INTO aula (numero, capacidad, tipo, edificio_id)
SELECT 'AN-101', 40, 'AULA', e.id
FROM edificio e WHERE e.nombre = 'Edificio Aulas Norte'
AND NOT EXISTS (
    SELECT 1 FROM aula WHERE numero = 'AN-101'
    AND edificio_id = (SELECT id FROM edificio WHERE nombre = 'Edificio Aulas Norte')
);

INSERT INTO aula (numero, capacidad, tipo, edificio_id)
SELECT 'AN-102', 30, 'AULA', e.id
FROM edificio e WHERE e.nombre = 'Edificio Aulas Norte'
AND NOT EXISTS (
    SELECT 1 FROM aula WHERE numero = 'AN-102'
    AND edificio_id = (SELECT id FROM edificio WHERE nombre = 'Edificio Aulas Norte')
);

INSERT INTO aula (numero, capacidad, tipo, edificio_id)
SELECT 'AN-201', 25, 'LABORATORIO', e.id
FROM edificio e WHERE e.nombre = 'Edificio Aulas Norte'
AND NOT EXISTS (
    SELECT 1 FROM aula WHERE numero = 'AN-201'
    AND edificio_id = (SELECT id FROM edificio WHERE nombre = 'Edificio Aulas Norte')
);

-- Edificio Central de Ingeniería
INSERT INTO aula (numero, capacidad, tipo, edificio_id)
SELECT 'CI-A01', 60, 'AULA', e.id
FROM edificio e WHERE e.nombre = 'Edificio Central de Ingeniería'
AND NOT EXISTS (
    SELECT 1 FROM aula WHERE numero = 'CI-A01'
    AND edificio_id = (SELECT id FROM edificio WHERE nombre = 'Edificio Central de Ingeniería')
);

INSERT INTO aula (numero, capacidad, tipo, edificio_id)
SELECT 'CI-A02', 50, 'AULA', e.id
FROM edificio e WHERE e.nombre = 'Edificio Central de Ingeniería'
AND NOT EXISTS (
    SELECT 1 FROM aula WHERE numero = 'CI-A02'
    AND edificio_id = (SELECT id FROM edificio WHERE nombre = 'Edificio Central de Ingeniería')
);

INSERT INTO aula (numero, capacidad, tipo, edificio_id)
SELECT 'CI-AUD', 100, 'AUDITORIO', e.id
FROM edificio e WHERE e.nombre = 'Edificio Central de Ingeniería'
AND NOT EXISTS (
    SELECT 1 FROM aula WHERE numero = 'CI-AUD'
    AND edificio_id = (SELECT id FROM edificio WHERE nombre = 'Edificio Central de Ingeniería')
);

-- Edificio Laboratorios y Posgrado
INSERT INTO aula (numero, capacidad, tipo, edificio_id)
SELECT 'LP-L01', 20, 'LABORATORIO', e.id
FROM edificio e WHERE e.nombre = 'Edificio Laboratorios y Posgrado'
AND NOT EXISTS (
    SELECT 1 FROM aula WHERE numero = 'LP-L01'
    AND edificio_id = (SELECT id FROM edificio WHERE nombre = 'Edificio Laboratorios y Posgrado')
);

INSERT INTO aula (numero, capacidad, tipo, edificio_id)
SELECT 'LP-L02', 30, 'LABORATORIO', e.id
FROM edificio e WHERE e.nombre = 'Edificio Laboratorios y Posgrado'
AND NOT EXISTS (
    SELECT 1 FROM aula WHERE numero = 'LP-L02'
    AND edificio_id = (SELECT id FROM edificio WHERE nombre = 'Edificio Laboratorios y Posgrado')
);

INSERT INTO aula (numero, capacidad, tipo, edificio_id)
SELECT 'LP-VC1', 15, 'SALA_VIDEOCONFERENCIA', e.id
FROM edificio e WHERE e.nombre = 'Edificio Laboratorios y Posgrado'
AND NOT EXISTS (
    SELECT 1 FROM aula WHERE numero = 'LP-VC1'
    AND edificio_id = (SELECT id FROM edificio WHERE nombre = 'Edificio Laboratorios y Posgrado')
);


-- =============================================================
-- 3. ACTUALIZAR EDIFICIO PREFERIDO DE LA UA
--    La FRBA (id=1) prefiere "Edificio Central de Ingeniería"
--    para que el motor de asignación automática lo priorice.
-- =============================================================

UPDATE unidad_academica
SET edificio_preferencia_id = (
    SELECT id FROM edificio WHERE nombre = 'Edificio Central de Ingeniería'
)
WHERE nombre = 'Facultad Regional Buenos Aires'
  AND edificio_preferencia_id IS NULL;
-- Nota: solo actualiza si aún no tiene preferencia definida.


-- =============================================================
-- 4. CARRERAS (asociadas a FRBA, id=1)
-- =============================================================

INSERT INTO carrera (nombre, codigo, unidad_academica_id)
SELECT 'Ingeniería en Sistemas de Información', 'IS-FRBA', 1
WHERE NOT EXISTS (SELECT 1 FROM carrera WHERE codigo = 'IS-FRBA');

INSERT INTO carrera (nombre, codigo, unidad_academica_id)
SELECT 'Licenciatura en Análisis de Sistemas', 'LAS-FRBA', 1
WHERE NOT EXISTS (SELECT 1 FROM carrera WHERE codigo = 'LAS-FRBA');

INSERT INTO carrera (nombre, codigo, unidad_academica_id)
SELECT 'Ingeniería Electrónica', 'IE-FRBA', 1
WHERE NOT EXISTS (SELECT 1 FROM carrera WHERE codigo = 'IE-FRBA');


-- =============================================================
-- 5. MATERIAS (asociadas a FRBA, id=1)
--    Dos materias pertenecen a múltiples carreras (M:N)
--    para demostrar los chips de carrera en la tabla de reportes.
-- =============================================================

INSERT INTO materia (nombre, codigo, unidad_academica_id)
SELECT 'Bases de Datos I', 'BD-101', 1
WHERE NOT EXISTS (SELECT 1 FROM materia WHERE codigo = 'BD-101');

INSERT INTO materia (nombre, codigo, unidad_academica_id)
SELECT 'Algoritmos y Estructuras de Datos', 'AED-201', 1
WHERE NOT EXISTS (SELECT 1 FROM materia WHERE codigo = 'AED-201');

INSERT INTO materia (nombre, codigo, unidad_academica_id)
SELECT 'Redes de Computadoras', 'RC-301', 1
WHERE NOT EXISTS (SELECT 1 FROM materia WHERE codigo = 'RC-301');

INSERT INTO materia (nombre, codigo, unidad_academica_id)
SELECT 'Arquitectura de Computadoras', 'AC-202', 1
WHERE NOT EXISTS (SELECT 1 FROM materia WHERE codigo = 'AC-202');

INSERT INTO materia (nombre, codigo, unidad_academica_id)
SELECT 'Ingeniería de Software', 'IS-401', 1
WHERE NOT EXISTS (SELECT 1 FROM materia WHERE codigo = 'IS-401');


-- =============================================================
-- 6. CARRERA_MATERIA (relaciones M:N)
--    BD-101   → IS-FRBA, LAS-FRBA           (2 carreras)
--    AED-201  → IS-FRBA, LAS-FRBA, IE-FRBA  (3 carreras)
--    RC-301   → IS-FRBA, IE-FRBA            (2 carreras)
--    AC-202   → IE-FRBA                     (1 carrera)
--    IS-401   → IS-FRBA, LAS-FRBA           (2 carreras)
-- =============================================================

INSERT INTO carrera_materia (carrera_id, materia_id)
SELECT c.id, m.id FROM carrera c, materia m
WHERE c.codigo = 'IS-FRBA' AND m.codigo = 'BD-101'
ON CONFLICT DO NOTHING;

INSERT INTO carrera_materia (carrera_id, materia_id)
SELECT c.id, m.id FROM carrera c, materia m
WHERE c.codigo = 'LAS-FRBA' AND m.codigo = 'BD-101'
ON CONFLICT DO NOTHING;

INSERT INTO carrera_materia (carrera_id, materia_id)
SELECT c.id, m.id FROM carrera c, materia m
WHERE c.codigo = 'IS-FRBA' AND m.codigo = 'AED-201'
ON CONFLICT DO NOTHING;

INSERT INTO carrera_materia (carrera_id, materia_id)
SELECT c.id, m.id FROM carrera c, materia m
WHERE c.codigo = 'LAS-FRBA' AND m.codigo = 'AED-201'
ON CONFLICT DO NOTHING;

INSERT INTO carrera_materia (carrera_id, materia_id)
SELECT c.id, m.id FROM carrera c, materia m
WHERE c.codigo = 'IE-FRBA' AND m.codigo = 'AED-201'
ON CONFLICT DO NOTHING;

INSERT INTO carrera_materia (carrera_id, materia_id)
SELECT c.id, m.id FROM carrera c, materia m
WHERE c.codigo = 'IS-FRBA' AND m.codigo = 'RC-301'
ON CONFLICT DO NOTHING;

INSERT INTO carrera_materia (carrera_id, materia_id)
SELECT c.id, m.id FROM carrera c, materia m
WHERE c.codigo = 'IE-FRBA' AND m.codigo = 'RC-301'
ON CONFLICT DO NOTHING;

INSERT INTO carrera_materia (carrera_id, materia_id)
SELECT c.id, m.id FROM carrera c, materia m
WHERE c.codigo = 'IE-FRBA' AND m.codigo = 'AC-202'
ON CONFLICT DO NOTHING;

INSERT INTO carrera_materia (carrera_id, materia_id)
SELECT c.id, m.id FROM carrera c, materia m
WHERE c.codigo = 'IS-FRBA' AND m.codigo = 'IS-401'
ON CONFLICT DO NOTHING;

INSERT INTO carrera_materia (carrera_id, materia_id)
SELECT c.id, m.id FROM carrera c, materia m
WHERE c.codigo = 'LAS-FRBA' AND m.codigo = 'IS-401'
ON CONFLICT DO NOTHING;


-- =============================================================
-- 7. DOCENTES
-- =============================================================

INSERT INTO docente (nombre, apellido, cargo)
SELECT 'Marcelo', 'Santángelo', 'Profesor Titular'
WHERE NOT EXISTS (SELECT 1 FROM docente WHERE apellido = 'Santángelo' AND nombre = 'Marcelo');

INSERT INTO docente (nombre, apellido, cargo)
SELECT 'Laura', 'Benítez', 'Profesora Adjunta'
WHERE NOT EXISTS (SELECT 1 FROM docente WHERE apellido = 'Benítez' AND nombre = 'Laura');

INSERT INTO docente (nombre, apellido, cargo)
SELECT 'Ricardo', 'Ferreyra', 'Jefe de Trabajos Prácticos'
WHERE NOT EXISTS (SELECT 1 FROM docente WHERE apellido = 'Ferreyra' AND nombre = 'Ricardo');

INSERT INTO docente (nombre, apellido, cargo)
SELECT 'Claudia', 'Miotti', 'Profesora Titular'
WHERE NOT EXISTS (SELECT 1 FROM docente WHERE apellido = 'Miotti' AND nombre = 'Claudia');


-- =============================================================
-- 8. COMISIONES  (anio=2025, cuatrimestre=1)
--
-- DISEÑO DE LOS CASOS:
--   COM-BD-M:   BD-101, mañana, PRESENCIAL, 45 inscriptos → motor asigna AULA CI-A01 (preferida)
--   COM-BD-T:   BD-101, tarde,  PRESENCIAL, 38 inscriptos → motor asigna AULA CI-A02 o AN-101
--   COM-AED-M:  AED-201, mañana, PRESENCIAL, 28 inscriptos, PRACTICA → motor asigna LABORATORIO
--   COM-RC-N:   RC-301, noche,  PRESENCIAL, 22 inscriptos → motor asigna AULA AN-102
--   COM-IS-V:   IS-401, mañana, VIRTUAL,    15 inscriptos → motor asigna SALA_VIDEOCONFERENCIA
--   COM-AC-T:   AC-202, tarde,  HIBRIDA,    82 inscriptos, TEORICA → motor asigna AUDITORIO (≥80)
--   COM-BD-C1:  BD-101, tarde,  PRESENCIAL, 35 inscriptos → pre-asignada en CONFLICTO (cupo excedido)
--   COM-AED-C2: AED-201, tarde, PRESENCIAL, 25 inscriptos → pre-asignada en CONFLICTO (superposición)
-- =============================================================

-- COM-BD-M: para motor automático (SIN asignación)
INSERT INTO comision (codigo, cupo, inscriptos, modalidad, turno, cuatrimestre, anio, materia_id, docente_id)
SELECT 'COM-BD-M-2025-1', 50, 45, 'PRESENCIAL', 'MANANA', 1, 2025,
       (SELECT id FROM materia WHERE codigo = 'BD-101'),
       (SELECT id FROM docente WHERE apellido = 'Santángelo')
WHERE NOT EXISTS (SELECT 1 FROM comision WHERE codigo = 'COM-BD-M-2025-1');

-- COM-BD-T: para motor automático (SIN asignación)
INSERT INTO comision (codigo, cupo, inscriptos, modalidad, turno, cuatrimestre, anio, materia_id, docente_id)
SELECT 'COM-BD-T-2025-1', 45, 38, 'PRESENCIAL', 'TARDE', 1, 2025,
       (SELECT id FROM materia WHERE codigo = 'BD-101'),
       (SELECT id FROM docente WHERE apellido = 'Benítez')
WHERE NOT EXISTS (SELECT 1 FROM comision WHERE codigo = 'COM-BD-T-2025-1');

-- COM-AED-M: PRACTICA → necesita LABORATORIO, para motor automático
INSERT INTO comision (codigo, cupo, inscriptos, modalidad, turno, cuatrimestre, anio, materia_id, docente_id)
SELECT 'COM-AED-M-2025-1', 30, 28, 'PRESENCIAL', 'MANANA', 1, 2025,
       (SELECT id FROM materia WHERE codigo = 'AED-201'),
       (SELECT id FROM docente WHERE apellido = 'Ferreyra')
WHERE NOT EXISTS (SELECT 1 FROM comision WHERE codigo = 'COM-AED-M-2025-1');

-- COM-RC-N: noche, para motor automático
INSERT INTO comision (codigo, cupo, inscriptos, modalidad, turno, cuatrimestre, anio, materia_id, docente_id)
SELECT 'COM-RC-N-2025-1', 25, 22, 'PRESENCIAL', 'NOCHE', 1, 2025,
       (SELECT id FROM materia WHERE codigo = 'RC-301'),
       (SELECT id FROM docente WHERE apellido = 'Santángelo')
WHERE NOT EXISTS (SELECT 1 FROM comision WHERE codigo = 'COM-RC-N-2025-1');

-- COM-IS-V: VIRTUAL → necesita SALA_VIDEOCONFERENCIA, para motor automático
INSERT INTO comision (codigo, cupo, inscriptos, modalidad, turno, cuatrimestre, anio, materia_id, docente_id)
SELECT 'COM-IS-V-2025-1', 20, 15, 'VIRTUAL', 'MANANA', 1, 2025,
       (SELECT id FROM materia WHERE codigo = 'IS-401'),
       (SELECT id FROM docente WHERE apellido = 'Miotti')
WHERE NOT EXISTS (SELECT 1 FROM comision WHERE codigo = 'COM-IS-V-2025-1');

-- COM-AC-T: HIBRIDA, 82 inscriptos, TEORICA → necesita AUDITORIO (≥80), para motor automático
INSERT INTO comision (codigo, cupo, inscriptos, modalidad, turno, cuatrimestre, anio, materia_id, docente_id)
SELECT 'COM-AC-T-2025-1', 90, 82, 'HIBRIDA', 'TARDE', 1, 2025,
       (SELECT id FROM materia WHERE codigo = 'AC-202'),
       (SELECT id FROM docente WHERE apellido = 'Benítez')
WHERE NOT EXISTS (SELECT 1 FROM comision WHERE codigo = 'COM-AC-T-2025-1');

-- COM-BD-C1: para conflicto CUPO_EXCEDIDO (se asigna manualmente en aula de 20 plazas)
--   Inscriptos=35, se asignará a LP-L02 (capacidad=30) → cupo excedido
INSERT INTO comision (codigo, cupo, inscriptos, modalidad, turno, cuatrimestre, anio, materia_id, docente_id)
SELECT 'COM-BD-C1-2025-1', 35, 35, 'PRESENCIAL', 'TARDE', 1, 2025,
       (SELECT id FROM materia WHERE codigo = 'BD-101'),
       (SELECT id FROM docente WHERE apellido = 'Ferreyra')
WHERE NOT EXISTS (SELECT 1 FROM comision WHERE codigo = 'COM-BD-C1-2025-1');

-- COM-AED-C2: para conflicto SUPERPOSICION_HORARIA
--   Misma franja que COM-AED-M pero asignada al mismo laboratorio AN-201
INSERT INTO comision (codigo, cupo, inscriptos, modalidad, turno, cuatrimestre, anio, materia_id, docente_id)
SELECT 'COM-AED-C2-2025-1', 25, 20, 'PRESENCIAL', 'MANANA', 1, 2025,
       (SELECT id FROM materia WHERE codigo = 'AED-201'),
       (SELECT id FROM docente WHERE apellido = 'Miotti')
WHERE NOT EXISTS (SELECT 1 FROM comision WHERE codigo = 'COM-AED-C2-2025-1');


-- =============================================================
-- 9. BANDAS HORARIAS
--
-- Franjas del día usadas:
--   MAÑANA:  08:00-10:00 / 10:00-12:00
--   TARDE:   14:00-16:00 / 16:00-18:00
--   NOCHE:   19:00-22:00
--
-- Solapamientos deliberados para detección de conflictos:
--   [SOLAPAMIENTO A] COM-BD-C1  y COM-AED-C2:
--     ambas tienen banda LUNES 08:00-10:00 y se asignarán
--     a la misma aula (AN-201) → SUPERPOSICION_HORARIA
--
-- La condición del motor: bh.hora_inicio < fin AND bh.hora_fin > inicio
-- Con 08:00-10:00 vs 08:00-10:00: 08:00 < 10:00 AND 10:00 > 08:00 → TRUE → solapamiento
-- =============================================================

-- COM-BD-M-2025-1: Lun + Mié 08:00-10:00, TEORICA
INSERT INTO banda_horaria (dia, hora_inicio, hora_fin, tipo_clase, comision_id)
SELECT 'LUNES', '08:00', '10:00', 'TEORICA',
       (SELECT id FROM comision WHERE codigo = 'COM-BD-M-2025-1')
WHERE NOT EXISTS (
    SELECT 1 FROM banda_horaria
    WHERE comision_id = (SELECT id FROM comision WHERE codigo = 'COM-BD-M-2025-1')
    AND dia = 'LUNES' AND hora_inicio = '08:00'
);

INSERT INTO banda_horaria (dia, hora_inicio, hora_fin, tipo_clase, comision_id)
SELECT 'MIERCOLES', '08:00', '10:00', 'TEORICA',
       (SELECT id FROM comision WHERE codigo = 'COM-BD-M-2025-1')
WHERE NOT EXISTS (
    SELECT 1 FROM banda_horaria
    WHERE comision_id = (SELECT id FROM comision WHERE codigo = 'COM-BD-M-2025-1')
    AND dia = 'MIERCOLES' AND hora_inicio = '08:00'
);

-- COM-BD-T-2025-1: Mar + Jue 14:00-16:00, TEORICA
INSERT INTO banda_horaria (dia, hora_inicio, hora_fin, tipo_clase, comision_id)
SELECT 'MARTES', '14:00', '16:00', 'TEORICA',
       (SELECT id FROM comision WHERE codigo = 'COM-BD-T-2025-1')
WHERE NOT EXISTS (
    SELECT 1 FROM banda_horaria
    WHERE comision_id = (SELECT id FROM comision WHERE codigo = 'COM-BD-T-2025-1')
    AND dia = 'MARTES' AND hora_inicio = '14:00'
);

INSERT INTO banda_horaria (dia, hora_inicio, hora_fin, tipo_clase, comision_id)
SELECT 'JUEVES', '14:00', '16:00', 'TEORICA',
       (SELECT id FROM comision WHERE codigo = 'COM-BD-T-2025-1')
WHERE NOT EXISTS (
    SELECT 1 FROM banda_horaria
    WHERE comision_id = (SELECT id FROM comision WHERE codigo = 'COM-BD-T-2025-1')
    AND dia = 'JUEVES' AND hora_inicio = '14:00'
);

-- COM-AED-M-2025-1: Lun 10:00-12:00 + Vie 10:00-12:00, PRACTICA
--   (Lun 10:00 no solapa con Lun 08:00-10:00 → tocan en extremo, OK)
INSERT INTO banda_horaria (dia, hora_inicio, hora_fin, tipo_clase, comision_id)
SELECT 'LUNES', '10:00', '12:00', 'PRACTICA',
       (SELECT id FROM comision WHERE codigo = 'COM-AED-M-2025-1')
WHERE NOT EXISTS (
    SELECT 1 FROM banda_horaria
    WHERE comision_id = (SELECT id FROM comision WHERE codigo = 'COM-AED-M-2025-1')
    AND dia = 'LUNES' AND hora_inicio = '10:00'
);

INSERT INTO banda_horaria (dia, hora_inicio, hora_fin, tipo_clase, comision_id)
SELECT 'VIERNES', '10:00', '12:00', 'PRACTICA',
       (SELECT id FROM comision WHERE codigo = 'COM-AED-M-2025-1')
WHERE NOT EXISTS (
    SELECT 1 FROM banda_horaria
    WHERE comision_id = (SELECT id FROM comision WHERE codigo = 'COM-AED-M-2025-1')
    AND dia = 'VIERNES' AND hora_inicio = '10:00'
);

-- COM-RC-N-2025-1: Lun + Mié 19:00-22:00, TEORICO_PRACTICA
INSERT INTO banda_horaria (dia, hora_inicio, hora_fin, tipo_clase, comision_id)
SELECT 'LUNES', '19:00', '22:00', 'TEORICO_PRACTICA',
       (SELECT id FROM comision WHERE codigo = 'COM-RC-N-2025-1')
WHERE NOT EXISTS (
    SELECT 1 FROM banda_horaria
    WHERE comision_id = (SELECT id FROM comision WHERE codigo = 'COM-RC-N-2025-1')
    AND dia = 'LUNES' AND hora_inicio = '19:00'
);

INSERT INTO banda_horaria (dia, hora_inicio, hora_fin, tipo_clase, comision_id)
SELECT 'MIERCOLES', '19:00', '22:00', 'TEORICO_PRACTICA',
       (SELECT id FROM comision WHERE codigo = 'COM-RC-N-2025-1')
WHERE NOT EXISTS (
    SELECT 1 FROM banda_horaria
    WHERE comision_id = (SELECT id FROM comision WHERE codigo = 'COM-RC-N-2025-1')
    AND dia = 'MIERCOLES' AND hora_inicio = '19:00'
);

-- COM-IS-V-2025-1: Mié 10:00-12:00, TEORICA (VIRTUAL → SALA_VIDEOCONFERENCIA)
INSERT INTO banda_horaria (dia, hora_inicio, hora_fin, tipo_clase, comision_id)
SELECT 'MIERCOLES', '10:00', '12:00', 'TEORICA',
       (SELECT id FROM comision WHERE codigo = 'COM-IS-V-2025-1')
WHERE NOT EXISTS (
    SELECT 1 FROM banda_horaria
    WHERE comision_id = (SELECT id FROM comision WHERE codigo = 'COM-IS-V-2025-1')
    AND dia = 'MIERCOLES' AND hora_inicio = '10:00'
);

-- COM-AC-T-2025-1: Mar + Jue 16:00-18:00, TEORICA (82 inscriptos → AUDITORIO)
INSERT INTO banda_horaria (dia, hora_inicio, hora_fin, tipo_clase, comision_id)
SELECT 'MARTES', '16:00', '18:00', 'TEORICA',
       (SELECT id FROM comision WHERE codigo = 'COM-AC-T-2025-1')
WHERE NOT EXISTS (
    SELECT 1 FROM banda_horaria
    WHERE comision_id = (SELECT id FROM comision WHERE codigo = 'COM-AC-T-2025-1')
    AND dia = 'MARTES' AND hora_inicio = '16:00'
);

INSERT INTO banda_horaria (dia, hora_inicio, hora_fin, tipo_clase, comision_id)
SELECT 'JUEVES', '16:00', '18:00', 'TEORICA',
       (SELECT id FROM comision WHERE codigo = 'COM-AC-T-2025-1')
WHERE NOT EXISTS (
    SELECT 1 FROM banda_horaria
    WHERE comision_id = (SELECT id FROM comision WHERE codigo = 'COM-AC-T-2025-1')
    AND dia = 'JUEVES' AND hora_inicio = '16:00'
);

-- COM-BD-C1-2025-1: Lun 14:00-16:00, TEORICA
--   Se asignará a LP-L02 (cap=30) con 35 inscriptos → CUPO_EXCEDIDO
INSERT INTO banda_horaria (dia, hora_inicio, hora_fin, tipo_clase, comision_id)
SELECT 'LUNES', '14:00', '16:00', 'TEORICA',
       (SELECT id FROM comision WHERE codigo = 'COM-BD-C1-2025-1')
WHERE NOT EXISTS (
    SELECT 1 FROM banda_horaria
    WHERE comision_id = (SELECT id FROM comision WHERE codigo = 'COM-BD-C1-2025-1')
    AND dia = 'LUNES' AND hora_inicio = '14:00'
);

-- ──────────────────────────────────────────────────────────────────────────
-- [SOLAPAMIENTO DELIBERADO A — SUPERPOSICION_HORARIA]
-- COM-AED-C2-2025-1: Lun 08:00-10:00, PRACTICA
--   Se asignará a aula AN-201.
--   COM-BD-C1 tiene banda LUNES 14:00-16:00 → no solapa con esta.
--   Pero: COM-BD-M también usa LUNES 08:00-10:00 en CI-A01/CI-A02.
--
--   La superposición REAL se produce así:
--   COM-AED-C2 (Lun 08:00-10:00) + COM-BD-M (Lun 08:00-10:00)
--   → ambas se asignarán a AN-201 (el seed pre-asigna COM-BD-M allí
--     y luego inserta COM-AED-C2 con estado=CONFLICTO + notificación)
-- ──────────────────────────────────────────────────────────────────────────
INSERT INTO banda_horaria (dia, hora_inicio, hora_fin, tipo_clase, comision_id)
SELECT 'LUNES', '08:00', '10:00', 'PRACTICA',
       (SELECT id FROM comision WHERE codigo = 'COM-AED-C2-2025-1')
WHERE NOT EXISTS (
    SELECT 1 FROM banda_horaria
    WHERE comision_id = (SELECT id FROM comision WHERE codigo = 'COM-AED-C2-2025-1')
    AND dia = 'LUNES' AND hora_inicio = '08:00'
);

INSERT INTO banda_horaria (dia, hora_inicio, hora_fin, tipo_clase, comision_id)
SELECT 'VIERNES', '08:00', '10:00', 'PRACTICA',
       (SELECT id FROM comision WHERE codigo = 'COM-AED-C2-2025-1')
WHERE NOT EXISTS (
    SELECT 1 FROM banda_horaria
    WHERE comision_id = (SELECT id FROM comision WHERE codigo = 'COM-AED-C2-2025-1')
    AND dia = 'VIERNES' AND hora_inicio = '08:00'
);


-- =============================================================
-- 10. ASIGNACIONES PRE-EXISTENTES
--
-- Escenario A — ASIGNADA limpia:
--   COM-BD-M → CI-A01  (estado=ASIGNADA, es_manual=false)
--   COM-BD-T → CI-A02  (estado=ASIGNADA, es_manual=false)
--
-- Escenario B — CONFLICTO por CUPO_EXCEDIDO:
--   COM-BD-C1 (35 inscriptos) → LP-L02 (capacidad=30)
--   Estado: CONFLICTO + notificación CUPO_EXCEDIDO
--
-- Escenario C — CONFLICTO por SUPERPOSICION_HORARIA:
--   COM-AED-C2 (Lun 08:00-10:00) → AN-201
--   COM-BD-M (Lun 08:00-10:00) también ocupa AN-201 pre-seed
--   → Para este caso: pre-asignamos COM-AED-C2 a AN-201 y
--     COM-BD-M a CI-A01. El motor al correr moverá COM-BD-M
--     a CI-A01 sin conflicto. El conflicto de C2 es el manual seed.
--   Estrategia limpia: insertamos COM-AED-C2 en AN-201 DESPUES de
--   insertar COM-BD-M en CI-A01, con CONFLICTO y notificación.
-- =============================================================

-- ── Escenario A: COM-BD-M → CI-A01 (ASIGNADA limpia) ──────────
INSERT INTO asignacion (estado, es_manual, comision_id, aula_id, fecha_asignacion)
SELECT 'ASIGNADA', false,
       (SELECT id FROM comision WHERE codigo = 'COM-BD-M-2025-1'),
       (SELECT id FROM aula WHERE numero = 'CI-A01'
        AND edificio_id = (SELECT id FROM edificio WHERE nombre = 'Edificio Central de Ingeniería')),
       NOW() - INTERVAL '2 days'
WHERE NOT EXISTS (
    SELECT 1 FROM asignacion
    WHERE comision_id = (SELECT id FROM comision WHERE codigo = 'COM-BD-M-2025-1')
    AND estado IN ('ASIGNADA', 'CONFLICTO')
);

-- ── Escenario A: COM-BD-T → CI-A02 (ASIGNADA limpia) ──────────
INSERT INTO asignacion (estado, es_manual, comision_id, aula_id, fecha_asignacion)
SELECT 'ASIGNADA', false,
       (SELECT id FROM comision WHERE codigo = 'COM-BD-T-2025-1'),
       (SELECT id FROM aula WHERE numero = 'CI-A02'
        AND edificio_id = (SELECT id FROM edificio WHERE nombre = 'Edificio Central de Ingeniería')),
       NOW() - INTERVAL '2 days'
WHERE NOT EXISTS (
    SELECT 1 FROM asignacion
    WHERE comision_id = (SELECT id FROM comision WHERE codigo = 'COM-BD-T-2025-1')
    AND estado IN ('ASIGNADA', 'CONFLICTO')
);

-- ── Escenario B: COM-BD-C1 → LP-L02 (CONFLICTO: CUPO_EXCEDIDO) ──
--   35 inscriptos en aula de cap=30. La asignación existe con estado CONFLICTO.
INSERT INTO asignacion (estado, es_manual, comision_id, aula_id, fecha_asignacion)
SELECT 'CONFLICTO', true,
       (SELECT id FROM comision WHERE codigo = 'COM-BD-C1-2025-1'),
       (SELECT id FROM aula WHERE numero = 'LP-L02'
        AND edificio_id = (SELECT id FROM edificio WHERE nombre = 'Edificio Laboratorios y Posgrado')),
       NOW() - INTERVAL '1 day'
WHERE NOT EXISTS (
    SELECT 1 FROM asignacion
    WHERE comision_id = (SELECT id FROM comision WHERE codigo = 'COM-BD-C1-2025-1')
    AND estado IN ('ASIGNADA', 'CONFLICTO')
);

-- Notificación correspondiente al CUPO_EXCEDIDO de COM-BD-C1
INSERT INTO notificacion (asignacion_id, tipo_conflicto, detalle, atendida)
SELECT
    (SELECT a.id FROM asignacion a
     JOIN comision c ON c.id = a.comision_id
     WHERE c.codigo = 'COM-BD-C1-2025-1'
     AND a.estado = 'CONFLICTO'
     LIMIT 1),
    'CUPO_EXCEDIDO',
    'Comisión COM-BD-C1-2025-1 tiene 35 inscriptos pero el aula LP-L02 tiene capacidad para 30. Se supera el cupo por 5 alumnos.',
    false
WHERE NOT EXISTS (
    SELECT 1 FROM notificacion n
    JOIN asignacion a ON a.id = n.asignacion_id
    JOIN comision c ON c.id = a.comision_id
    WHERE c.codigo = 'COM-BD-C1-2025-1'
    AND n.tipo_conflicto = 'CUPO_EXCEDIDO'
);

-- ── Escenario C: COM-AED-C2 → AN-201 (CONFLICTO: SUPERPOSICION_HORARIA) ──
--   COM-AED-C2 tiene Lun 08:00-10:00 (PRACTICA).
--   AN-201 está libre en el seed (COM-AED-M irá allí cuando corra el motor).
--   Para demostrar la superposición: pre-asignamos COM-AED-C2 a AN-201
--   y marcamos estado=CONFLICTO para reflejar que fue detectada.
--   El evaluador puede ver el conflicto en GET /api/conflictos
--   y resolverlo con PATCH /api/asignaciones/:id { aula_id: <otra> }.
INSERT INTO asignacion (estado, es_manual, comision_id, aula_id, fecha_asignacion)
SELECT 'CONFLICTO', true,
       (SELECT id FROM comision WHERE codigo = 'COM-AED-C2-2025-1'),
       (SELECT id FROM aula WHERE numero = 'AN-201'
        AND edificio_id = (SELECT id FROM edificio WHERE nombre = 'Edificio Aulas Norte')),
       NOW() - INTERVAL '1 day'
WHERE NOT EXISTS (
    SELECT 1 FROM asignacion
    WHERE comision_id = (SELECT id FROM comision WHERE codigo = 'COM-AED-C2-2025-1')
    AND estado IN ('ASIGNADA', 'CONFLICTO')
);

-- Notificación correspondiente a SUPERPOSICION_HORARIA de COM-AED-C2
INSERT INTO notificacion (asignacion_id, tipo_conflicto, detalle, atendida)
SELECT
    (SELECT a.id FROM asignacion a
     JOIN comision c ON c.id = a.comision_id
     WHERE c.codigo = 'COM-AED-C2-2025-1'
     AND a.estado = 'CONFLICTO'
     LIMIT 1),
    'SUPERPOSICION_HORARIA',
    'Comisión COM-AED-C2-2025-1 (Lun 08:00-10:00) tiene superposición horaria con otra asignación activa en aula AN-201.',
    false
WHERE NOT EXISTS (
    SELECT 1 FROM notificacion n
    JOIN asignacion a ON a.id = n.asignacion_id
    JOIN comision c ON c.id = a.comision_id
    WHERE c.codigo = 'COM-AED-C2-2025-1'
    AND n.tipo_conflicto = 'SUPERPOSICION_HORARIA'
);


-- =============================================================
-- FIN DEL SEED
-- =============================================================
-- Estado esperado después de aplicar este script:
--
--   Edificios:    3 (Aulas Norte, Central de Ingeniería, Laboratorios y Posgrado)
--   Aulas:        9 (3 AULA + 2 LABORATORIO + 1 AUDITORIO + 1 SALA_VIDEOCONFERENCIA + 2 extras)
--   Carreras:     3 (IS-FRBA, LAS-FRBA, IE-FRBA)
--   Materias:     5 (BD-101, AED-201, RC-301, AC-202, IS-401)
--   Docentes:     4
--   Comisiones:   8 (anio=2025, cuatrimestre=1)
--   Asignaciones: 4 (2 ASIGNADA + 2 CONFLICTO pre-existentes)
--   Notificaciones: 2 (1 CUPO_EXCEDIDO + 1 SUPERPOSICION_HORARIA, no atendidas)
--
-- Comisiones SIN asignación activa (listas para el motor automático):
--   COM-AED-M-2025-1  → 28 inscriptos, PRACTICA → necesita LABORATORIO
--   COM-RC-N-2025-1   → 22 inscriptos, NOCHE    → necesita AULA
--   COM-IS-V-2025-1   → 15 inscriptos, VIRTUAL  → necesita SALA_VIDEOCONFERENCIA
--   COM-AC-T-2025-1   → 82 inscriptos, HIBRIDA TEORICA → necesita AUDITORIO
--   (COM-AED-C2 tiene CONFLICTO, el motor la ignorará; COM-BD-C1 también)
--
-- =============================================================
-- GUÍA DE DEMO — COMANDOS CURL
-- =============================================================
-- Reemplazar <BASE_URL> por la URL de Render o http://localhost:3001
-- Reemplazar <TOKEN> por el JWT obtenido con el login.
--
-- 1. LOGIN (obtener token)
-- ────────────────────────
--   curl -s -X POST <BASE_URL>/api/auth/login \
--     -H "Content-Type: application/json" \
--     -d '{"email":"coordinador@aulamatch.edu","password":"Coord1234!"}'
--   → Copiar el valor de "token" de la respuesta.
--
-- 2. MOTOR DE ASIGNACIÓN AUTOMÁTICA
-- ───────────────────────────────────
--   curl -s -X POST <BASE_URL>/api/asignaciones/automatica \
--     -H "Authorization: Bearer <TOKEN>" \
--     -H "Content-Type: application/json" \
--     -d '{"anio":2025,"cuatrimestre":1}'
--   → Esperar: resumen con al menos 4 asignadas (AED-M, RC-N, IS-V, AC-T)
--   → AED-M → LABORATORIO LP-L01 o LP-L02
--   → IS-V  → SALA_VIDEOCONFERENCIA LP-VC1
--   → AC-T  → AUDITORIO CI-AUD
--   → RC-N  → AULA AN-102 o AN-101
--   → Idempotente: correrlo de nuevo no duplica asignaciones.
--
-- 3. VER PANEL DE ASIGNACIONES
-- ─────────────────────────────
--   curl -s <BASE_URL>/api/asignaciones \
--     -H "Authorization: Bearer <TOKEN>"
--   → Al menos 6 filas (2 ASIGNADA pre-seed + 2 CONFLICTO + 4 nuevas del motor)
--
--   Filtrar por turno noche:
--   curl -s "<BASE_URL>/api/asignaciones?turno=NOCHE" \
--     -H "Authorization: Bearer <TOKEN>"
--
--   Filtrar por estado=CONFLICTO:
--   curl -s "<BASE_URL>/api/asignaciones?estado=CONFLICTO" \
--     -H "Authorization: Bearer <TOKEN>"
--
-- 4. VER CONFLICTOS
-- ──────────────────
--   curl -s <BASE_URL>/api/conflictos \
--     -H "Authorization: Bearer <TOKEN>"
--   → Al menos 2 conflictos: CUPO_EXCEDIDO (C1) y SUPERPOSICION_HORARIA (C2)
--
--   Métricas del panel:
--   curl -s <BASE_URL>/api/conflictos/metricas \
--     -H "Authorization: Bearer <TOKEN>"
--
-- 5. AULAS COMPATIBLES (asignación manual asistida)
-- ───────────────────────────────────────────────────
--   # Obtener el ID de COM-RC-N-2025-1 desde el listado de comisiones:
--   curl -s "<BASE_URL>/api/comisiones?anio=2025&cuatrimestre=1" \
--     -H "Authorization: Bearer <TOKEN>"
--
--   # Ver aulas disponibles para esa comisión (usar el id obtenido):
--   curl -s <BASE_URL>/api/asignaciones/<id_comision_rc_n>/aulas-compatibles \
--     -H "Authorization: Bearer <TOKEN>"
--
-- 6. REPORTE DE ASIGNACIONES (JSON)
-- ───────────────────────────────────
--   curl -s "<BASE_URL>/api/reportes/asignaciones?anio=2025&cuatrimestre=1" \
--     -H "Authorization: Bearer <TOKEN>"
--
-- 7. REPORTE DE ASIGNACIONES (CSV — descarga directa)
-- ─────────────────────────────────────────────────────
--   curl -o asignaciones.csv \
--     "<BASE_URL>/api/reportes/asignaciones?anio=2025&cuatrimestre=1&formato=csv" \
--     -H "Authorization: Bearer <TOKEN>"
--   → Abrir con Excel: caracteres especiales (tildes) correctamente mostrados (BOM UTF-8)
--
-- 8. REPORTE DE DISPONIBILIDAD DE AULAS
-- ────────────────────────────────────────
--   curl -s "<BASE_URL>/api/reportes/disponibilidad?anio=2025&cuatrimestre=1" \
--     -H "Authorization: Bearer <TOKEN>"
--   → Muestra ocupación porcentual por edificio y aula
--
--   Filtrar por día lunes:
--   curl -s "<BASE_URL>/api/reportes/disponibilidad?anio=2025&cuatrimestre=1&dia=LUNES" \
--     -H "Authorization: Bearer <TOKEN>"
--
-- 9. RESOLVER UN CONFLICTO (reasignar aula)
-- ───────────────────────────────────────────
--   # Ver el ID de la asignación de COM-BD-C1 en estado CONFLICTO:
--   curl -s "<BASE_URL>/api/asignaciones?estado=CONFLICTO" \
--     -H "Authorization: Bearer <TOKEN>"
--
--   # Reasignar a una aula con más capacidad (ej: CI-A01, ID a obtener del listado):
--   curl -s -X PATCH <BASE_URL>/api/asignaciones/<id_conflicto_c1> \
--     -H "Authorization: Bearer <TOKEN>" \
--     -H "Content-Type: application/json" \
--     -d '{"aula_id": <id_ci_a01>}'
--   → Re-verificación automática: si la nueva aula tiene cupo suficiente,
--     el estado cambia a ASIGNADA y las notificaciones se marcan como atendidas.
-- =============================================================
