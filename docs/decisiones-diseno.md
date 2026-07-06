# Decisiones de Diseño y Desviaciones del Modelo Original

Este documento registra de manera formal las decisiones de diseño tomadas durante la implementación del backend de **AulaMatch**, justificando cualquier discrepancia con el documento de diseño original o los diagramas UML.

---

## 1. Permisos y Roles en Registro de Comisiones (`POST /api/comisiones`)

### Especificación Original (Sección 10.2)
El documento de diseño original establece que el endpoint para crear o registrar comisiones (`POST /api/comisiones`) tiene acceso restringido a:
*   **Solo Administrativo**

### Implementación Real
En el código fuente, la ruta está protegida permitiendo el acceso tanto al rol **Administrativo** como al rol **Coordinador**:
*   `COORDINADOR` y `ADMINISTRATIVO`

### Justificación
Esta es una **decisión consciente** y no una desviación accidental. Se decidió extender el permiso de creación de comisiones al rol de **Coordinador** por las siguientes razones:
1.  **Jerarquía de Roles:** En el modelo de negocio, el Coordinador posee un rol de supervisión y gestión global ("acceso total"). Restringirle la creación de comisiones mientras tiene permisos de asignación y resolución de conflictos resultaba contradictorio con su nivel de autoridad operativa.
2.  **Operatividad:** Permite resolver cuellos de botella administrativos en periodos críticos de planificación académica, donde el Coordinador necesita dar de alta comisiones de urgencia sin depender de un usuario con rol Administrativo.
3.  **Coherencia:** Mantiene la alineación con otros endpoints de gestión académica y de asignaciones donde el Coordinador tiene plenas facultades de escritura.

---

## 2. Representación Visual del Estado PENDIENTE en el Panel de Asignaciones (Sección 3 / Sección 4)

### Inconsistencia detectada

La enumeración `EstadoAsignacion` (Sección 8.1) define tres valores: `PENDIENTE`, `ASIGNADA` y
`CONFLICTO`. El Panel de Asignaciones (Sección 3, Figura 2) documenta explícitamente los badges
verde ("Asignada") y rojo ("Conflicto"), pero no menciona el badge correspondiente a `PENDIENTE`,
dejando ambigua su representación visual.

### Decisión adoptada

El estado `PENDIENTE` **sí tiene representación visual propia** en el Panel de Asignaciones: un
badge amarillo con color `#CA8A04`, coherente con la paleta semántica propuesta en el prompt de
generación visual de Midjourney (Sección 2), donde ya se describe un badge amarillo para ese
estado. No se optó por ocultar las comisiones `PENDIENTE` del panel porque esa alternativa
rompería la trazabilidad con `GET /api/asignaciones` (Sección 10.2), que lista todas las
comisiones del período activo con filtros, incluyendo las que aún no tienen aula asignada.

### Comportamiento en la interfaz

Una fila con badge amarillo (`PENDIENTE`) corresponde a una comisión que ya tiene datos académicos
completos —materia, docente, bandas horarias e inscriptos— pero no tiene aula asignada aún. En esa
fila, la columna "Aula" aparece vacía y la columna "Edificio" muestra el guión `—`. Este estado
es el punto de partida esperado antes de ejecutar la asignación automática masiva o de realizar
una asignación manual, y su visibilidad en el panel permite al Coordinador identificar de un
vistazo cuántas comisiones permanecen sin resolver sin abandonar la vista central.

### Paleta semántica completa del Panel de Asignaciones

| Estado | Color del badge | Hex | Descripción en la fila |
|--------|----------------|-----|------------------------|
| `PENDIENTE` | Amarillo | `#CA8A04` | Sin aula asignada; columna "Aula" vacía |
| `ASIGNADA` | Verde | `#16A34A` | Aula confirmada; todas las celdas completas |
| `CONFLICTO` | Rojo | `#DC2626` | Superposición horaria o cupo excedido detectado |

---

## 3. Evolución del Estilo Visual: Del Concepto Dark Mode al Wireframe Claro (Sección 2 vs Sección 3)

### Inconsistencia detectada

El prompt de generación en Midjourney (Sección 2) propone una estética con predominancia de tonos oscuros ("dark mode" y sidebar azul marino oscuro), mientras que los wireframes funcionales de Figma AI (Sección 3) y la interfaz definitiva se diseñaron en modo claro, utilizando un fondo gris muy claro (`#F7F8FC`) y tablas con filas de fondo blanco.

### Decisión adoptada

La transición del concepto inicial en modo oscuro hacia una interfaz definitiva en modo claro fue una decisión consciente tomada durante el proceso de iteración del diseño por las siguientes razones:
1. **Contexto de uso y fatiga visual:** Dado que el sistema está destinado a coordinadores y administrativos universitarios que realizan jornadas de carga de datos y planificación académica extensas, una interfaz con fondo predominantemente claro reduce significativamente el cansancio ocular y mejora la legibilidad de grandes bloques de texto y tablas densas.
2. **Consistencia institucional:** El modo claro, apoyado en acentos azules (`#1E40AF`) y bordes limpios, transmite mayor formalidad y se alinea con la estética habitual de los portales de autogestión y software de administración académica de la universidad.
3. **Iteración conceptual:** El mockup conceptual de Midjourney cumplió la función de establecer la paleta de colores de acento y la distribución espacial (ej. sidebar persistente), mientras que Figma AI materializó la funcionalidad en un esquema apto para producción diaria.

---

