# CHANGELOG — AulaMatch API

Historial de cambios del proyecto. Cada entrada registra qué se agregó,
modificó o corrigió, con fecha, archivos involucrados y decisiones técnicas relevantes.

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/).
Versiones semánticas informales: `vX.Y` donde X = bloque funcional, Y = iteración.

---

## [v1.5] — 2026-06-24 · Módulo Conflictos (detección automática + panel)

### Agregado

- **`deploy/init-db/03_notificaciones.sql`** — Migración nueva.
  - Tabla `notificacion`: `id`, `asignacion_id` (FK CASCADE), `tipo_conflicto` (VARCHAR),
    `detalle` (TEXT legible), `atendida` (BOOLEAN), `created_at`.
  - Índices en `asignacion_id`, `atendida`, `tipo_conflicto`.
  - **Decisión documentada**: tabla DB en lugar de logs estructurados → trazabilidad
    entre reinicios + consulta SQL directa para métricas (ver SQL para justificación completa).

- **`backend/src/modules/conflictos/service.js`** — Núcleo del módulo.
  - `verificarSuperposicionHoraria(asignacion)` — SQL con `NOT (hora_fin <= inicio OR hora_inicio >= fin)`,
    devuelve qué banda específica solapó y con qué comisión (para detalle legible).
  - `verificarCupoExcedido(asignacion)` — Compara `co.inscriptos > au.capacidad`.
  - `notificar(asignacionId, tipo, detalle)` — INSERT inmediato y obligatorio en `notificacion` +
    log a console.
  - `detectarConflictos(asignacion)` — Ejecuta V1 y V2 en orden; UPDATE a CONFLICTO si alguna falla.
    Ambas verificaciones son independientes (una asignación puede tener ambos tipos simultáneamente).
  - `detectarPorPeriodo({ anio?, cuatrimestre? })` — Escanea todas las asignaciones ASIGNADA del período.
  - `listarConflictos({ unidadAcademicaId? })` — JOIN completo + `json_agg` de notificaciones por asignación.
  - `obtenerMetricas({ unidadAcademicaId? })` — 6 contadores: conflictos activos, asignaciones activas,
    asignadas últimas 24h, comisiones sin asignación, notificaciones no atendidas, desglose por tipo.
  - `marcarNotificacionesAtendidas(asignacionId)` — Cierra el ciclo al reasignar.

- **`backend/src/modules/conflictos/controller.js`** — Handlers HTTP con filtro automático por UA.
- **`backend/src/modules/conflictos/routes.js`** — Orden: `/metricas` → `/detectar` → `/`.

### Modificado

- **`backend/src/modules/asignaciones/service.js`** — 3 puntos de integración:
  1. `crearAsignacionManual` → llama `detectarConflictos` post-INSERT.
  2. `ejecutarAsignacionAutomatica` → llama `detectarConflictos` por cada asignación creada.
  3. `actualizarAsignacion` → llama `marcarNotificacionesAtendidas` + `detectarConflictos` cuando cambia `aula_id`.
  - Import diferido (`getConflictosService = () => require(...)`) para evitar dependencia circular.

- **`backend/src/app.js`** — Activado `app.use('/api/conflictos', ...)`.

### Decisiones técnicas registradas

| Decisión | Elección | Justificación |
|---|---|---|
| Almacenamiento de notificaciones | Tabla `notificacion` en DB | Trazabilidad entre reinicios; consulta SQL directa para métricas; marcado de "atendida" en el flujo de resolución. |
| Dependencia circular asig ↔ conflictos | `require()` diferido dentro de función | Node.js resuelve el ciclo si el require ocurre después de que ambos módulos se hayan evaluado. Sin efecto en performance (módulo ya cacheado). |
| Ambas verificaciones independientes | Secuencial, sin short-circuit | Una asignación puede tener SUPERPOSICION_HORARIA y CUPO_EXCEDIDO simultáneamente; ambas se notifican. |
| Solapamiento de intervalo | `NOT (fin <= inicio_nuevo OR inicio >= fin_nuevo)` | Intervalos que se tocan en el extremo (10-12 / 12-14) no son conflicto. Consistente con asignaciones/service. |
| Flujo de resolución | PATCH → marcar atendidas → re-detectar | Cierra el ciclo: conflicto resuelto → notificaciones atendidas → re-verificación sobre el nuevo aula. |

