# Visión Futura — AulaMatch: Asistente Inteligente Académico

> [!NOTE]
> Este documento describe funcionalidades **no implementadas** en el estado actual del proyecto.
> Es una proyección de las posibilidades de extensión sobre la base ya construida,
> surgida del feedback del profesor evaluador durante la presentación del trabajo final.

---

## Contexto: El Feedback del Profesor Evaluador

Durante la presentación del proyecto, el profesor evaluador planteó una pregunta clave:
*"¿Cómo podría integrarse Inteligencia Artificial a este sistema?"*

Su propuesta concreta fue la idea de un **asistente inteligente** capaz de responder preguntas
como las que un alumno haría antes de inscribirse en una materia:

- ¿Conviene cursar esta materia ahora o más adelante?
- ¿Quién es el docente de esta comisión y cómo suele dictar la materia?
- ¿Cuántas horas semanales requiere esta carga académica?
- ¿Cuáles son las correlativas que necesito tener aprobadas?
- ¿Qué materiales o recursos necesito para este curso?
- ¿Tengo solapamiento de horarios con otras materias que estoy cursando?

Esta visión transforma AulaMatch de un **sistema de gestión de espacios** a una plataforma
que también asiste al alumno en la planificación de su recorrido académico.

---

## Qué Tendría que Hacer el Asistente

El asistente inteligente cumpliría dos roles complementarios:

### Rol 1 — Consulta de Disponibilidad y Horarios (Datos Estructurados)

Responder preguntas sobre datos que ya existen en la base de datos de AulaMatch:

| Pregunta del alumno | Fuente de datos |
|---|---|
| "¿Hay lugar en la comisión de BD-101 turno tarde?" | `comision.cupo` vs `comision.inscriptos` |
| "¿Qué aula le corresponde a la comisión X?" | `asignacion` → `aula` → `edificio` |
| "¿Cuándo es la clase de Algoritmos?" | `banda_horaria` de `comision` |
| "¿Hay otra comisión de la misma materia en otro turno?" | Filtro por `materia_id` + `cuatrimestre` |

### Rol 2 — Asesoramiento Contextual (Conocimiento Inferido)

Responder preguntas que requieren razonamiento, síntesis y contexto externo:

| Pregunta del alumno | Tipo de razonamiento |
|---|---|
| "¿Conviene tomar BD ahora o esperar?" | Análisis de correlativas + carga horaria |
| "¿Cómo dicta la materia el Prof. Santángelo?" | Perfil docente (requiere datos externos) |
| "¿Cuánto tiempo me va a llevar esta materia?" | Estimación basada en tipo_clase + bandas |
| "¿Se superpone con lo que ya estoy cursando?" | Cruce de bandas horarias del alumno |

---

## Arquitectura Propuesta

La integración de IA se haría como un **módulo adicional** sin modificar los módulos existentes,
consumiendo la API REST de AulaMatch como fuente de verdad:

```
┌───────────────────────────────────────────────────────────────┐
│  AulaMatch IA Layer (Módulo Nuevo)                            │
│                                                               │
│  ┌─────────────────────┐     ┌──────────────────────────────┐ │
│  │  LLM Agent          │────▶│  MCP Server (Tool Layer)     │ │
│  │  (GPT-4o / Gemini / │     │  - get_comisiones_por_materia│ │
│  │   Claude / etc.)    │◀────│  - get_disponibilidad_horaria│ │
│  └─────────────────────┘     │  - get_aulas_compatibles     │ │
│           │                  │  - get_docente_por_comision  │ │
│           │                  └──────────────────────────────┘ │
│           │                              │                    │
└───────────┼──────────────────────────────┼────────────────────┘
            │                              │
            ▼                              ▼
  ┌──────────────────┐         ┌──────────────────────────────┐
  │  Chat UI /       │         │  AulaMatch API REST          │
  │  CLI / WhatsApp  │         │  (ya existente en producción)│
  │  Bot / etc.      │         │  https://aulamatch-backend   │
  └──────────────────┘         │  .onrender.com               │
                               └──────────────────────────────┘
```

