# Auditoría Técnica Integral — Actividad N°4 AulaMatch
**Panel evaluador:** Arquitecto de software senior · Diseñador UX/UI senior · Docente evaluador UNSAM  
**Documento auditado:** Actividad4_Joel_Mastroiaco_Completo.pdf  
**Fecha de revisión:** 2026-07-01

---

## 1. Resumen Ejecutivo

El trabajo presenta un nivel de coherencia interna superior al promedio para la materia: las decisiones de modelado están justificadas, el diagrama de clases se mapea con fidelidad al esquema relacional y la trazabilidad funcional → endpoint → entidad está explícitamente documentada en la Sección 10.6. Se identificaron **2 hallazgos críticos**, **4 moderados**, **3 menores** y **4 sugerencias de mejora**. Los críticos son: (1) la inconsistencia entre el estado `PENDIENTE` del esquema relacional y la ausencia de ese estado en los wireframes del Panel de Asignaciones, y (2) la contradicción entre el pseudocódigo del motor automático (que selecciona `aulasDisponibles[0]` sin ordenar por capacidad sobrante, contradiciendo su propio comentario). Los puntos moderados son resolubles con aclaraciones textuales antes de la defensa.

---

## 2. Matriz de Hallazgos

| # | Sección/Figura | Hallazgo | Severidad | Recomendación |
|---|----------------|----------|-----------|---------------|
| 1 | Sec. 10.3 — Pseudocódigo | Motor automático selecciona `aulasDisponibles[0]` pero no ordena por capacidad sobrante antes de ese `[0]`, contradiciendo el comentario inline | **CRÍTICO** | Agregar línea de ordenamiento: `aulasDisponibles ← ordenarPorCapacidadSobranteAscendente(aulasDisponibles)` antes del `SI` |
| 2 | Sec. 3 (wireframes) vs Sec. 8.1 | `EstadoAsignacion` define `PENDIENTE · ASIGNADA · CONFLICTO`, pero el Panel de Asignaciones no muestra badge para estado `PENDIENTE` (solo verde/rojo en los prototipos descriptos) | **CRÍTICO** | Documentar el badge amarillo para `PENDIENTE` o aclarar que las comisiones sin aula no aparecen en el panel |
| 3 | Sec. 10.6 — Trazabilidad | Fila "Notificación ante conflicto" lista `(tabla notificaciones)` como entidad, pero esa tabla no existe en el esquema relacional de la Sec. 8.2 ni en el diagrama de clases | **MODERADO** | Aclarar que notificaciones se implementan como polling sobre `asignacion.estado`, sin tabla separada, o agregar la tabla al esquema |
| 4 | Sec. 7.1 — Secuencia vs Sec. 10.2 | El diagrama de secuencia usa la ruta `GET /conflictos` (sin prefijo `/api/`) mientras que Sec. 10.2 define `GET /api/conflictos` | **MODERADO** | Unificar nomenclatura: agregar prefijo `/api/` en el diagrama de secuencia |
| 5 | Sec. 10.4 — JWT | `unidadAcademicaId: 3` incluido en el payload del COORDINADOR, pero un Coordinador tiene acceso total (no necesita scope por UA). Dato superfluo que puede generar confusión en implementación | **MODERADO** | Aclarar que para COORDINADOR ese campo es ignorado por los middlewares, o emitirlo como `null` |
| 6 | Sec. 9 — Despliegue vs Sec. 6 — Arquitectura | Sección 9 menciona que el frontend es "React compilado servido por Nginx interno", pero Sec. 6 no describe React ni framework JS alguno; solo dice "interfaz web responsive" | **MODERADO** | En Sec. 6 agregar una nota indicando que la capa de Presentación se implementa en React (o el framework elegido), para no dejar ambigüedad |
| 7 | Sec. 8.2 — `comision` vs Sec. 5.1 — Clases | La tabla `comision` no tiene FK a `unidad_academica` directa; la relación pasa por `materia → unidad_academica`. Esto es correcto por diseño, pero el diagrama de clases no muestra esa navegación indirecta con suficiente claridad | **MENOR** | Agregar nota al pie del diagrama de clases aclarando la ruta de navegación `Comision → Materia → UnidadAcademica` |
| 8 | Sec. 8.1 — Enumeraciones vs Sec. 10.3 | `EstadoAsignacion` en Sec. 8.1 tiene `PENDIENTE · ASIGNADA · CONFLICTO`. El pseudocódigo de Sec. 10.3 crea asignaciones con `estado="ASIGNADA"` directamente, saltando `PENDIENTE` | **MENOR** | Aclarar en el pseudocódigo que el motor automático crea con `ASIGNADA` directamente; `PENDIENTE` es para creación manual sin aula aún confirmada |
| 9 | Sec. 9 — .env de ejemplo | `DATABASE_URL` contiene `...` como placeholder en la cadena de conexión; si se copia sin editar, el backend falla con error de parsing | **MENOR** | Cambiar a `DATABASE_URL=postgresql://aulamatch_user:${POSTGRES_PASSWORD}@db:5432/aulamatch` con sintaxis explícita |
| 10 | Sec. 4 — Justificación Q3 | Afirmación "El Panel de Conflictos como pantalla independiente evita que el flujo interrumpa la vista de asignaciones" no está respaldada por datos de usabilidad; es una hipótesis de diseño | **SUGERENCIA** | Reemplazar por referencia a un patrón conocido (ej: "separación de concerns en navegación, patrón Hub & Spoke") |
| 11 | Sec. 2 — Prompt Midjourney | El prompt especifica `"dark mode"` pero los wireframes funcionales de Figma AI muestran interfaz en modo claro (fondo blanco, tabla con filas grises) | **SUGERENCIA** | Aclarar en Sec. 4 que se decidió el modo claro en Figma por legibilidad en contexto institucional, y el prompt fue iterado |
| 12 | Sec. 10.5 — Conflictos | El pseudocódigo filtra `estado != "CONFLICTO"` al detectar superposición, lo que significa que dos comisiones en conflicto entre sí no generan conflicto recursivo. Decisión válida pero no documentada | **SUGERENCIA** | Agregar una línea explicando que el filtro evita auto-detección de conflictos ya marcados (idempotencia) |
| 13 | Sec. 10.4 — JWT | `alg: HS256` es un algoritmo simétrico; si el secret se filtra, todos los tokens históricos son falsificables. No se menciona rotación de secret | **SUGERENCIA** | Agregar nota sobre rotación periódica del `JWT_SECRET` y expiración de 8h como mitigación principal |