### Flujo completo de resolución documentado

```
1. GET  /api/conflictos               → coordinador ve el panel
2. GET  /api/asignaciones/:id/aulas-compatibles  → consulta alternativas
3. PATCH /api/asignaciones/:id { aula_id }
   ↳ marcarNotificacionesAtendidas()  → cierra notificaciones antiguas
   ↳ detectarConflictos()             → verifica la nueva asignación
   ↳ si sin conflicto: estado = ASIGNADA, es_manual = true
4. GET  /api/conflictos/metricas      → contadores actualizados
```

### Endpoints disponibles tras esta versión

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| *(todos los anteriores)* | | | |
| `GET` | `/api/conflictos` | C, A | Asignaciones CONFLICTO con notificaciones |
| `GET` | `/api/conflictos/metricas` | C, A | Contadores del panel |
| `POST` | `/api/conflictos/detectar` | C | Detección masiva manual |

> C = COORDINADOR · A = ADMINISTRATIVO

---

## [v1.4] — 2026-06-24 · Módulo Asignaciones (motor automático + CRUD manual)

### Implementado

- **`backend/src/modules/asignaciones/service.js`** — Núcleo del módulo (646 líneas).
  - `inferirTipoAula(modalidad, tiposClase, inscriptos)` — **Decisión propia documentada:**
    - `VIRTUAL` → `SALA_VIDEOCONFERENCIA` (siempre, independiente del tipo_clase)
    - `PRESENCIAL` / `HÍBRIDA` con banda `PRACTICA` → `LABORATORIO`
    - `PRESENCIAL` / `HÍBRIDA` con banda `TEORICA` y `inscriptos >= 80` → `AUDITORIO`
    - Resto → `AULA`
  - `existeSuperposicion(aulaId, bandas)` — **Implementación SQL documentada:**
    - Condición de solapamiento: `bh.hora_inicio < banda.fin AND bh.hora_fin > banda.inicio`
    - Verifica mismo día de la semana. Excluye asignaciones en estado `CONFLICTO`.
    - Parámetros dinámicos para N bandas sin N+1 queries.
  - `aulasCompatiblesParaComision(comisionId)` — Candidatas por tipo + capacidad, ordenadas
    edificio preferido primero, filtradas por superposición.
  - `ejecutarAsignacionAutomatica(anio, cuatrimestre)` — Motor principal:
    1. Excluye comisiones con asignación activa (`ASIGNADA`) — **idempotente**.
    2. Ordena por `inscriptos DESC`.
    3. Por cada comisión: infiere tipo, busca candidatas, prioriza edificio preferido.
    4. Filtra por disponibilidad horaria (loop con `existeSuperposicion`).
    5. Elige primera aula disponible e inserta en `asignacion`.
    6. Devuelve `{ asignadas, pendientes, resumen: { total, asignadas, fallidas } }`.
  - `crearAsignacionManual({ comision_id, aula_id })` — Valida: sin asignación activa existente (409)
    y sin superposición horaria (409). Marca `es_manual = true`.
  - `actualizarAsignacion(id, { aula_id?, estado? })` — PATCH parcial. Si cambia `aula_id`,
    verifica superposición y marca `es_manual = true`.
  - `eliminarAsignacion(id)` — DELETE con 404 si no existe.
  - `listarAsignaciones(filtros)` — Filtros: `unidadAcademicaId`, `carreraId`, `edificioId`,
    `turno`, `modalidad`, `estado`. JOIN completo con comisión, materia, UA, aula, edificio.

- **`backend/src/modules/asignaciones/controller.js`** — Handlers HTTP.
  - `listar` — filtro automático por UA para `ADMINISTRATIVO`.
  - `ejecutarAutomatica`, `crearManual`, `actualizar`, `aulasCompatibles`, `eliminar`.

- **`backend/src/modules/asignaciones/routes.js`** — Router montado en `/api/asignaciones`.
  - Orden crítico: `POST /automatica` antes de `POST /` y `/:id`.
  - `GET /:id/aulas-compatibles` antes de `PATCH /:id`.
  - `DELETE /:id` restringido a `COORDINADOR`; resto permite ambos roles.

### Modificado

- **`backend/src/app.js`** — Activado `app.use('/api/asignaciones', require('./modules/asignaciones/routes'))`.

