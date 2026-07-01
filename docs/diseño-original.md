# AulaMatch — Diseño Original (Fuente de Verdad)

> **Propósito de este archivo**: Contexto completo del diseño aprobado para ser referenciado
> en prompts futuros sin necesidad de volver a pegar la documentación.
> Fuente: `Actividad4_Joel_Mastroiaco_Completo.pdf`

---

## 1. Modelo de Dominio — 9 Entidades

| Entidad          | Descripción breve                                         |
|------------------|-----------------------------------------------------------|
| `UnidadAcademica`| Facultad o departamento; puede tener un edificio de preferencia |
| `Edificio`       | Eje físico; conecta Aula con UnidadAcademica              |
| `Aula`           | Espacio físico con tipo y capacidad; pertenece a Edificio |
| `Carrera`        | Entidad de referencia; código alineado con SIU Guaraní    |
| `Materia`        | Unidad curricular; pertenece a una UA directamente        |
| `Docente`        | Persona que dicta una comisión                            |
| `Comision`       | Cursada concreta de una Materia en un período             |
| `BandaHoraria`   | Bloque día+hora de una Comisión (cardinalidad 1..*)       |
| `Asignacion`     | Vínculo Comisión↔Aula con estado y metadatos              |

### Relaciones clave

- **M:N Carrera ↔ Materia** → tabla de unión `carrera_materia(carrera_id, materia_id)`
- **UA → Materia** (responsabilidad académica directa)
- **UA → Carrera → Materia** (pertenencia curricular; semántica distinta, no redundante)
- **Comision → BandaHoraria** (1 a muchas)
- **Asignacion** centraliza Comision↔Aula (evita M:N directa; registra estado, fecha, modo)

---

## 2. Enumeraciones Controladas

```sql
tipo_aula        → AULA | LABORATORIO | AUDITORIO | SALA_VIDEOCONFERENCIA
modalidad        → PRESENCIAL | VIRTUAL | HIBRIDA
turno            → MANANA | TARDE | NOCHE
dia_semana       → LUNES | MARTES | MIERCOLES | JUEVES | VIERNES | SABADO
estado_asignacion → PENDIENTE | ASIGNADA | CONFLICTO
tipo_clase       → TEORICA | PRACTICA | TEORICO_PRACTICA
```

---

## 3. Esquema Relacional (tablas y columnas canónicas)

### `edificio`
| Columna    | Tipo          | Restricciones        |
|------------|---------------|----------------------|
| id         | SERIAL        | PK                   |
| nombre     | VARCHAR(100)  | NOT NULL             |
| direccion  | VARCHAR(200)  | NOT NULL             |

### `unidad_academica`
| Columna                    | Tipo          | Restricciones                     |
|----------------------------|---------------|-----------------------------------|
| id                         | SERIAL        | PK                                |
| nombre                     | VARCHAR(120)  | NOT NULL, UNIQUE                  |
| edificio_preferencia_id    | INTEGER       | FK → edificio(id), NULLABLE       |

### `aula`
| Columna     | Tipo         | Restricciones                        |
|-------------|--------------|--------------------------------------|
| id          | SERIAL       | PK                                   |
| numero      | VARCHAR(20)  | NOT NULL                             |
| capacidad   | INTEGER      | NOT NULL, CHECK > 0                  |
| tipo        | tipo_aula    | NOT NULL (enum)                      |
| edificio_id | INTEGER      | NOT NULL, FK → edificio(id)          |

Índices: `idx_aula_edificio`, `idx_aula_tipo_capacidad`

### `carrera`
| Columna              | Tipo         | Restricciones                          |
|----------------------|--------------|----------------------------------------|
| id                   | SERIAL       | PK                                     |
| nombre               | VARCHAR(120) | NOT NULL                               |
| codigo               | VARCHAR(20)  | NOT NULL, UNIQUE                       |
| unidad_academica_id  | INTEGER      | NOT NULL, FK → unidad_academica(id)    |

### `materia`
| Columna              | Tipo         | Restricciones                          |
|----------------------|--------------|----------------------------------------|
| id                   | SERIAL       | PK                                     |
| nombre               | VARCHAR(120) | NOT NULL                               |
| codigo               | VARCHAR(20)  | NOT NULL, UNIQUE                       |
| unidad_academica_id  | INTEGER      | NOT NULL, FK → unidad_academica(id)    |

### `carrera_materia` (M:N)
| Columna     | Tipo    | Restricciones                  |
|-------------|---------|--------------------------------|
| carrera_id  | INTEGER | NOT NULL, FK → carrera(id)     |
| materia_id  | INTEGER | NOT NULL, FK → materia(id)     |
| PK          | —       | (carrera_id, materia_id)       |

Índice: `idx_carrera_materia_materia`

### `docente`
| Columna  | Tipo         | Restricciones |
|----------|--------------|---------------|
| id       | SERIAL       | PK            |
| nombre   | VARCHAR(80)  | NOT NULL      |
| apellido | VARCHAR(80)  | NOT NULL      |
| cargo    | VARCHAR(100) | NULLABLE      |