---

## 3. Análisis del Modelo de Dominio (UML ↔ Esquema Relacional)

### 3.1 Cobertura de entidades

| Entidad UML (Sec. 5.1) | Tabla relacional (Sec. 8.2) | Coincidencia |
|------------------------|-----------------------------|--------------|
| UnidadAcademica | unidad_academica | ✅ Exacta |
| Edificio | edificio | ✅ Exacta |
| Aula | aula | ✅ Exacta |
| Carrera | carrera | ✅ Exacta |
| Materia | materia | ✅ Exacta |
| Docente | docente | ✅ Exacta |
| Comision | comision | ✅ Exacta |
| BandaHoraria | banda_horaria | ✅ Exacta (snake_case correcto) |
| Asignacion | asignacion | ✅ Exacta |
| — | carrera_materia | ✅ Tabla de unión M:N, documentada en ambas secciones |

**Resultado:** Las 9 entidades del UML tienen su contraparte relacional. No hay entidades huérfanas en ninguna dirección.

### 3.2 Atributos — divergencias detectadas

| Atributo | Clase UML | Tabla relacional | Observación |
|----------|-----------|------------------|-------------|
| `edificio_preferencia_id` | No listado explícitamente en diagrama | Presente en `unidad_academica` | El diagrama menciona la relación `UnidadAcademica → Edificio` (preferencia), pero como asociación, no como atributo visible. Coherente por UML estándar; no es error. |
| `tipo_clase` en BandaHoraria | Presente en clase | Presente en tabla | ✅ |
| `cargo` en Docente | No mencionado en decisiones de modelado | Presente en tabla como NULLABLE | Atributo adicional válido; no contradice el UML si el diagrama lo incluye. |