### Decisiones técnicas registradas

| Decisión | Elección | Justificación |
|---|---|---|
| Regla `inferirTipoAula` | Propia / no del diseño original | El pseudocódigo nombra la función sin definirla. La regla se documenta explícitamente como propuesta propia. |
| Umbral AUDITORIO | 80 inscriptos | Valor arbitrario configurable vía constante `UMBRAL_AUDITORIO`; separar auditorios grandes de aulas medianas. |
| Solapamiento horario | Condición de intervalo abierto en SQL | `inicio_A < fin_B AND fin_A > inicio_B`; clases que se tocan en el extremo (ej: 10:00-12:00 y 12:00-14:00) **no** se consideran solapamiento. |
| Idempotencia de `/automatica` | Excluir comisiones con asignación `ASIGNADA` existente | Segunda ejecución solo procesa comisiones nuevas o fallidas. No hay DELETE previo. |
| `:id` en `/aulas-compatibles` | Es `comision_id`, no `asignacion_id` | Permite consultar aulas antes de crear la asignación. Documentado en routes.js. |
| ADMINISTRATIVO ve solo su UA | Filtro automático en `listar` | Igual que en módulos anteriores: lista filtrada, sin error. |

### Endpoints disponibles tras esta versión

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| `GET` | `/api/health` | Público | Health check |
| `POST` | `/api/auth/login` | Público | Login → JWT |
| `POST` | `/api/auth/logout` | Auth | Cierre de sesión |
| `GET` | `/api/auth/me` | Auth | Datos del token |
| `GET` | `/api/edificios` | C, A | Lista edificios |
| `POST` | `/api/edificios` | C | Crear edificio |
| `GET` | `/api/edificios/:id/aulas` | C, A | Aulas de un edificio |
| `POST` | `/api/aulas` | C | Crear aula |
| `PATCH` | `/api/aulas/:id` | C | Actualizar aula |
| `GET` | `/api/unidades-academicas` | C, A | Lista UAs |
| `GET` | `/api/carreras` | C, A | Carreras (filtro UA) |
| `GET` | `/api/materias` | C, A | Materias (filtro UA, carrera) + M:N |
| `GET` | `/api/comisiones` | C, A | Comisiones (múltiples filtros) |
| `POST` | `/api/comisiones` | C, A | Registrar comisión |
| `GET` | `/api/docentes` | C, A | Lista docentes |
| `GET` | `/api/asignaciones` | C, A | Lista asignaciones (filtros) |
| `POST` | `/api/asignaciones/automatica` | C, A | Motor automático de asignación |
| `POST` | `/api/asignaciones` | C, A | Asignación manual |
| `PATCH` | `/api/asignaciones/:id` | C, A | Reasignar / cambiar estado |
| `GET` | `/api/asignaciones/:id/aulas-compatibles` | C, A | Aulas disponibles para una comisión |
| `DELETE` | `/api/asignaciones/:id` | C | Eliminar asignación |

> C = COORDINADOR · A = ADMINISTRATIVO

---

## [v1.3] — 2026-06-24 · Módulos Aulas (completo) y Académico

### Confirmado funcional

- **`backend/src/modules/aulas/service.js`** — Ya implementado desde v1.1.
  Funciones: `listarEdificios`, `crearEdificio`, `obtenerEdificioPorId`,
  `listarAulasPorEdificio`, `crearAula`, `actualizarAula`.
  Validaciones en API (antes de llegar a DB): `capacidad > 0`, tipo en enum, campos obligatorios.
- **`backend/src/modules/aulas/controller.js`** — Ya implementado desde v1.1.
- **`backend/src/modules/aulas/routes.js`** — Ya implementado desde v1.1.

### Implementado

- **`backend/src/modules/academico/service.js`** — Lógica de consultas académicas.
  - `listarUnidadesAcademicas()` — join con `edificio` para el campo `edificio_preferencia_nombre`.
  - `listarCarreras({ unidadAcademicaId? })` — filtro opcional por UA.
  - `listarMaterias({ unidadAcademicaId?, carreraId? })` — filtros opcionales; incluye relación
    M:N `carrera_materia` como array `carreras` en cada materia (via `json_agg`).
  - `listarDocentes()` — ordenado por apellido + nombre.
  - `listarComisiones(filtros)` — filtros: `anio`, `cuatrimestre`, `unidadAcademicaId`,
    `materiaId`, `modalidad`, `turno`. Join completo con materia, UA y docente.
  - `crearComision(datos)` — validación de todos los campos obligatorios + dominio
    (`cupo > 0`, `cuatrimestre IN (1,2)`, `anio [2000–2100]`, enums válidos).

