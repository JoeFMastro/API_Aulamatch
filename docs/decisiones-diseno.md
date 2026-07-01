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