## 4. Mecanismo de Notificación de Conflictos Stateless (Sección 10.6 vs Sección 8.2 / 10.5)

### Inconsistencia detectada

La tabla de trazabilidad original (Sección 10.6) lista la entidad `(tabla notificaciones)` para dar soporte a la funcionalidad de "Notificación ante conflicto". Sin embargo, dicha tabla no existe en el esquema relacional canónico (Sección 8.2) ni en el diagrama de clases de dominio (Sección 5.1).

### Decisión adoptada

Para el MVP se optó por un **mecanismo de notificación stateless basado en la entidad Asignación**, eliminando la necesidad de persistir un registro físico de notificaciones en una tabla separada. El flujo funciona de la siguiente manera:
1. **Detección de conflictos:** Cuando se inserta o modifica una asignación, los triggers y el servicio correspondiente analizan la colisión horaria y de cupo. Si detectan un solapamiento, actualizan el atributo `estado = 'CONFLICTO'` en la misma tupla de la tabla `asignacion`.
2. **Notificación en el cliente:** El frontend realiza polling activo (consultas periódicas) al endpoint `GET /api/conflictos/metricas`. Este endpoint cuenta cuántas filas en `asignacion` están en estado `'CONFLICTO'`.
3. **Interfaz fluida:** Si el número de conflictos es superior a cero, el sistema dibuja un badge de alerta (rojo) en la barra de navegación del Coordinador para notificarle en tiempo real. 

Esta solución mantiene la base de datos simple, evita el crecimiento desmedido de tablas de log/notificación, y es consistente con la arquitectura REST stateless descrita en la Sección 6 y 10.5.

> **Nota de implementación (corr. post-deploy):** La tabla `notificacion` **sí fue creada** en producción
> (ver `backend/sql/03_notificaciones.sql`). Se utiliza para persistir el historial de conflictos
> detectados, permitir el marcado de "atendida" en el flujo de resolución y alimentar las
> métricas del panel. La descripción stateless de esta sección documenta el énfasis en la
> entidad `Asignación` como pivot, lo cual sigue siendo válido, pero la tabla de notificaciones
> existe y complementa ese mecanismo.

---

## 5. Regla de Inferencia de Tipo de Aula (`inferirTipoAula`)

### Ambigüedad Original (Sección 8, Ambigüedad 2)

El pseudocódigo del algoritmo de asignación automática nombra la función
`inferirTipoAula(modalidad, tipoClase)` sin definir sus reglas internas.

### Implementación Real

Se define una regla propia, documentada explícitamente en el CHANGELOG v1.4:

| Condición | Tipo de aula inferido |
|---|---|
| `modalidad == VIRTUAL` (siempre) | `SALA_VIDEOCONFERENCIA` |
| `modalidad == PRESENCIAL` o `HÍBRIDA` con banda `PRACTICA` | `LABORATORIO` |
| `modalidad == PRESENCIAL` o `HÍBRIDA` con banda `TEORICA` e `inscriptos >= 80` | `AUDITORIO` |
| Resto de casos | `AULA` |

### Justificación

El umbral de 80 inscriptos para `AUDITORIO` es un valor propio que separa semánticamente
aulas grandes de auditorios, alineado con las capacidades del seed de demo (`CI-AUD` = 100 plazas).
Está definido como constante `UMBRAL_AUDITORIO` en `asignaciones/service.js` para
facilitar ajustes futuros sin modificar la lógica.

---

## 6. Campo de Identificación para Login: `email` en vez de `username`

### Ambigüedad Original (Sección 8, Ambigüedad 1)

El diseño original define la tabla `usuario` con los campos `id, email, password_hash, rol,
unidad_academica_id` con `email` como campo de identidad. Sin embargo, la tabla de endpoints
(Sección 4) no especifica qué campo se usa como identificador en el body de `POST /api/auth/login`.

### Implementación Real

El endpoint `POST /api/auth/login` recibe `{ email, password }` (no `username`).
Esto es coherente con el esquema de la tabla `usuario` donde `email` es el campo
único indexado (`UNIQUE`). El seed de usuarios de producción utiliza:
- `coordinador@aulamatch.edu` / `Coord1234!`
- `admin@aulamatch.edu` / `Admin1234!`

### Justificación

Usar `email` como identificador es más natural para un sistema institucional universitario
donde los usuarios son identificados por su dirección de correo institucional, no por un alias inventado.

---

## 7. Comportamiento de CORS en Ausencia de `ALLOWED_ORIGINS`

### Contexto

La auditoría pre-deploy identificó como hallazgo importante la configuración permisiva
de CORS (wildcard `*`). Se corrigió antes del deploy implementando soporte para la
variable de entorno `ALLOWED_ORIGINS`.

### Implementación Real

- Si `ALLOWED_ORIGINS` **está definida**: CORS se restringe a la lista de orígenes separados
  por coma (ej: `https://aulamatch-frontend.onrender.com,https://app.aulamatch.edu`).
- Si `ALLOWED_ORIGINS` **no está definida** (incluyendo el plan Free de Render sin frontend):
  CORS queda abierto a todos los orígenes (`*`), pero **emite un `console.warn` visible
  en los logs del servidor** advirtiendo que el entorno no tiene CORS restringido.

### Justificación

Para el MVP académico evaluado sin frontend en producción, esta configuración permite
que el Swagger UI y herramientas como Postman funcionen sin restricciones. El warning
garantiza visibilidad del riesgo sin romper la funcionalidad de demo.