- **`backend/src/modules/academico/controller.js`** — Handlers HTTP con filtro automático por rol.
  - `listarUAs` — sin filtro por rol.
  - `listarCarreras`, `listarMaterias`, `listarComisiones` — si `ADMINISTRATIVO`:
    sobreescribe `unidad_academica_id` con `req.user.unidadAcademicaId` del JWT
    (el cliente no puede ver datos de otra UA).
  - `crearComision` — delega al service; errores de FK mapeados por errorHandler.

- **`backend/src/modules/academico/routes.js`** — Router Express montado en `/api`.
  Todos los endpoints protegidos con `authenticate` + `authorize`.

### Modificado

- **`backend/src/app.js`** — Activado `app.use('/api', require('./modules/academico/routes'))`.

### Decisiones técnicas registradas

| Decisión | Elección | Justificación |
|---|---|---|
| ADMINISTRATIVO consulta comisiones de otra UA | Devuelve lista filtrada por su UA (no error 403) | Comportamiento transparente: el filtro es automático, no explícito. Menos fricción para el cliente. |
| M:N carrera-materia en `/api/materias` | Array `carreras` en cada objeto materia (json_agg) | Una sola query con LEFT JOIN + GROUP BY, sin N+1 queries. |
| `edificio_id` no actualizable en PATCH aula | Campo excluido intencionalmente | Cambiar el edificio de un aula requiere validaciones de negocio adicionales (asignaciones activas). |
| POST /api/comisiones acceso doble rol | COORDINADOR y ADMINISTRATIVO | Coherente con "acceso total" del coordinador; el prompt solo especifica administrativo para excepciones, no restricción exclusiva. |

### Endpoints disponibles tras esta versión

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| `GET` | `/api/health` | Público | Health check |
| `POST` | `/api/auth/login` | Público | Login → JWT |
| `POST` | `/api/auth/logout` | Auth | Cierre de sesión |
| `GET` | `/api/auth/me` | Auth | Datos del token |
| `GET` | `/api/edificios` | C, A | Lista edificios |
| `POST` | `/api/edificios` | C | Crear edificio |
| `GET` | `/api/edificios/:id/aulas` | C, A | Aulas de un edificio |
| `POST` | `/api/aulas` | C | Crear aula |
| `PATCH` | `/api/aulas/:id` | C | Actualizar aula |
| `GET` | `/api/unidades-academicas` | C, A | Lista todas las UAs |
| `GET` | `/api/carreras` | C, A | Lista carreras (filtro UA) |
| `GET` | `/api/materias` | C, A | Lista materias (filtro UA, carrera) + M:N |
| `GET` | `/api/comisiones` | C, A | Lista comisiones (múltiples filtros) |
| `POST` | `/api/comisiones` | C, A | Registrar comisión |
| `GET` | `/api/docentes` | C, A | Lista docentes |

> C = COORDINADOR · A = ADMINISTRATIVO

---


## [v1.2] — 2026-06-24 · Módulo Auth (JWT)

### Agregado

- **`deploy/init-db/02_usuarios.sql`** — Migración nueva (independiente del dominio).
  - Tipo ENUM `rol_usuario` con valores `COORDINADOR` | `ADMINISTRATIVO`.
  - Tabla `usuario`: `id`, `nombre`, `email`, `password_hash` (bcrypt),
    `rol`, `unidad_academica_id` (FK nullable), `activo` (soft-delete), `created_at`.
  - `CHECK CONSTRAINT` en DB: `ADMINISTRATIVO` siempre debe tener `unidad_academica_id`.
  - Índices en `email` y `rol`.
  - **Seed de desarrollo** (idempotente con `ON CONFLICT DO NOTHING`):
    - `coordinador@aulamatch.edu` / `Coord1234!` → rol `COORDINADOR`
    - `admin@aulamatch.edu` / `Admin1234!` → rol `ADMINISTRATIVO` (UA: FRBA)
  - Hashes bcrypt generados con `cost=12` y verificados en runtime.

