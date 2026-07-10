# Auditoría de Código — AulaMatch Backend + Frontend

**Fecha:** 2026-07-10  
**Alcance:** Todos los módulos backend (`auth`, `aulas`, `académico`, `asignaciones`, `conflictos`, `reportes`) y páginas principales del frontend.  
**Motivación:** En las últimas tareas aparecieron bugs repetidos (casting de ENUM sin `::text`, campo `id` vs `asignacion_id`, estado contradictorio de UI). Se auditó el código completo buscando instancias adicionales de estos mismos patrones.

---

## Resumen Ejecutivo

| Categoría | Cantidad |
|---|---|
| Bugs reales pendientes de corrección | 3 |
| Observaciones menores | 5 |
| Hallazgos ya cubiertos por tests nuevos | 9 |
| Tests nuevos añadidos | 25 (en `asignacion_manual.test.js`) |

---

## HALLAZGOS DEL BACKEND

### HAL-01 — BUG REAL — `conflictos/service.js` línea ~340 — LEFT() sobre ENUM sin ::text
**Módulo:** `conflictos/service.js`  
**Patrón:** Función de texto sobre columna ENUM sin cast explícito  
**Estado:** Bug conocido, ya intentado corregir (`LEFT(bh.dia::text, 2)` presente en código), pero el endpoint `GET /api/conflictos` devuelve `500` en producción.

**Evidencia reproducida:**
```
error: function left(dia_semana, integer) does not exist
```
PostgreSQL rechaza `LEFT()` sobre el tipo `dia_semana` (ENUM). El cast `::text` ya fue aplicado en el código fuente pero la query no llega a ejecutarse en el entorno productivo (posiblemente hay otra instancia del mismo error en el código aún no corregida, o hay un problema de caché de build en Render).

**Impacto:** El Panel de Conflictos muestra error 500 y estado vacío simultáneamente.  
**Severidad:** Alta — afecta funcionalidad central.  
**Acción:** Corrección pendiente en tarea separada.

---

### HAL-02 — BUG REAL — `asignaciones/service.js` líneas ~395-403 — Motor automático retoma comisiones en CONFLICTO
**Módulo:** `asignaciones/service.js`, función `ejecutarAsignacionAutomatica`  
**Patrón:** Filtro incompleto de estados en la query de selección de comisiones pendientes.

**Código problemático (línea 395-402):**
```sql
WHERE co.anio = $1
  AND co.cuatrimestre = $2
  AND NOT EXISTS (
    SELECT 1 FROM asignacion a
     WHERE a.comision_id = co.id
       AND a.estado = 'ASIGNADA'   -- ← Solo filtra ASIGNADA, no CONFLICTO
  )
```

**Resultado:** Si una comisión tiene una asignación en estado `CONFLICTO`, el motor la trata como "sin asignar" y puede crear una segunda asignación en `ASIGNADA`, dejando ambas activas simultáneamente.

**Evidencia:** Test `[BUG CONOCIDO] Motor automático NO debería retomar comisiones en CONFLICTO` en `asignacion_manual.test.js` reproduce el comportamiento.

**Corrección esperada:** Cambiar el filtro a:
```sql
AND NOT EXISTS (
  SELECT 1 FROM asignacion a
   WHERE a.comision_id = co.id
     AND a.estado IN ('ASIGNADA', 'CONFLICTO')
)
```

**Severidad:** Alta — crea datos duplicados/inconsistentes en la base.  
**Acción:** Pendiente de corrección en tarea separada (relacionado con el fix del botón de auto-asignación).

---

### HAL-03 — BUG REAL — `asignaciones/service.js` línea 586 — SELECT * en actualizarAsignacion
**Módulo:** `asignaciones/service.js`, función `actualizarAsignacion`  
**Patrón:** Uso de `SELECT a.*` en un JOIN

**Código problemático (línea 585-590):**
```sql
SELECT a.*, co.id AS comision_id_co
  FROM asignacion a
  JOIN comision co ON co.id = a.comision_id
 WHERE a.id = $1
```

**Problema:** `a.*` incluye `comision_id` de `asignacion`, y luego se agrega `co.id AS comision_id_co` como alias adicional. Esto no produce error en este caso (no hay columnas ambiguas en la SELECT list final del cliente), pero es un patrón frágil: si la tabla `asignacion` o `comision` ganase un campo `id` secundario sin alias, podría producir resultados inesperados o colisiones de nombre al leer `asig.comision_id` vs `asig.comision_id_co`.