### Componentes Clave

#### MCP Server (Model Context Protocol)
El mecanismo más elegante de integración es exponer los endpoints de AulaMatch como
**tools** de un MCP Server. Un agente LLM externo (Cursor, Claude Desktop, cualquier
cliente MCP-compatible) podría entonces consultar la disponibilidad de aulas y los
datos académicos en lenguaje natural.

Ejemplo de tools que expondría el MCP Server:

```python
@tool
def buscar_comisiones(materia: str, cuatrimestre: int, anio: int) -> list[Comision]:
    """Busca comisiones disponibles de una materia en el período indicado."""
    return api.get("/comisiones", params={...})

@tool
def verificar_superposicion(comision_id: int, mis_comisiones: list[int]) -> bool:
    """Verifica si una comisión se superpone horariamente con otras del alumno."""
    ...

@tool
def get_disponibilidad_aulas(dia: str, hora: str) -> list[Aula]:
    """Lista aulas libres en un día y hora específicos."""
    return api.get("/reportes/disponibilidad", params={...})
```

#### Agente LLM con Herramientas
Un agente LLM recibe la pregunta en lenguaje natural del alumno, decide qué tools
invocar (usando los endpoints de la API como fuente de verdad), sintetiza las respuestas
estructuradas y las devuelve como texto natural.

---

## Datos Disponibles vs. Datos Faltantes

La base actual de AulaMatch ya provee datos suficientes para el Rol 1. Para el Rol 2
(asesoramiento), algunos datos requerirían extenderse o integrarse con sistemas externos:

| Dato necesario | ¿Existe en AulaMatch? | Fuente alternativa |
|---|---|---|
| Comisiones, horarios, aulas | ✅ Sí | — |
| Cupo disponible | ✅ Sí (`cupo - inscriptos`) | — |
| Docente de la comisión | ✅ Sí (nombre + cargo) | — |
| Correlativas de la materia | ❌ No | SIU Guaraní / plan de estudios |
| Perfil/estilo del docente | ❌ No | Encuestas, Guaraní, externos |
| Dificultad estimada | ❌ No | Requiere datos históricos |
| Materiales de cursada | ❌ No | Campus virtual / Moodle |

---

## Implementación Incremental Sugerida

Una ruta práctica para llegar a esta visión sin grandes cambios a lo existente:

### Etapa 1 — MCP Server básico (pocas semanas)
- Implementar un MCP Server en Python o Node.js que envuelva los endpoints públicos de AulaMatch.
- Exponer 4-5 tools básicas: buscar comisiones, verificar horarios, listar aulas disponibles.
- Conectarlo a Claude Desktop o a un bot de Telegram para pruebas.

### Etapa 2 — Agente LLM con contexto académico (1-2 meses)
- Integrar un LLM (GPT-4o, Gemini, Claude) como orquestador de las tools.
- Agregar un módulo de `correlativas` en la base de datos (nueva tabla simple).
- Implementar lógica de verificación de solapamiento horario considerando múltiples comisiones.

### Etapa 3 — Interfaz conversacional (1-3 meses)
- Exponer el agente a través de un chat UI web (puede ser tan simple como una pantalla de chat en Next.js).
- O integrarlo como bot de WhatsApp/Telegram para adopción universitaria natural.

---

## Por Qué Esta Arquitectura Tiene Sentido

La API REST de AulaMatch ya cumple el contrato de datos que un agente LLM necesita:
- **Datos estructurados:** JSON limpio, paginado y filtrable.
- **Autenticación estándar:** JWT Bearer — el agente puede autenticarse igual que cualquier cliente.
- **Endpoints semánticamente ricos:** `/aulas-compatibles`, `/disponibilidad`, `/conflictos` son
  exactamente el tipo de consultas que un asistente académico necesita resolver.

No sería necesario reescribir ningún módulo existente. El asistente IA sería una capa
adicional que **consume** lo que ya está construido.

---

*Documento creado en julio de 2026. Estado: visión futura, sin implementación actual.*