- **`backend/src/modules/auth/service.js`** — Lógica de autenticación.
  - `findUserByEmail`: consulta usuario activo por email (filtra `activo = TRUE`).
  - `login(email, password)`: valida credenciales con `bcrypt.compare`, firma JWT.
  - Mismo mensaje de error para email-no-existe y password-incorrecta (evita user enumeration).
  - Payload JWT firmado con `HS256` respetando estructura especificada:
    `{ sub, nombre, rol, unidadAcademicaId, iat, exp }`. Sin campos extra.
  - Vigencia configurable vía `JWT_EXPIRES_IN` (default `8h`).

- **`backend/src/modules/auth/controller.js`** — Handlers HTTP.
  - `login` → `POST /api/auth/login` (público).
  - `logout` → `POST /api/auth/logout` (autenticado, stateless client-side).
  - `me` → `GET /api/auth/me` (autenticado, devuelve payload del token sin DB lookup).

- **`backend/src/modules/auth/routes.js`** — Router Express montado en `/api/auth`.
  - `POST /login` → público.
  - `POST /logout` → protegido con `authenticate`.
  - `GET /me` → protegido con `authenticate`.

- **`backend/scripts/generate-seed-hashes.js`** — Utilidad de desarrollo.
  - Genera hashes bcrypt (cost 12) para las contraseñas del seed.
  - Uso: `node backend/scripts/generate-seed-hashes.js`

### Modificado

- **`backend/src/app.js`** — Activado el módulo auth:
  - Agregado `app.use('/api/auth', require('./modules/auth/routes'))`.

### Decisiones técnicas registradas

| Decisión | Elección | Justificación |
|---|---|---|
| Estrategia de logout | Client-side stateless | JWT es stateless por diseño; ventana de riesgo máxima = 8h (duración del token). Ruta de migración a Redis blacklist documentada sin cambiar interfaz. |
| `/me` con DB lookup | No — solo payload del token | Evita round-trip a DB; datos desactualizados máximo 8h (aceptable para sistema interno). |
| Error de credenciales | Mensaje genérico único | Evita enumeración de usuarios (user enumeration attack). |
| Hash de contraseñas | bcrypt cost 12 | Balance entre seguridad y performance; > 250ms por hash en hardware moderno. |