### 3.3 Cardinalidades

| Relación | UML declara | Relacional implementa | Veredicto |
|----------|-------------|----------------------|-----------|
| Comision → BandaHoraria | 1..* | `comision_id FK NOT NULL` en `banda_horaria` | ✅ Correcto |
| Carrera ↔ Materia | M:N | Tabla `carrera_materia` con PK compuesta | ✅ Correcto |
| Asignacion → Comision | 1:1 (implícito) | `comision_id FK NOT NULL` sin UNIQUE explícito | ⚠️ Sin constraint UNIQUE en `comision_id`, el esquema permite múltiples asignaciones activas para la misma comisión. Considerar agregar `UNIQUE (comision_id)` o manejar la unicidad en capa de negocio. |
| Aula → Edificio | N:1 | `edificio_id FK NOT NULL` | ✅ Correcto |

### 3.4 Coherencia con el Diagrama de Casos de Uso

- El UC "Filtrado por Carrera en UC4, UC13 y UC14" (Sec. 5.2) está soportado por la FK `carrera_id` en `carrera_materia` y los endpoints `GET /api/carreras` y `GET /api/materias` con filtros (Sec. 10.2). ✅
- El UC "Consultar aulas disponibles" como `«include»` está soportado por `GET /api/asignaciones/:id/aulas-compatibles`. ✅
- El UC "Gestionar excepción" como `«extend»` está soportado por `POST /api/comisiones`. ✅

---

## 4. Análisis de Trazabilidad (UML → Backend → Frontend)

### 4.1 Verificación Sección 10.6 contra Sección 10.2

| Funcionalidad (10.6) | Endpoint declarado | ¿Existe en 10.2? | Entidades coherentes con Sec. 8? |
|---------------------|-------------------|------------------|----------------------------------|
| Asignación automática masiva | POST /api/asignaciones/automatica | ✅ | ✅ |
| Asignación manual asistida | GET /api/asignaciones/:id/aulas-compatibles | ✅ | ✅ |
| Gestión de excepciones | POST /api/comisiones | ✅ | ✅ |
| Detección superposición | POST /api/conflictos/detectar | ✅ | ✅ |
| Detección cupo excedido | trigger interno | No hay endpoint dedicado en 10.2 (correcto, es interno) | ✅ |
| Notificación ante conflicto | acción post-detección | No hay endpoint; depende de polling `GET /api/conflictos/metricas` | ⚠️ Lista `(tabla notificaciones)` inexistente en Sec. 8.2 — **Hallazgo #3** |
| Panel de Conflictos — métricas | GET /api/conflictos/metricas | ✅ | ✅ |
| Resolución — reasignación | PATCH /api/asignaciones/:id | ✅ | ✅ |
| Filtros por UA, Carrera, Edificio, Turno | GET /api/asignaciones | ✅ | ✅ |
| Exportación de reportes | GET /api/reportes/asignaciones | ✅ | ✅ |
| Login | POST /api/auth/login | ✅ | N/A (tabla usuarios no en dominio) |

### 4.2 Cobertura wireframes → endpoints

| Pantalla (Sec. 3) | Endpoint/módulo de soporte | Capa en Sec. 6 | Estado |
|-------------------|---------------------------|----------------|--------|
| Login | POST /api/auth/login | Autenticación | ✅ |
| Panel de Asignaciones | GET /api/asignaciones, POST /api/asignaciones/automatica | Asignación | ✅ |
| Panel de Conflictos | GET /api/conflictos, GET /api/conflictos/metricas, PATCH /api/asignaciones/:id | Conflictos | ✅ |
| Perfil / Configuración | GET /api/auth/me (parcialmente) | Autenticación | ⚠️ No hay endpoint de actualización de perfil en Sec. 10.2; si la pantalla permite editar datos, falta el PATCH correspondiente |

---

## 5. Análisis de los Diagramas de Comportamiento

### 5.1 Diagrama de Secuencia (Sec. 7.1) vs Endpoints (Sec. 10.2)