### `comision`
| Columna      | Tipo       | Restricciones                       |
|--------------|------------|-------------------------------------|
| id           | SERIAL     | PK                                  |
| codigo       | VARCHAR(30)| NOT NULL, UNIQUE                    |
| cupo         | INTEGER    | NOT NULL, CHECK > 0                 |
| inscriptos   | INTEGER    | NOT NULL, DEFAULT 0                 |
| modalidad    | modalidad  | NOT NULL (enum)                     |
| turno        | turno      | NOT NULL (enum)                     |
| cuatrimestre | SMALLINT   | NOT NULL, CHECK IN (1, 2)           |
| anio         | SMALLINT   | NOT NULL                            |
| materia_id   | INTEGER    | NOT NULL, FK → materia(id)          |
| docente_id   | INTEGER    | NOT NULL, FK → docente(id)          |

Índices: `idx_comision_materia`, `idx_comision_periodo`

### `banda_horaria`
| Columna     | Tipo       | Restricciones                    |
|-------------|------------|----------------------------------|
| id          | SERIAL     | PK                               |
| dia         | dia_semana | NOT NULL (enum)                  |
| hora_inicio | TIME       | NOT NULL                         |
| hora_fin    | TIME       | NOT NULL, CHECK > hora_inicio    |
| tipo_clase  | tipo_clase | NOT NULL (enum)                  |
| comision_id | INTEGER    | NOT NULL, FK → comision(id)      |

Índice: `idx_banda_comision`

### `asignacion`
| Columna          | Tipo              | Restricciones                   |
|------------------|-------------------|---------------------------------|
| id               | SERIAL            | PK                              |
| estado           | estado_asignacion | NOT NULL, DEFAULT 'PENDIENTE'   |
| fecha_asignacion | TIMESTAMP         | NOT NULL, DEFAULT NOW()         |
| es_manual        | BOOLEAN           | NOT NULL, DEFAULT FALSE         |
| comision_id      | INTEGER           | NOT NULL, FK → comision(id)     |
| aula_id          | INTEGER           | NOT NULL, FK → aula(id)         |

Índices: `idx_asignacion_comision`, `idx_asignacion_aula_estado`, `idx_asignacion_estado`

---

## 4. Endpoints REST por Módulo

### Auth — `/api/auth`
| Método | Ruta        | Rol requerido |
|--------|-------------|---------------|
| POST   | /login      | Público       |
| POST   | /logout     | Autenticado   |
| GET    | /me         | Autenticado   |

### Asignaciones — `/api/asignaciones`
| Método | Ruta                      | Roles                     |
|--------|---------------------------|---------------------------|
| GET    | /                         | Coordinador, Administrativo |
| POST   | /automatica               | Coordinador, Administrativo |
| POST   | /                         | Coordinador, Administrativo |
| PATCH  | /:id                      | Coordinador, Administrativo |
| GET    | /:id/aulas-compatibles    | Coordinador, Administrativo |
| DELETE | /:id                      | **Solo Coordinador**      |

### Conflictos — `/api/conflictos`
| Método | Ruta       | Roles                     |
|--------|------------|---------------------------|
| GET    | /          | Coordinador, Administrativo |
| GET    | /metricas  | Coordinador, Administrativo |
| POST   | /detectar  | **Solo Coordinador**      |

### Aulas — `/api/edificios` y `/api/aulas`
| Método | Ruta                   | Roles                       |
|--------|------------------------|-----------------------------|
| GET    | /edificios             | Coordinador, Administrativo |
| POST   | /edificios             | **Solo Coordinador**        |
| GET    | /edificios/:id/aulas   | Coordinador, Administrativo |
| POST   | /aulas                 | **Solo Coordinador**        |
| PATCH  | /aulas/:id             | **Solo Coordinador**        |

### Académico
| Método | Ruta                   | Roles                       |
|--------|------------------------|-----------------------------|
| GET    | /unidades-academicas   | Coordinador, Administrativo |
| GET    | /carreras              | Coordinador, Administrativo |
| GET    | /materias              | Coordinador, Administrativo |
| GET    | /comisiones            | Coordinador, Administrativo |
| POST   | /comisiones            | **Solo Administrativo**     |
| GET    | /docentes              | Coordinador, Administrativo |

### Reportes
| Método | Ruta                    | Roles                       |
|--------|-------------------------|-----------------------------|
| GET    | /reportes/asignaciones  | Coordinador, Administrativo |
| GET    | /reportes/disponibilidad| **Solo Coordinador**        |
| GET    | /health                 | Público                     |

---

## 5. Autenticación y Autorización (JWT)

**Algoritmo**: HS256  
**Roles**: `COORDINADOR` (acceso total) | `ADMINISTRATIVO` (limitado a su UA)

**Payload del token**:
```json
{
  "sub": 42,
  "nombre": "Lucía Fernández",
  "rol": "COORDINADOR",
  "unidadAcademicaId": 3,
  "iat": 1720000000,
  "exp": 1720028800
}
```