### Endpoints disponibles tras esta versión

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/api/health` | Público | Health check del servidor y DB |
| `POST` | `/api/auth/login` | Público | Login con email + password → JWT |
| `POST` | `/api/auth/logout` | Autenticado | Cierre de sesión (client-side) |
| `GET` | `/api/auth/me` | Autenticado | Datos del usuario del token |
| `GET` | `/api/edificios` | COORDINADOR, ADMINISTRATIVO | Lista de edificios |
| `POST` | `/api/edificios` | COORDINADOR | Crear edificio |
| `GET` | `/api/edificios/:id/aulas` | COORDINADOR, ADMINISTRATIVO | Aulas de un edificio |
| `POST` | `/api/aulas` | COORDINADOR | Crear aula |
| `PATCH` | `/api/aulas/:id` | COORDINADOR | Actualizar aula parcialmente |

---

## [v1.1] — (fecha de scaffolding) · Módulo Aulas + Middlewares base

### Agregado

- **`backend/src/modules/aulas/service.js`** — Queries a tablas `edificio` y `aula`.
- **`backend/src/modules/aulas/controller.js`** — Handlers para edificios y aulas.
- **`backend/src/modules/aulas/routes.js`** — Endpoints de edificios y aulas protegidos con `authenticate` + `authorize`.
- **`backend/src/middlewares/authenticate.js`** — Verifica firma y vigencia del JWT.
  - Extrae token del header `Authorization: Bearer <token>`.
  - Responde `401` con mensaje diferenciado: `Token expirado` vs `Token inválido`.
  - Adjunta payload decodificado a `req.user`.
- **`backend/src/middlewares/authorize.js`** — Valida rol requerido.
  - Recibe `string[]` de roles permitidos.
  - Responde `403` si `req.user.rol` no está en la lista.
  - El filtro de `unidadAcademicaId` para `ADMINISTRATIVO` **no** se aplica aquí; es responsabilidad de cada service leyendo `req.user`.
- **`backend/src/middlewares/errorHandler.js`** — Handler global de errores (último middleware).
  - Maneja errores PG: `23503` (FK inválida → 409), `23505` (UNIQUE → 409), `23514` (CHECK → 400).
  - En producción oculta el stack; en desarrollo lo expone en `details`.

### Stubs creados (pendientes de implementación)

- `modules/auth/` — controller, service, routes (solo comentarios/TODOs)
- `modules/academico/` — controller, service, routes
- `modules/asignaciones/` — controller, service, routes
- `modules/conflictos/` — controller, service, routes
- `modules/reportes/` — controller, service, routes

---

## [v1.0] — (fecha de scaffolding) · Scaffolding inicial

### Agregado

- **`deploy/init-db/01_schema.sql`** — Esquema inicial de base de datos.
  - 6 ENUMs: `tipo_aula`, `modalidad`, `turno`, `dia_semana`, `estado_asignacion`, `tipo_clase`.
  - 9 tablas de dominio: `edificio`, `unidad_academica`, `aula`, `carrera`, `materia`,
    `carrera_materia`, `docente`, `comision`, `banda_horaria`, `asignacion`.
  - Resolución de referencia circular `unidad_academica ↔ edificio` creando `edificio` primero.
  - Índices de rendimiento en FK y campos de búsqueda frecuente.

- **`deploy/docker-compose.yml`** — Entorno local reproducible.
  - Servicios: `db` (postgres:16-alpine) + `backend` (Node.js con hot-reload via nodemon).
  - Healthcheck en `db`; el backend espera que `db` esté listo antes de iniciar.
  - Volumen persistente `postgres_data` para la base de datos.
  - Puertos configurables vía `HOST_DB_PORT` y `HOST_BACKEND_PORT`.

- **`backend/server.js`** — Arranque HTTP con reintentos de conexión a DB.
  - Hasta 5 reintentos con delay de 3s entre intentos.
  - Aborta el proceso si no puede conectar tras los reintentos.

- **`backend/src/app.js`** — Instancia Express con middlewares globales.
  - `cors`, `morgan` (dev), `express.json()`.
  - Endpoint público `GET /api/health`.

- **`backend/src/config/db.js`** — Pool de conexiones PostgreSQL (`pg`).
  - Soporta `DATABASE_URL` o variables individuales (`DB_HOST`, `DB_PORT`, etc.).
  - Expone `query(text, params)` y `getClient()` para transacciones.

- **`backend/src/config/env.js`** — Validación de variables de entorno al inicio.
  - Requiere `JWT_SECRET` siempre.
  - Requiere `DATABASE_URL` **o** el conjunto completo de variables DB individuales.
  - Lanza error descriptivo en arranque si falta alguna variable crítica.

- **`.env.example`** — Plantilla de configuración con todos los campos documentados.
- **`backend/Dockerfile`** — Multi-stage: etapa `dev` (nodemon) y `prod` (node).
- **`docs/diseño-original.md`** — Documentación del modelo de dominio.
- **`docs/guia-desarrollo-local.md`** — Guía de setup local.

---

## Pendiente de implementación

| Módulo | Descripción | Estado |
|---|---|---|
| `modules/aulas` | CRUD de edificios y aulas | ✅ Completado en v1.3 |
| `modules/academico` | Listados de UAs, carreras, materias, docentes, comisiones | ✅ Completado en v1.3 |
| `modules/asignaciones` | Motor automático + CRUD manual | ✅ Completado en v1.4 |
| `modules/conflictos` | Detección y gestión de conflictos de solapamiento | ✅ Completado en v1.5 |
| `modules/reportes` | Reportes de ocupación y disponibilidad | 🔲 Pendiente |
| Registro de usuarios | Endpoint `POST /api/auth/registro` | 🔲 Pendiente (baja prioridad) |
| Refresh tokens | Renovación de JWT sin re-login | 🔲 Pendiente (baja prioridad) |
| Tests | Suite de tests unitarios e integración | 🔲 Pendiente |
| nginx | Configuración de proxy reverso para producción | 🔲 Pendiente |

---

> **Convención para actualizar este archivo:**
> Cada vez que se implementa un bloque funcional, agregar una nueva entrada
> `## [vX.Y] — YYYY-MM-DD · Descripción` al inicio de la lista,
> respetando el orden cronológico descendente (más reciente primero).