| Paso del diagrama | Ruta usada en diagrama | Ruta en Sec. 10.2 | Coherencia |
|-------------------|----------------------|-------------------|------------|
| Apertura del panel | `GET /conflictos` | `GET /api/conflictos` | ❌ Falta prefijo `/api/` — **Hallazgo #4** |
| Consulta aulas compatibles | `GET /asignaciones/{id}/aulas-compatibles` | `GET /api/asignaciones/:id/aulas-compatibles` | ❌ Mismo problema de prefijo |
| Confirmación reasignación | `PATCH /asignaciones/{id}` | `PATCH /api/asignaciones/:id` | ❌ Mismo problema |
| Verbos HTTP | GET, PATCH (correctos) | GET, PATCH | ✅ Verbos coherentes |

**Diagnóstico:** El diagrama de secuencia omite el prefijo `/api/` en todas las rutas. Es una inconsistencia de nomenclatura (no de lógica), fácil de corregir con una nota al pie del diagrama.

### 5.2 Diagrama de Actividades (Sec. 7.2) vs Pseudocódigo de Conflictos (Sec. 10.5)

| Aspecto | Diagrama de Actividades | Pseudocódigo Sec. 10.5 | Coherencia |
|---------|------------------------|------------------------|------------|
| Orden de verificaciones | Superposición → Cupo | Superposición → Cupo | ✅ |
| Resultado de detección | Registrar conflicto + Notificar | `marcarConflicto()` + `notificar()` | ✅ |
| Carácter obligatorio de notificación | Flujo forzado (sin bifurcación de omisión) | `// ← obligatorio e inmediato` | ✅ |
| Filtro `estado != "CONFLICTO"` | No visible en el diagrama | Presente en pseudocódigo | ⚠️ El diagrama no muestra este filtro; podría generar confusión en una defensa. Aclarar en el texto descriptivo del diagrama. |
| Trigger de activación | "al crear o modificar Asignacion" | "trigger síncrono" | ✅ Consistente |

**Diagnóstico:** Los dos artefactos son lógicamente equivalentes. La única brecha es la ausencia del filtro de idempotencia en el diagrama de actividades.

---

## 6. Análisis UX/UI y Justificación de Diseño

### 6.1 Coherencia Prompt Midjourney (Sec. 2) → Figma AI (Sec. 3) → Justificación (Sec. 4)

El prompt de Midjourney describe una interfaz `dark mode` con paleta azul/gris oscuro. Los wireframes de Figma AI que se documentan en Sec. 3 usan fondo blanco con acentos en `#1E40AF` (azul institucional). Existe una **discontinuidad visual entre el prompt y los wireframes finales** — **Hallazgo #11**.

Sin embargo, la Sec. 4 (pregunta 4) documenta explícitamente dos iteraciones: abandono del calendario y adopción de chips de Carrera. No documenta la iteración del modo oscuro → claro, lo que deja ese salto sin justificación escrita. En defensa oral, puede surgir como pregunta.

### 6.2 Solidez argumentativa de la Sec. 4

| Pregunta | Argumento presentado | ¿Sustentado en el documento? | Evaluación |
|----------|---------------------|------------------------------|------------|
| Q1 — Herramientas y justificación | Midjourney para visual, Figma AI para wireframes funcionales | Sí, Secciones 2 y 3 | ✅ Sólido |
| Q2 — Coherencia con problema | Tabla densa con filtros para alta densidad de datos | Sí, Sec. 1 describe el problema de gestión manual | ✅ Sólido |
| Q3 — Ventajas UX | Badges semánticos, chips M:N, panel de conflictos separado | Parcialmente; no hay métricas ni referencia a patrones UX | ⚠️ Hipótesis razonable pero no anclada — **Hallazgo #10** |
| Q4 — Mejoras detectadas | Dos iteraciones concretas documentadas | Sí, iteraciones identificables | ✅ Sólido |

---

## 7. Análisis de la Propuesta Técnica

### 7.1 Guía de Despliegue (Sec. 9) vs Arquitectura Lógica (Sec. 6)

La Sec. 6 define 3 capas lógicas. El docker-compose.yml de Sec. 9 define 4 servicios: `db`, `backend`, `frontend`, `nginx`. La correspondencia es:

| Capa lógica (Sec. 6) | Servicio Docker (Sec. 9) | Coherencia |
|---------------------|--------------------------|------------|
| Persistencia | `db` (postgres:16-alpine) | ✅ |
| Lógica de Negocio | `backend` (Node.js+Express) | ✅ |
| Presentación | `frontend` (React compilado) | ⚠️ Sec. 6 no menciona React — **Hallazgo #6** |
| — | `nginx` (proxy reverso) | ✅ Correctamente separado como infraestructura, no capa de negocio |

El docker-compose soporta adecuadamente la arquitectura de 3 capas. El servicio `nginx` actúa como gateway de entrada, coherente con una arquitectura REST stateless.

### 7.2 Algoritmo de Asignación Automática (Sec. 10.3)

**Criterio 1 — Cupo:** `buscarAulas(capacidad >= cupoRequerido)` ✅  
**Criterio 2 — Tipo de aula:** `buscarAulas(tipo >= tipoClaseReq)` ✅ (usa comparación ordinal implícita)  
**Criterio 3 — Franja horaria:** `existeSuperposicion(aula, bandasHorarias)` ✅  
**Criterio 4 — Edificio preferido:** `filtrarPorEdificio(aulasCandidatas, edificioPref)` ✅

**Bug crítico detectado:** El pseudocódigo dice en comentario `"menor capacidad sobrante"` para seleccionar la mejor aula, pero el código ejecuta directamente `aulasDisponibles[0]` sin ordenar por ese criterio previamente. Si `aulasDisponibles` no está ordenada por capacidad sobrante ascendente, el primer elemento puede ser un Auditorio de 300 asientos para una comisión de 20 alumnos. **Hallazgo #1.**

**Corrección propuesta:**
```
// Antes del SI aulasDisponibles NO está vacío:
aulasDisponibles ← ordenarPorCapacidadSobranteAscendente(aulasDisponibles)
// donde capacidad sobrante = aula.capacidad - comision.inscriptos
```

**Estado `PENDIENTE` en el flujo:** El pseudocódigo crea asignaciones directamente con `estado="ASIGNADA"`. Sin embargo, `EstadoAsignacion` define `PENDIENTE` como valor válido (Sec. 8.1). No hay pseudocódigo que explique cuándo una asignación inicia como `PENDIENTE`. Esto genera la inconsistencia del **Hallazgo #8**.

### 7.3 Seguridad — JWT y variables de entorno

| Aspecto | Estado en el documento | Evaluación |
|---------|----------------------|------------|
| Algoritmo de firma | HS256 (simétrico) | Aceptable para un monolito; riesgo si el secret se filtra |
| Expiración del token | 8 horas | Razonable para uso institucional diurno |
| Rotación de secret | No mencionada | ⚠️ Omisión documentable — **Hallazgo #13** |
| `.env` en Git | Aclarado explícitamente "NO subir a Git" | ✅ Buena práctica documentada |
| `DATABASE_URL` con `...` | Placeholder incompleto | ⚠️ — **Hallazgo #9** |
| `unidadAcademicaId` en JWT de COORDINADOR | Incluido en el ejemplo | ⚠️ Campo superfluo para ese rol — **Hallazgo #5** |
| Refresh tokens | No mencionados | Decisión válida para MVP; puede surgir en defensa |

---

## 8. Fortalezas Destacables

**Fortaleza 1 — Trazabilidad funcionalidad → módulo → entidades (Sec. 10.6)**  
La tabla de trazabilidad es un artefacto poco común en trabajos universitarios y demuestra pensamiento sistémico. Cubre 11 funcionalidades y las ancla a módulos y entidades concretas, lo que hace el documento verificable internamente.

**Fortaleza 2 — Justificación del modelado UML con decisiones explicadas (Sec. 5.1)**  
Las 7 decisiones de modelado están argumentadas con razonamiento técnico (ej: "Asignacion como entidad independiente evita M:N directa y permite metadatos propios"). Esto va más allá de lo requerido y demuestra comprensión del dominio.