**Filtro automático por UA**: Si `rol === 'ADMINISTRATIVO'`, todos los services
deben aplicar `WHERE unidad_academica_id = req.user.unidadAcademicaId`.

---

## 6. Algoritmo de Asignación Automática (Sección 10.3 — v2)

> **Estado**: implementado en `backend/src/modules/asignaciones/service.js`

```
FUNCIÓN asignarAutomaticamente(anio, cuatrimestre):
    comisionesSinAula ← obtenerComisiones(anio, cuatrimestre, estado=SIN_ASIGNACION)

    // 1. Ordenar por demanda: primero las de mayor cupo (más difíciles de ubicar)
    comisionesSinAula ← ordenarPorCupoDescendente(comisionesSinAula)

    asignacionesPropuestas ← []
    asignacionesFallidas   ← []

    PARA CADA comision EN comisionesSinAula:
        bandasHorarias ← comision.bandasHorarias
        cupoRequerido  ← comision.inscriptos
        tipoClaseReq   ← inferirTipoAula(comision.modalidad, bandasHorarias.tipoClase)
        edificioPref   ← comision.materia.unidadAcademica.edificioPreferencia

        // 2. Buscar aulas candidatas por tipo y cupo
        aulasCandidatas ← buscarAulas(tipo >= tipoClaseReq, capacidad >= cupoRequerido)

        // 3. Priorizar edificio preferido de la UA
        aulasPreferidas   ← filtrarPorEdificio(aulasCandidatas, edificioPref)
        aulasAlternativas ← aulasCandidatas - aulasPreferidas
        aulasCandidatas   ← aulasPreferidas + aulasAlternativas

        // 4. Filtrar por disponibilidad horaria (sin superposición)
        aulasDisponibles ← []
        PARA CADA aula EN aulasCandidatas:
            SI NO existeSuperposicion(aula, bandasHorarias):
                aulasDisponibles.agregar(aula)

        // 5. Ordenar por capacidad sobrante ascendente (menor desperdicio primero)
        //    Capacidad sobrante = aula.capacidad - comision.inscriptos
        aulasDisponibles ← ordenarPorCampoAscendente(
            aulasDisponibles,
            clave = aula.capacidad - comision.inscriptos
        )

        // 6. Seleccionar la mejor aula disponible (menor capacidad sobrante)
        SI aulasDisponibles NO está vacío:
            aulaElegida ← aulasDisponibles[0]
            asignacionesPropuestas.agregar(
                crearAsignacion(comision.id, aulaElegida.id, estado="ASIGNADA",
                               esManual=false, fechaAsignacion=AHORA())
            )
        SINO:
            asignacionesFallidas.agregar({comision, motivo="SIN_AULA_DISPONIBLE"})

    guardarEnBD(asignacionesPropuestas)
    RETORNAR { asignadas, pendientes, resumen: {total, asignadas, fallidas} }
FIN FUNCIÓN
```

> **Nota (corrección v2):** Se agregó el paso 5 de ordenamiento por capacidad sobrante
> ascendente (`aula.capacidad − comision.inscriptos`) antes de la selección de
> `aulasDisponibles[0]`, eliminando la contradicción entre el comentario original y la lógica
> ejecutada. En caso de empate exacto de capacidad sobrante, el criterio de desempate queda
> delegado al orden de inserción previo (edificio preferido primero, alternativas después),
> heredado del paso 3. Si se requiere un desempate explícito, debe especificarse como
> requerimiento adicional.

---

## 7. Detección de Conflictos (Sección 10.5)

> **Estado**: pendiente de implementación (etapa posterior)

**Se dispara en**:
1. Al crear/modificar una Asignacion (síncrono)
2. Al finalizar asignación automática masiva
3. Por petición manual: `POST /api/conflictos/detectar`

**Verificación 1 — Superposición horaria**:
```
Para cada banda de la comisión:
  Si existe otra Asignacion con mismo aula_id y estado ≠ CONFLICTO
  Y misma banda con solapamiento de horario → estado = 'CONFLICTO'
```

**Verificación 2 — Cupo excedido**:
```
Si comision.inscriptos > aula.capacidad → estado = 'CONFLICTO'
```

---

## 8. Ambigüedades y Decisiones Pendientes

| # | Ambigüedad                                     | Decisión propuesta                                      |
|---|------------------------------------------------|---------------------------------------------------------|
| 1 | Tabla `usuario` no definida en sección 8       | Crear en `02_auth.sql` con: id, email, password_hash, rol, unidad_academica_id |
| 2 | `inferirTipoAula(modalidad, tipoClase)` — regla no especificada | Definir al implementar el motor (ej: VIRTUAL → SALA_VIDEOCONFERENCIA) |
| 3 | Formato de exportación CSV en `/reportes/asignaciones` | Usar query param `?formato=json` (default) o `?formato=csv` |

---

## 9. Archivo de Migración

`deploy/init-db/01_schema.sql` — Enumeraciones + 10 tablas (9 entidades + carrera_materia)  
`deploy/init-db/02_auth.sql`  — **PENDIENTE** (tabla usuario para autenticación JWT)