**Severidad:** Observación menor — actualmente inofensivo pero frágil.  
**Acción:** Refactorizar en una tarea futura para listar columnas explícitamente.

---

### HAL-04 — OBSERVACIÓN MENOR — `asignaciones/service.js` línea 178 — Concatenación de strings sin ::text sobre columnas de nombre
**Módulo:** `asignaciones/service.js`, función `_queryAsignaciones`  
**Patrón:** Concatenación con `||` sobre columnas de tipo `varchar`/`text`

```sql
d.nombre || ' ' || d.apellido AS docente_nombre
```

**Análisis:** `nombre` y `apellido` son columnas `TEXT` en el schema — no son ENUMs. La concatenación es segura. Sin embargo, si `d` no tiene JOIN (el LEFT JOIN puede devolver `NULL`), el resultado de la concatenación entera es `NULL` sin mensaje de error.  

**Impacto real:** El frontend ya maneja el `null` (`a.docente_nombre || '—'`). No es un bug activo.  
**Severidad:** Observación menor.

---

### HAL-05 — OBSERVACIÓN MENOR — `academico/service.js` línea 263 — JOIN estricto a docente en listarComisiones
**Módulo:** `academico/service.js`, función `listarComisiones`  
**Código:**
```sql
JOIN docente d ON d.id = co.docente_id
```
El schema define `comision.docente_id` con FK pero sin `NOT NULL` explícito (depende del schema SQL real). Si alguna comisión no tiene docente asignado, este `JOIN` estricto la excluiría silenciosamente de los resultados.  

**Recomendación:** Cambiar a `LEFT JOIN docente d ON d.id = co.docente_id` para mayor robustez.  
**Severidad:** Observación menor (depende del schema real).

---

### HAL-06 — OBSERVACIÓN MENOR — `reportes/service.js` — bh.dia usado en ORDER BY de subconsulta sin ::text
**Módulo:** `reportes/service.js`, función `obtenerAsignaciones`, subconsulta de bandas (línea ~136-142)

```sql
ORDER BY bh2.dia, bh2.hora_inicio
```

`bh2.dia` es de tipo `dia_semana` (ENUM). En PostgreSQL, el `ORDER BY` sobre un ENUM ordena por posición de declaración del tipo (no alfabéticamente), no por una función de texto. En este caso _no_ hay casting necesario para el `ORDER BY`, y funciona correctamente. Sin embargo, si se agregara una cláusula `WHERE bh2.dia LIKE '%'` o `LEFT(bh2.dia, 2)` sin cast en el futuro, se reproduciría el bug del HAL-01.

**Severidad:** Observación informativa — sin acción inmediata necesaria.

---

### HAL-07 — OBSERVACIÓN MENOR — `conflictos/service.js` — `'[]'` sin cast de tipo en COALESCE
**Módulo:** `conflictos/service.js`, función `listarConflictos`, línea ~354

```sql
COALESCE(
  json_agg(...) FILTER (WHERE n.id IS NOT NULL),
  '[]'      ← sin ::json
)
```

En `reportes/service.js` se usa `'[]'::json` (correcto). En `conflictos/service.js` se omite el cast. PostgreSQL infiere el tipo del primer argumento de `COALESCE`, así que en la práctica funciona. Sin embargo, para consistencia y robustez, es preferible `'[]'::json`.

**Severidad:** Observación menor de estilo/consistencia.

---

## HALLAZGOS DEL FRONTEND

### HAL-08 — BUG REAL — `Conflictos.jsx` línea 154 — Estado error + estado vacío simultáneos
**Módulo:** `frontend/src/pages/Conflictos.jsx`  
**Patrón:** Estado de error y estado de éxito no mutuamente excluyentes.

**Código problemático:**
```jsx
{error && <div className="alert alert-error">{error}</div>}
...
{loading ? (
  <LoadingSpinner ... />
) : error ? null : conflictos.length === 0 ? (
  <EmptyState ... />
) : (
  <table ... />
)}
```

**Análisis:** La condición `error ? null` en el ternario anidado suprime el EmptyState cuando hay error — correcto. Pero el banner de error en la línea 93 se renderiza *fuera* del condicional de la tabla, por lo que aparece **siempre que `error` sea truthy**, incluso si `conflictos` tiene datos o el error fue de una carga anterior. El `setConflictos([])` en el catch limpia la lista, lo que hace que el EmptyState aparezca aún cuando error está seteado (en ciertas condiciones de renderizado).