**Fortaleza 3 — Coherencia del ejemplo JSON con el modelo de datos (Sec. 8.3)**  
El objeto JSON de `GET /api/asignaciones/COM-2025-001` refleja fielmente el modelo de clases: anidamiento `comision → materia → carreras[]`, `bandasHorarias[]`, `aula → edificio`. La nota explicativa al pie de la tabla de campos conecta cada decisión de diseño con su origen en el modelo.

**Fortaleza 4 — Documentación de iteraciones de diseño concretas (Sec. 4, Q4)**  
El abandono del calendario como pantalla principal y la adopción de chips de Carrera están documentados con causa (qué falló) y efecto (cómo se resolvió). Es una narrativa de proceso que pocas entregas incluyen.

**Fortaleza 5 — Guía de despliegue operativa (Sec. 9)**  
Los 9 pasos de despliegue son ejecutables en un servidor real. Incluyen comandos concretos para migraciones, certificado SSL, backup y actualización. La tabla de servicios Docker con responsabilidades explícitas cierra el circuito entre la arquitectura lógica y la operación real.

---

## 9. Preguntas Probables en Defensa Oral

**P1: "¿Por qué `Asignacion` es una entidad y no una tabla de unión M:N entre `Comision` y `Aula`?"**  
→ Porque necesita metadatos propios: `estado`, `fecha_asignacion` y `es_manual`. Una tabla de unión pura no puede almacenar esos atributos sin convertirse implícitamente en entidad. El patrón se llama *Association Class* en UML.

**P2: "En el pseudocódigo, `aulasDisponibles[0]` selecciona la primera aula — ¿cómo garantizás que es la óptima?"**  
→ Actualmente no se garantiza porque falta el ordenamiento por capacidad sobrante ascendente. La corrección es agregar `ordenarPorCapacidadSobranteAscendente()` antes de seleccionar `[0]`. (Este es el **bug crítico #1** del trabajo).

**P3: "¿Por qué usaste HS256 y no RS256 para el JWT?"**  
→ HS256 es suficiente para un monolito donde el mismo servicio firma y verifica. RS256 tiene sentido en arquitecturas con múltiples servicios verificadores. La contrapartida es que si el `JWT_SECRET` se filtra, todos los tokens son falsificables, lo que se mitiga con la rotación periódica del secret y la expiración de 8h.

**P4: "¿Qué pasa con una comisión que no tiene aula asignada — qué estado tiene?"**  
→ Según el esquema, `estado DEFAULT 'PENDIENTE'`. Sin embargo, el motor automático crea con `estado='ASIGNADA'` directamente. `PENDIENTE` correspondería a comisiones creadas manualmente antes de ser asignadas. Esto requiere aclaración en el documento.

**P5: "¿Por qué el Panel de Conflictos es una pantalla separada y no un filtro dentro del Panel de Asignaciones?"**  
→ Separación de flujos cognitivos: el Panel de Asignaciones es de lectura + acción masiva; el Panel de Conflictos requiere análisis individual por conflicto y reasignación contextual. Mezclarlos obligaría al usuario a cambiar de modo mental dentro de la misma vista, aumentando la carga cognitiva (principio de consistencia y estándares de Nielsen).

**P6: "¿La relación `UA → Materia` y `UA → Carrera → Materia` no son redundantes?"**  
→ No. La primera expresa responsabilidad académica (quién administra la materia en el sistema); la segunda expresa pertenencia curricular (en qué plan de carrera figura). Son semánticas distintas. Un ejemplo: una materia puede ser administrada por la Facultad de Ingeniería pero aparecer en el plan de la Licenciatura en Informática de otra UA.

**P7: "¿Cómo funciona la notificación de conflictos si no hay WebSockets?"**  
→ La versión inicial usa polling activo: el frontend consulta periódicamente `GET /api/conflictos/metricas` y actualiza el badge de alertas. Es una solución válida para MVP con carga moderada. WebSockets se mencionan como mejora futura en Sec. 10.5.

---

*Fin de la auditoría. Veredicto docente: trabajo técnicamente sólido con dos puntos críticos corregibles antes de la defensa.*
