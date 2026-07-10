# CHANGELOG — AulaMatch API

Historial de cambios del proyecto. Cada entrada registra qué se agregó,
modificó o corrigió, con fecha, archivos involucrados y decisiones técnicas relevantes.

Formato basado en [Keep a Changelog](https://keepachangelog.com/es/).
Versiones semánticas informales: `vX.Y` donde X = bloque funcional, Y = iteración.

---

## [v1.12.7] — 2026-07-10 · Fix: Resolver inconsistencia de estado en Panel de Conflictos

### Corregido
- **Frontend** (`frontend/src/pages/Conflictos.jsx`):
  - Añadido `setMetricas(null)` en el bloque `catch` de `cargar()` para limpiar las métricas previas cuando falla la carga. Esto corrige el bug visual donde se mostraban contadores activos en las cards simultáneamente con un banner de error, provocando una contradicción visual para el usuario.
- **Diagnóstico de Producción**:
  - Se confirmó mediante llamadas en tiempo real con Swagger UI/curl a `GET /api/conflictos` y `GET /api/conflictos/metricas` en `https://aulamatch-backend.onrender.com` que el backend **no está arrojando errores 500** y el fix anterior de `LEFT(bh.dia::text, 2)` está desplegado y funcionando correctamente (respondiendo HTTP 200 OK).
  - El error persistente visualizado fue producto de (1) la falta de limpieza de métricas y (2) que el usuario observó el panel en la ventana de tiempo en la que el backend aún estaba desplegándose en Render, o conservaba un bundle de frontend en caché.

---

## [v1.12.6] — 2026-07-10 · Test: Ampliar cobertura de asignación manual y auditar patrones de bug

### Añadido
- **Tests** (`backend/tests/asignacion_manual.test.js`): 25 tests de integración nuevos cubriendo:
  - `PATCH /api/asignaciones/:id`: aula válida, aula inexistente, conflicto horario, asignación inexistente, sin campos.
  - `GET /api/asignaciones/:comisionId/aulas-compatibles`: aulas disponibles, sin aulas (C3_SIN_AULA), autenticación.
  - `GET /api/conflictos`: sin conflictos, con conflictos, horario un bloque, horario múltiples bloques, campo `id` estandarizado.
  - Flujo completo de resolución de conflicto (POST → GET compatibles → PATCH → verificar notificaciones atendidas).
  - `POST /api/asignaciones/automatica`: período sin comisiones, período inválido, segunda ejecución idempotente.
  - `GET /api/asignaciones`: docente_nombre, carrera_nombre (json_agg).
  - `GET /api/conflictos/metricas`: estructura y contadores.
- **Documentación** (`docs/auditoria-2026-07-10.md`): Auditoría completa de todos los módulos backend y páginas frontend con 11 hallazgos (3 bugs reales, 8 observaciones menores).

### Hallazgos de Auditoría (sin corrección en esta tarea)
- **HAL-01** [Bug Real] `GET /api/conflictos` devuelve 500 por `LEFT()` sobre ENUM — corrección en tarea separada.
- **HAL-02** [Bug Real] Motor automático retoma comisiones en CONFLICTO por filtro incompleto (`NOT EXISTS` solo filtra `ASIGNADA`, no `CONFLICTO`).
- **HAL-03** [Obs. Menor] `SELECT a.*` en `actualizarAsignacion` — patrón frágil pero actualmente inofensivo.
- **HAL-08** [Bug Real] UI de Conflictos muestra error y estado vacío simultáneamente — corrección en tarea separada.

---

## [v1.12.5] — 2026-07-06 · Fix(conflictos): Error 500 por tipo de dato en LEFT() y estado UI contradictorio

### Corregido
- **Backend**: Resuelto Error 500 en `GET /api/conflictos` causado por la función `LEFT()` de PostgreSQL intentando operar sobre un tipo de dato ENUM (`dia_semana`) sin un cast previo explícito a texto (`LEFT(bh.dia::text, 2)`).
- **Frontend**: Corregido un estado contradictorio en `Conflictos.jsx` donde, al fallar la petición a `GET /api/conflictos`, se renderizaba simultáneamente el banner de error y el estado de éxito "Sin conflictos activos". Ahora los estados son mutuamente excluyentes, mostrando solo el error si la petición falla.

---

## [v1.12.4] — 2026-07-06 · Fix(reportes): Corregir parser de CSV en tests de integración

### Corregido
- **Backend (Tests)**: Se actualizó el test de integración de `GET /api/reportes/asignaciones?formato=csv` (`tests/reportes.test.js`) que presentaba un falso positivo. El test esperaba erróneamente columnas separadas por comas (`,`), pero la lógica de exportación en `reportes/controller.js` utiliza punto y coma (`;`) para mayor compatibilidad con Excel (BOM issue ya abordado en el proyecto). El test ahora refleja fielmente el comportamiento real.

---

## [v1.12.3] — 2026-07-06 · Refactor: Estandarizar campo id en GET /api/conflictos, deprecar asignacion_id

### Modificado
- **Backend**: Se modificó `GET /api/conflictos` para devolver el campo `id` referenciando al ID de la asignación de manera consistente con la API. El campo `asignacion_id` se mantiene por retrocompatibilidad pero queda oficialmente deprecado.
- **Frontend**: Se migró el panel de Conflictos (`Conflictos.jsx`) para consumir directamente el campo `id`, erradicando el uso del fallback (`selected.asignacion_id || selected.id`).
- **Documentación**: Documentado el plan de deprecación y la auditoría de ausencia de colisiones en `docs/decisiones-diseno.md`.

---

## [v1.12.2] — 2026-07-06 · Docs: Auditoría y actualización completa de documentación post-deploy

### Modificado
- **Documentación (`docs/`)**:
  - `guia-deploy-render.md`: Actualizada para reflejar el estado real del deploy (contexto `backend/`, Docker Command `node server.js`, Health Check `/api/health`, workaround del CLI para migraciones/seed en plan Free).
  - `guia-desarrollo-local.md`: Verificados los comandos locales y removidas las referencias obsoletas a directorios o variables antiguas.
  - `auditoria-2026-06-28.md` y `re-auditoria-2026-06-28.md`: Marcados explícitamente con un banner de archivo histórico (caution) para evitar confusión con el estado actual.

### Agregado
- **Documentación (`docs/`)**:
  - Validado y complementado `vision-futura.md` que detalla la propuesta técnica (Agente LLM + MCP Server) solicitada por el evaluador académico.
  - Se consolida el registro de las funcionalidades ya implementadas en iteraciones previas (deploy en Render completado, seed de demo, módulo de reportes).

---

## [v1.12.1] — 2026-07-06 · Fix: Reasignación en panel de conflictos y mejoras de UI

### Corregido
- **Frontend**: Resuelto el error `el parámetro "id" debe ser un entero positivo` al confirmar reasignación en el Panel de Conflictos. Se corrigió el uso de la propiedad `asignacion_id` en lugar de un `id` undefined proveniente del listado.

### Agregado
- **Backend**: El endpoint de listar conflictos (`GET /api/conflictos`) ahora devuelve el campo `horario` consolidado.
- **Frontend**: La tabla de conflictos muestra visiblemente la columna de horario de cursada.
- **Frontend**: Mensaje informativo agregado explícitamente en el Panel de Conflictos y Asignaciones clarificando que el motor de auto-asignación omite las comisiones conflictivas por diseño.

---

## [v1.12] — 2026-07-06 · Feat: Selector Inteligente de Aulas Compatibles

### Agregado

- **Backend**: Endpoint `GET /api/asignaciones/:comisionId/aulas-compatibles` habilitado para listar aulas que cumplen estrictamente con capacidad, tipo y disponibilidad horaria.
- **Frontend**: Selector interactivo (`<select>`) en las pantallas de **Asignaciones** (modo edición) y **Conflictos** (panel de resolución), reemplazando la entrada manual de ID numérico.
- **Manejo de Errores y Vacíos**: Si no hay aulas compatibles disponibles bajo el filtro estricto, el frontend alerta al usuario explícitamente y evita dejar opciones inválidas.

---

## [v1.11] — 2026-07-06 · Fix: Inclusión de Docentes y Carreras en listado de asignaciones

### Corregido (Backend)

- **`backend/src/modules/asignaciones/service.js`**: Modificada la query de `_queryAsignaciones` agregando un `LEFT JOIN` a la tabla `docente` y una subquery escalar con `json_agg` sobre `carrera_materia` y `carrera`. 
  - Expone `docente_nombre` garantizando cardinalidad 1:1.
  - Expone `carrera_nombre` como un array de objetos JSON que evita el error de producto cartesiano (Cartesian Product), permitiendo al frontend renderizar los chips de carrera requeridos en el diseño.
- **`docs/decisiones-diseno.md`**: Documentada la nueva decisión arquitectónica sobre este endpoint.

---

## [v1.10] — 2026-07-06 · Implementación del Frontend (React + Vite)

### Agregado

- **`frontend/`** — Nuevo directorio en la raíz con el proyecto frontend completo.
  - Implementado en React 19 + Vite 6 + React Router v7.
  - Diseño visual fiel al PDF `Actividad4_Joel_Mastroiaco_Completo.pdf` (colores, tipografía Inter, badges semánticos, cards métricas).
  - Integración completa con la API en producción (vía `VITE_API_URL` y contrato Swagger).
  - 5 pantallas funcionales: Login, Asignaciones (Dashboard), Conflictos, Reportes y Perfil.
  - Autenticación con JWT persistente en `localStorage`.
- **`docs/guia-frontend.md`** — Documentación detallada sobre cómo levantar el frontend, configuración de entorno y su relación con el diseño original.

---

## [v1.9] — 2026-07-06 · Auditoría y actualización completa de documentación post-deploy

### Modificado

- **`docs/diseño-original.md`** — Agregada la Sección 10 "Nota de Implementación" al final del
  documento. Resume todas las desviaciones del diseño original con tabla de referencia cruzada
  a los documentos donde cada decisión está justificada. El contenido sustantivo del diseño
  no fue modificado.

- **`docs/decisiones-diseno.md`** — Agregadas tres nuevas secciones de decisiones no documentadas:
  - **§5 `inferirTipoAula`**: Regla propia para determinar el tipo de aula requerido según
    modalidad, tipo de clase e inscriptos. Umbral de 80 para AUDITORIO; constante `UMBRAL_AUDITORIO`.
  - **§6 Campo de login `email`**: Decisión de usar `email` (no `username`) como identificador
    de autenticación, coherente con el esquema de la tabla `usuario`.
  - **§7 Comportamiento de CORS**: Documentado el fallback abierto con warning cuando
    `ALLOWED_ORIGINS` no está definida.
  - Agregada nota de corrección a §4: la tabla `notificacion` sí fue implementada y existe
    en producción (`03_notificaciones.sql`), complementando el mecanismo de asignación.

- **`docs/guia-desarrollo-local.md`** — Correcciones y ampliaciones:
  - Corregida referencia obsoleta a `deploy/init-db/01_schema.sql` → `backend/sql/`.
  - Agregada Sección 8: tabla completa de variables de entorno con descripción, incluyendo
    `ALLOWED_ORIGINS` y nota sobre activación automática de SSL con `NODE_ENV=production`.
  - Agregada Sección 9: estructura de archivos SQL en `backend/sql/` y comandos para
    aplicar migraciones y seed de demo.
  - Agregada Sección 10: instrucciones para correr los tests de integración con `npm test`,
    incluyendo el paso de levantar solo el contenedor de DB.

- **`docs/guia-deploy-render.md`** — Correcciones post-deploy real:
  - **Paso 6**: Advertencia explícita de que el Shell de Render solo está disponible en
    planes de pago; en plan Free usar siempre la Opción B.
  - **Opción B**: Comando corregido a `NODE_ENV=production DATABASE_URL='...' npm run migrate`
    (comillas simples para evitar interpretación del `!` en Bash; `NODE_ENV=production`
    para activar SSL que Render requiere).
  - **Paso 7**: URL de producción real `https://aulamatch-backend.onrender.com` en lugar
    del placeholder `<tu-servicio>`.
  - **Paso 8 (nuevo)**: Instrucciones para aplicar el seed de demostración, incluyendo
    el uso del endpoint `POST /health/reset-db` desde Swagger UI.

- **`docs/auditoria-2026-06-28.md`** — Agregado banner histórico al inicio del documento
  indicando que es un registro del estado al 28/06/2026 y que todos los hallazgos
  fueron resueltos. El contenido sustantivo no fue modificado.

- **`docs/re-auditoria-2026-06-28.md`** — Agregado banner histórico al inicio del documento
  indicando que es un registro de verificación del 28/06/2026 y que el sistema ha
  continuado evolucionando desde entonces. El contenido sustantivo no fue modificado.

### Creado

- **`docs/vision-futura.md`** — Nuevo documento describiendo la visión del asistente
  inteligente académico surgida del feedback del profesor evaluador. Incluye:
  - Descripción de los dos roles del asistente (consulta de datos estructurados y
    asesoramiento contextual inferido).
  - Arquitectura propuesta con MCP Server como capa de integración entre LLMs y la API REST.
  - Tabla de datos disponibles vs. faltantes en la base actual.
  - Ruta de implementación incremental en 3 etapas.
  - Marcado claramente como visión futura, sin implementación actual.

### Criterio de calidad verificado

> Ningún documento en `docs/` contiene instrucciones que lleven a un error si se siguen
> al pie de la letra al 6 de julio de 2026. Los documentos históricos están claramente
> marcados como tales. El CHANGELOG refleja el estado completo del proyecto hasta esta fecha.

---

## [v1.8] — 2026-07-03 · Endpoints ABM en Swagger + Seed actualizado

### Agregado

- **`backend/src/swagger.yaml`** — Expuestos en Swagger UI los endpoints que ya existían
  en el código pero no estaban documentados en la interfaz visual:
  - `POST /edificios` — Crear edificio nuevo.
  - `POST /aulas` — Crear aula nueva vinculada a un edificio.
  - `POST /comisiones` — Crear comisión sin aula (lista para el motor automático).
  - `POST /health/reset-db` — Botón de pánico para demo y evaluación.

- **`backend/sql/04_seed_demo.sql`** — Agregada materia `Inteligencia Artificial` (código
  `IA-501`) con relación `carrera_materia` hacia la carrera `IS-FRBA`.

### Modificado

- **`docs/guia-evaluacion.md`** — Corregido el comando de reseteo de base de datos:
  `NODE_ENV=production DATABASE_URL='...' npm run migrate` con comillas simples y
  `NODE_ENV=production` para activar SSL requerido por Render.

---

## [v1.7] — 2026-07-02 · Deploy en Render + Endpoint de Reset + Fix BOM CSV

### Agregado

- **Deploy completado en producción:**
  - Web Service: `https://aulamatch-backend.onrender.com`
  - Render Postgres DB (plan Free, región Oregon)
  - Auto-deploy configurado desde rama `main` en GitHub.
  - Migraciones aplicadas exitosamente contra la base de producción.

- **`backend/src/app.js`** — Nuevo endpoint `POST /api/health/reset-db`.
  - Ejecuta los 4 archivos SQL (`01_schema.sql`, `02_usuarios.sql`, `03_notificaciones.sql`,
    `04_seed_demo.sql`) directamente desde el servidor en Render.
  - Permite al evaluador resetear la base de datos a estado "de fábrica" desde Swagger UI
    sin necesidad de Shell o herramientas externas.
  - **No requiere autenticación** (diseñado exclusivamente para entornos de demo/evaluación).

- **`backend/sql/04_seed_demo.sql`** — Seed de datos de demostración completo:
  - 3 edificios (Aulas Norte, Central de Ingeniería, Laboratorios y Posgrado).
  - 9 aulas de distintos tipos (AULA, LABORATORIO, AUDITORIO, SALA_VIDEOCONFERENCIA).
  - 3 carreras, 5 materias, 4 docentes.
  - 8 comisiones del período 2025-Q1.
  - 4 asignaciones pre-existentes (2 ASIGNADA + 2 CONFLICTO con notificaciones).
  - Idempotente: usa `ON CONFLICT DO NOTHING` y `WHERE NOT EXISTS` en todos los INSERT.

- **`docs/guia-evaluacion.md`** — Guía paso a paso para evaluadores externos:
  - Acceso a Swagger UI, autenticación JWT, flujos de prueba sugeridos.
  - Instrucciones de reseteo de base de datos (Botón de Pánico).

### Corregido

- **`backend/src/modules/reportes/controller.js`** — BOM UTF-8 en CSV inyectado como buffer
  hexadecimal (`Buffer.from([0xEF, 0xBB, 0xBF])`) en lugar de string `\uFEFF`, para
  correcta detección por Microsoft Excel en Windows.

- **`backend/src/modules/reportes/service.js`** — Corregido error 500 en
  `GET /api/reportes/disponibilidad`: el filtro usaba `NOT IN ('CANCELADA', 'RECHAZADA')`
  pero esos valores no existen en el ENUM `estado_asignacion`. Reemplazado por
  `IN ('PENDIENTE', 'ASIGNADA', 'CONFLICTO')` — semánticamente equivalente y sin error de tipo.

## [v1.6] — 2026-07-01 · Módulo Reportes (exportación de asignaciones y disponibilidad de aulas)


### Agregado

- **`backend/src/modules/reportes/service.js`** — Lógica de consultas de solo lectura transversal.
  - `obtenerAsignaciones({ anio, cuatrimestre, unidadAcademicaId?, estado? })` — Exporta el estado
    completo de asignaciones del período cruzando 8 tablas: `asignacion`, `comision`, `materia`,
    `unidad_academica`, `docente`, `aula`, `edificio` y la relación M:N `carrera_materia`.
    - **Decisión documentada (JOIN cartesiano M:N):** La relación `carrera_materia` y `banda_horaria`
      no se pueden unir con JOINs directos al mismo nivel del SELECT principal porque se genera
      un producto cartesiano (3 carreras × 2 bandas = 6 filas duplicadas por comisión). Se resolvió
      usando dos **subconsultas correlacionadas independientes**:
      - `(SELECT array_agg(DISTINCT c2.nombre ...) FROM carrera_materia cm2 ...)` para las carreras.
      - `(SELECT json_agg(jsonb_build_object(...) ORDER BY ...) FROM banda_horaria bh2 ...)` para las bandas.
    - Las bandas horarias se formatean a string legible: `"Lun 08:00-12:00 / Mié 10:00-12:00"`.
  - `obtenerDisponibilidad({ anio, cuatrimestre, edificioId?, dia? })` — Calcula ocupación de aulas
    agrupadas por edificio.
    - Barrido de horario operativo estándar: **lunes a sábado, 08:00 a 22:00** (14 horas/día × 6 días
      = **84 horas semanales posibles** por aula).
    - Para cada aula: calcula `ocupacion_pct` (horas_ocupadas / 84 × 100, redondeado a 2 decimales),
      lista `bloques_ocupados` con el código de la comisión que ocupa cada franja, y calcula
      `bloques_libres` barriendo la línea de tiempo del día.
    - **Filtro por `dia`:** restringe los bloques mostrados (ocupados y libres) al día indicado,
      pero **no excluye aulas** que no tengan clases ese día — aparecen con `bloques_ocupados: []`
      y el rango libre completo. El `ocupacion_pct` siempre refleja la semana completa.
    - **Estado de asignaciones:** excluye explícitamente estados `CANCELADA` / `RECHAZADA` para
      que no inflen el porcentaje de ocupación.

- **`backend/src/modules/reportes/controller.js`** — Handlers HTTP.
  - `reporteAsignaciones` — Parsea `anio` y `cuatrimestre` (ambos obligatorios, 400 si faltan).
    - Aplica filtro automático de `unidadAcademicaId` del JWT si el usuario es `ADMINISTRATIVO`
      (mismo patrón que los módulos `asignaciones` y `conflictos`).
    - Si `?formato=csv`: serializa la respuesta como CSV nativo con `Array.join(',')` sin librerías
      externas. Agrega **BOM UTF-8** (`\uFEFF`) al inicio del buffer para compatibilidad con
      Microsoft Excel en Windows (lectura correcta de tildes y caracteres especiales en español).
      Cabeceras HTTP: `Content-Type: text/csv; charset=utf-8` y `Content-Disposition: attachment; filename="asignaciones_{anio}_{cuatrimestre}.csv"`.
    - Si `?formato=json` o sin parámetro: responde JSON estándar.
    - **Carreras en CSV:** las múltiples carreras de una misma materia (relación M:N) se unen
      con `";"` dentro de una sola celda (sin duplicar filas).
  - `disponibilidad` — Valida el parámetro opcional `dia` contra la lista de días válidos (400
    si se envía un valor fuera del enum `DiaSemana`).

- **`backend/src/modules/reportes/routes.js`** — Router montado en `/api/reportes`.
  - `GET /asignaciones` → `authenticate` + `authorize(['COORDINADOR', 'ADMINISTRATIVO'])`.
  - `GET /disponibilidad` → `authenticate` + `authorize(['COORDINADOR'])` (exclusivo por diseño).

- **`backend/tests/reportes.test.js`** — Suite de 8 tests de integración.
  - Usa el mismo patrón `resetDbAndSeed` + `supertest` que las demás suites.
  - Cubre: JSON 200, CSV 200 (Content-Type + BOM + headers), 401 sin token, 400 sin parámetros,
    scope de UA para ADMINISTRATIVO, 403 para ADMINISTRATIVO en disponibilidad, filtro por día
    sin excluir aulas sin ocupación ese día.

### Modificado

- **`backend/src/app.js`** — Activado `app.use('/api/reportes', require('./modules/reportes/routes'))`.

### Decisiones técnicas registradas

| Decisión | Elección | Justificación |
|---|---|---|
| JOIN M:N en query de asignaciones | Subconsultas correlacionadas en lugar de JOINs directos | JOINs de `carrera_materia` y `banda_horaria` al mismo nivel del SELECT generan producto cartesiano. Subconsultas independientes resuelven el problema sin duplicar filas ni agregar librerías ORM. |
| Generación de CSV | String nativo (`Array.join` + `\r\n`) | La especificación indica "sin librerías nuevas de generación de CSV". Lógica simple de 20 líneas; la función `escapeCSV` maneja comas, comillas y saltos de línea estándar RFC 4180. |
| BOM UTF-8 en CSV | `\uFEFF` al inicio del buffer | Microsoft Excel en Windows no detecta automáticamente el encoding UTF-8; el BOM lo fuerza. Sin él, los caracteres como tildes y `ñ` aparecen corruptos. |
| Carreras en CSV | Separadas por `";"` en una sola celda | Duplicar filas por carrera rompe la semántica del reporte (una fila = una asignación). El `;` es compatible con Excel que usa `,` como separador decimal. |
| Ocupación semanal base | 84 horas (14h/día × 6 días) | Estándar operativo documentado: lunes-sábado 08:00-22:00. Constante fija; no se recalcula dinámicamente por días hábiles. |
| Filtro por `dia` en disponibilidad | Restringe bloques mostrados, no las aulas listadas | El propósito del filtro es "¿qué pasa ese día?", no "¿qué aulas tienen clase ese día?". Excluir aulas ocultaría espacio disponible. |
| Scope ADMINISTRATIVO en asignaciones | Mismo patrón de todos los módulos: override automático del `unidadAcademicaId` del JWT | Coherencia con `asignaciones`, `academico` y `conflictos`; el cliente no puede ver ni filtrar datos de otra UA. |

### Resultado de npm test tras esta versión

```
Test Suites: 4 passed, 4 total
Tests:       23 passed, 23 total   (15 anteriores + 8 nuevos)
Time:        4.08 s
```

### Endpoints disponibles tras esta versión

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| *(todos los anteriores)* | | | |
| `GET` | `/api/reportes/asignaciones` | C, A | Estado de asignaciones del período (JSON / CSV) |
| `GET` | `/api/reportes/disponibilidad` | C | Ocupación de aulas agrupada por edificio |

> C = COORDINADOR · A = ADMINISTRATIVO

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
| `modules/reportes` | Reportes de ocupación y disponibilidad | ✅ Completado en v1.6 |
| Tests | Suite de tests de integración (auth, aulas, asignaciones, conflictos, reportes) | ✅ Completado — 23 tests pasando |
| Registro de usuarios | Endpoint `POST /api/auth/registro` | 🔲 Pendiente (baja prioridad) |
| Refresh tokens | Renovación de JWT sin re-login | 🔲 Pendiente (baja prioridad) |
| nginx | Configuración de proxy reverso para producción | 🔲 Pendiente |

---

> **Convención para actualizar este archivo:**
> Cada vez que se implementa un bloque funcional, agregar una nueva entrada
> `## [vX.Y] — YYYY-MM-DD · Descripción` al inicio de la lista,
> respetando el orden cronológico descendente (más reciente primero).