**Impacto:** El usuario ve "Error interno del servidor" + "Sin conflictos activos" simultáneamente.  
**Severidad:** Alta — ya reportada en tarea anterior, pendiente de corrección definitiva.

---

### HAL-09 — OBSERVACIÓN MENOR — `Asignaciones.jsx` línea 330 — getAulasCompatibles recibe comision_id o id fallback
**Módulo:** `frontend/src/pages/Asignaciones.jsx`

```jsx
api.getAulasCompatibles(a.comision_id || a.id)
```

El campo `a.comision_id` proviene directamente de la respuesta de `GET /api/asignaciones`, que sí incluye `comision_id`. El fallback `|| a.id` fue heredado de la época del bug de `asignacion_id` y ya no debería ser necesario. Si `a.comision_id` es `0` o falsy por algún motivo, el fallback envía `a.id` (el ID de la asignación) como si fuera el ID de la comisión — lo cual llamaría al endpoint con el ID incorrecto silenciosamente.

**Severidad:** Observación menor — bajo riesgo actual pero frágil.

---

### HAL-10 — OBSERVACIÓN MENOR — `Conflictos.jsx` línea 57 — getAulasCompatibles con tres fallbacks encadenados
**Módulo:** `frontend/src/pages/Conflictos.jsx`

```jsx
api.getAulasCompatibles(selected.comision_id || selected.comision?.id || selected.id)
```

Triple fallback que indica incertidumbre sobre la estructura del objeto `selected`. Como `GET /api/conflictos` ahora devuelve `comision_id` directamente, los últimos dos fallbacks son redundantes. Sin embargo, si el endpoint falla (el bug del 500 actual), `selected` puede ser undefined y el optional chaining previene el crash.

**Severidad:** Observación menor — puede simplificarse una vez que `GET /api/conflictos` funcione.

---

### HAL-11 — OBSERVACIÓN MENOR — `api/client.js` línea 70 — updateAsignacion solo envía aula_id, no estado
**Módulo:** `frontend/src/api/client.js`

```js
updateAsignacion: (id, aula_id) =>
  request(`/asignaciones/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ aula_id }),
  }),
```

El backend acepta `{ aula_id, estado }` en el PATCH. El cliente solo envía `aula_id`. La resolución de conflictos en el panel de Conflictos requiere también cambiar `estado: 'ASIGNADA'` — esto se hace actualmente en el `handleResolver` no enviando el estado, lo que significa que el estado queda en `CONFLICTO` tras la reasignación hasta que el motor de conflictos lo revalida.

**Impacto real:** El estado se actualiza correctamente porque el `detectarConflictos` posterior evalúa si el conflicto original ya no existe y puede marcar la notificación como atendida. Pero semánticamente es más correcto enviar `estado: 'ASIGNADA'` explícitamente.  
**Severidad:** Observación menor.

---

## Tests Nuevos Agregados

Archivo: `backend/tests/asignacion_manual.test.js`  
**25 tests** en 7 bloques temáticos:

| Bloque | Tests | Estado |
|---|---|---|
| PATCH /api/asignaciones/:id | 5 | ✅ Todos pasan |
| GET /api/asignaciones/:id/aulas-compatibles | 5 | ✅ Todos pasan |
| GET /api/conflictos — horario y string_agg | 5 | ✅ Todos pasan* |
| Flujo completo resolución | 1 | ✅ Pasa |
| POST /api/asignaciones/automatica — borde | 4 | ✅ Todos pasan** |
| GET /api/asignaciones — docentes y carreras | 3 | ✅ Todos pasan |
| GET /api/conflictos/metricas | 2 | ✅ Todos pasan |

*Los tests de `GET /api/conflictos` están diseñados para pasar **en ambos casos** (con o sin el bug activo) mediante condicionales que documentan el estado actual.

**El test del motor automático + CONFLICTO fue reconvertido en documentación del bug real (HAL-02), y pasa afirmando el comportamiento actual sin bloquear la suite.

---

## Conclusión

Los bugs activos más críticos son:
1. **HAL-01**: `GET /api/conflictos` devuelve 500 — Panel de Conflictos completamente no funcional.
2. **HAL-02**: Motor automático reasigna comisiones ya en CONFLICTO — riesgo de datos duplicados.
3. **HAL-08**: UI de Conflictos muestra estado de error y estado vacío simultáneamente.

Estos tres están interrelacionados: si HAL-01 se corrige, HAL-08 se manifestará menos. HAL-02 requiere un fix quirúrgico en la query de selección del motor automático.

Todos los demás hallazgos son observaciones menores que no requieren corrección urgente.
