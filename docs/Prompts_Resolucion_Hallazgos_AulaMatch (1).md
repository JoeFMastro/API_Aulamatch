# Prompts de Resolución de Hallazgos — Proyecto AulaMatch

**Origen:** Matriz de Hallazgos de `auditoria_actividad4.md`
**Estructura de prompt utilizada:** Plantilla Maestra de `reglas_del_prompt_md.md` (Sección 5)
**Propósito:** Cada prompt está listo para que un agente de IA con acceso de edición al repositorio (Claude en Google Antigravity, Claude Code, o equivalente) **aplique la corrección directamente sobre los archivos fuente del proyecto**, antes de trasladar el documento al servidor de render final.

## ⚠️ INSTRUCCIONES DE EJECUCIÓN — LEER ANTES DE PROCESAR CUALQUIER HALLAZGO

Este es un **proyecto de software real (AulaMatch)**, no una actividad académica ni un ejercicio de redacción. En consecuencia:

1. **No generar una respuesta descriptiva en el chat.** El objetivo de cada prompt no es "explicar qué habría que cambiar", sino **ejecutar el cambio**. Si el resultado de procesar un hallazgo es solo texto mostrado en la conversación, el hallazgo NO está resuelto.
2. **Localizar el archivo fuente real antes de escribir nada.** Cada bloque referencia una sección del documento (ej. "Sección 10.3") por su número, no por nombre de archivo, porque el nombre de archivo depende del repositorio en el que se ejecute este prompt. El agente debe:
   - Buscar en el workspace/repositorio abierto el archivo que contiene esa sección (por ejemplo, buscando el encabezado o el fragmento de texto citado en el bloque CONTEXTO).
   - Si el documento está dividido en varios archivos, identificar el archivo correcto antes de editar.
   - Si no se encuentra ningún archivo que coincida, detenerse y señalarlo explícitamente en lugar de inventar una ubicación o simular la edición.
3. **Aplicar la edición con la herramienta de edición de archivos del agente** (no copiar el resultado a un mensaje de chat como entregable final). El texto de salida de cada prompt es el contenido que debe insertarse o reemplazarse **dentro del archivo**, en el lugar exacto indicado por PROCESO DE RESOLUCIÓN.
4. **Confirmar el cambio aplicado**, no solo proponerlo: al terminar cada hallazgo, el agente debe mostrar un diff o un resumen de qué archivo fue modificado y en qué líneas, como evidencia de que la corrección quedó persistida en el repositorio.
5. Cada bloque de prompt (delimitado por \`\`\`) es la instrucción operativa completa para un hallazgo. El campo DESTINATARIO de cada bloque ya no apunta a una persona que "incorporará" el cambio manualmente — apunta al propio agente ejecutor, que tiene capacidad de edición directa.

Cada bloque incluye: ROL, DESTINATARIO, CONTEXTO, PROPÓSITO, TAREA PRINCIPAL, PROCESO DE RESOLUCIÓN, RESTRICCIONES, FORMATO DE SALIDA y CRITERIOS DE CALIDAD, tal como define la arquitectura profesional de prompts (Sección 5 de la guía).

---

## HALLAZGO #1 — CRÍTICO — Motor automático no ordena por capacidad sobrante (Sec. 10.3)

```
ROL
Actúa como: arquitecto de software senior especializado en diseño de algoritmos y pseudocódigo técnico.

DESTINATARIO
La respuesta está dirigida a: el propio agente de IA ejecutor, con acceso de edición al
repositorio del proyecto AulaMatch. No redactar una explicación para que un tercero la copie:
localizar el archivo fuente que contiene la Sección 10.3 y aplicar la corrección directamente en
ese archivo usando la herramienta de edición disponible.

CONTEXTO
Este trabajo forma parte de: el proyecto "AulaMatch — Sistema de Gestión de Espacios Académicos",
específicamente el pseudocódigo de la función asignarAutomaticamente(anio, cuatrimestre).

PROPÓSITO
El objetivo final es: eliminar la contradicción entre el comentario inline ("menor capacidad
sobrante") y la implementación real, que selecciona aulasDisponibles[0] sin ordenar previamente,
evitando que el algoritmo asigne aulas sobredimensionadas (ej. un auditorio de 300 asientos a una
comisión de 20 alumnos).

TAREA PRINCIPAL
Tu tarea es: reescribir el bloque de selección final del pseudocódigo de la Sección 10.3 agregando
el paso de ordenamiento faltante, manteniendo el resto de la función sin alterar su lógica ni estilo
de pseudocódigo (mayúsculas para palabras clave, sangría de 4 espacios, nombres de función en
camelCase).

PROCESO DE RESOLUCIÓN
1 Localizar el bloque "// 4. Seleccionar la mejor aula disponible (menor capacidad sobrante)"
2 Insertar la línea de ordenamiento ANTES del "SI aulasDisponibles NO está vacío"
3 Definir explícitamente la fórmula de capacidad sobrante: aula.capacidad - comision.inscriptos
4 Verificar que aulaElegida ← aulasDisponibles[0] ahora sea consistente con el comentario original
5 Confirmar que no se introducen efectos secundarios sobre asignacionesFallidas ni sobre el resto
  del flujo

RESTRICCIONES

No modificar la firma de la función ni los nombres de variables existentes
No introducir nuevas dependencias o funciones no mencionadas en el documento
No alterar los criterios 1, 2 y 3 (cupo, tipo de aula, franja horaria) ya validados en la auditoría
Si el pseudocódigo resultante genera ambigüedad sobre empates de capacidad sobrante, señalarlo
explícitamente en una nota, no asumir un criterio de desempate no solicitado

FORMATO DE SALIDA

ACCIÓN REQUERIDA (no opcional): aplicar el siguiente contenido directamente en el archivo fuente localizado, mediante la herramienta de edición del agente. No basta con mostrarlo en el chat; el archivo del proyecto debe quedar modificado en disco.

Bloque de pseudocódigo corregido, en el mismo formato que el original, listo para reemplazar el
fragmento correspondiente en la Sección 10.3, seguido de un párrafo breve (máx. 3 líneas)
explicando el cambio para incluir como nota al pie de la sección.

CRITERIOS DE CALIDAD

El comentario inline y la lógica ejecutada deben quedar alineados sin ambigüedad
La corrección debe ser mínima y quirúrgica (no reescritura completa del algoritmo)
Debe ser verificable línea por línea contra la corrección propuesta en la auditoría
```

---

## HALLAZGO #2 — CRÍTICO — Estado `PENDIENTE` ausente en wireframes del Panel de Asignaciones (Sec. 3 vs Sec. 8.1)

```
ROL
Actúa como: diseñador UX/UI senior con experiencia en sistemas administrativos densos en datos.

DESTINATARIO
La respuesta está dirigida a: el propio agente de IA ejecutor. Localizar el archivo fuente que
contiene la Sección 3 (descripción de wireframes) y/o Sección 4 (justificación de decisiones de
diseño) del proyecto AulaMatch, e insertar la aclaración directamente en el archivo mediante
edición, no como texto suelto en el chat.

CONTEXTO
Este trabajo forma parte de: la documentación de AulaMatch, donde la enumeración EstadoAsignacion
(Sección 8.1) define tres valores posibles — PENDIENTE, ASIGNADA, CONFLICTO — pero las capturas y
descripciones del Panel de Asignaciones (Sección 3, Figura 2) solo documentan explícitamente los
badges verde ("Asignada") y rojo ("Conflicto"), dejando ambigua la representación visual de
PENDIENTE.

PROPÓSITO
El objetivo final es: resolver la inconsistencia entre el modelo de datos y el prototipo visual,
dejando explícito si PENDIENTE tiene badge propio (amarillo, como en el prompt de Midjourney de la
Sección 2) o si las comisiones sin aula simplemente no aparecen listadas en el panel.

TAREA PRINCIPAL
Tu tarea es: redactar un párrafo aclaratorio, coherente con el resto del documento, que defina de
forma inequívoca el comportamiento visual del estado PENDIENTE en el Panel de Asignaciones.

PROCESO DE RESOLUCIÓN
1 Revisar que el prompt de Midjourney (Sección 2) ya menciona un badge amarillo "Pendiente"
2 Decidir y declarar explícitamente: el badge amarillo SÍ se usa para PENDIENTE en el Panel de
  Asignaciones (opción recomendada, por coherencia con el prompt visual ya documentado)
3 Redactar la aclaración de forma que quede claro en qué fila de la tabla aparecería ese badge
  (ej. comisión sin aula asignada aún, columna "Aula asignada" vacía)
4 Verificar consistencia con la Figura 2 y con el ejemplo JSON de la Sección 8.3

RESTRICCIONES

No inventar una cuarta categoría de estado no presente en EstadoAsignacion
No contradecir el prompt de Midjourney ya documentado en la Sección 2
Si se opta por la alternativa (comisiones sin aula no aparecen en el panel), debe justificarse por
qué esa decisión no rompe la trazabilidad con el estado PENDIENTE del esquema

FORMATO DE SALIDA

ACCIÓN REQUERIDA (no opcional): aplicar el siguiente contenido directamente en el archivo fuente localizado, mediante la herramienta de edición del agente. No basta con mostrarlo en el chat; el archivo del proyecto debe quedar modificado en disco.

Un párrafo de 4 a 6 líneas en español, estilo consistente con la Sección 4 del documento
("Justificación de Decisiones de Diseño"), listo para insertar como aclaración adicional.

CRITERIOS DE CALIDAD

Elimina toda ambigüedad entre modelo de datos y prototipo visual
Es coherente con el resto de las decisiones de diseño ya documentadas
No requiere regenerar las capturas de Figma AI, solo aclarar textualmente
```

---

## HALLAZGO #3 — MODERADO — Tabla "notificaciones" inexistente en el esquema relacional (Sec. 10.6)

```
ROL
Actúa como: arquitecto de bases de datos con experiencia en sistemas de notificación stateless.

DESTINATARIO
La respuesta está dirigida a: el propio agente de IA ejecutor. Localizar el archivo fuente que
contiene la tabla de trazabilidad de la Sección 10.6 del proyecto AulaMatch y editar directamente
la fila correspondiente en el archivo, no describir el cambio en el chat.

CONTEXTO
Este trabajo forma parte de: la tabla de trazabilidad funcionalidad → módulo → entidades, donde la
fila "Notificación ante conflicto" referencia "(tabla notificaciones)" como entidad, pero esa tabla
no existe ni en el esquema relacional (Sección 8.2) ni en el diagrama de clases (Sección 5.1). El
mecanismo real documentado en la Sección 10.5 es polling activo sobre asignacion.estado.

PROPÓSITO
El objetivo final es: alinear la tabla de trazabilidad con la arquitectura real ya documentada,
evitando que un evaluador interprete que falta una tabla en el esquema relacional.

TAREA PRINCIPAL
Tu tarea es: reemplazar la referencia "(tabla notificaciones)" por la entidad real que sostiene el
mecanismo de notificación, coherente con la Sección 10.5.

PROCESO DE RESOLUCIÓN
1 Confirmar en la Sección 10.5 que la notificación se implementa vía polling sobre
  GET /api/conflictos/metricas, sin persistencia adicional
2 Sustituir la celda "Entidades" de la fila correspondiente en la Sección 10.6 por: "Asignacion
  (vía polling de estado, sin tabla dedicada)"
3 Evaluar si conviene agregar una nota al pie de la tabla de trazabilidad aclarando por qué no
  existe tabla de notificaciones en el MVP

RESTRICCIONES

No agregar una tabla notificaciones al esquema relacional salvo que se decida explícitamente
ampliar el alcance del proyecto (fuera del pedido de esta corrección)
No contradecir la Sección 10.5, que ya describe el mecanismo de polling como decisión de diseño
válida para el MVP

FORMATO DE SALIDA

ACCIÓN REQUERIDA (no opcional): aplicar el siguiente contenido directamente en el archivo fuente localizado, mediante la herramienta de edición del agente. No basta con mostrarlo en el chat; el archivo del proyecto debe quedar modificado en disco.

Una única celda de reemplazo para la fila "Notificación ante conflicto" de la tabla de la Sección
10.6, más una nota opcional al pie (máx. 2 líneas).

CRITERIOS DE CALIDAD

Coherencia total entre Sección 10.5, Sección 10.6 y Sección 8.2
No introduce nuevas entidades no solicitadas
```

---

## HALLAZGO #4 — MODERADO — Ruta sin prefijo `/api/` en diagrama de secuencia (Sec. 7.1 vs Sec. 10.2)

```
ROL
Actúa como: arquitecto de software senior especializado en diseño de APIs REST y notación UML.

DESTINATARIO
La respuesta está dirigida a: el propio agente de IA ejecutor. Localizar el archivo fuente del
diagrama de secuencia (Figura 7.1, Sección 7.1) del proyecto AulaMatch — el archivo del diagrama en
sí (fuente UML/Mermaid/PlantUML si existe) y/o el archivo de documento que lo referencia — y aplicar
las correcciones de etiquetas directamente ahí, no solo describirlas en el chat.

CONTEXTO
Este trabajo forma parte de: el Diagrama de Secuencia UML de la Sección 7.1, cuyo mensaje
"GET /conflictos" no coincide con el endpoint real documentado en la tabla de la Sección 10.2:
"GET /api/conflictos".

PROPÓSITO
El objetivo final es: unificar la nomenclatura de endpoints en todo el documento para que el
diagrama de secuencia sea directamente trazable contra la tabla de endpoints del backend.

TAREA PRINCIPAL
Tu tarea es: identificar todas las etiquetas de mensajes HTTP del diagrama de secuencia (Figura
7.1) que carezcan del prefijo /api/ y generar la lista de correcciones necesarias.

PROCESO DE RESOLUCIÓN
1 Listar todos los mensajes HTTP visibles en el diagrama de secuencia (GET /conflictos,
  GET /asignaciones/{id}/aulas-compatibles, PATCH /asignaciones/{id})
2 Contrastar cada uno contra la tabla de endpoints de la Sección 10.2
3 Generar el mapeo de corrección uno a uno (ruta actual → ruta corregida con /api/)
4 Indicar que el archivo fuente del diagrama (herramienta UML utilizada) debe regenerarse con las
  etiquetas corregidas antes de exportar la imagen final

RESTRICCIONES

No cambiar los nombres de los participantes del diagrama (Coordinador, Panel de Conflictos, API
Gateway, Svc. Conflictos, Svc. Disponibilidad, Svc. Asignación, Base de Datos)
No alterar el orden ni la lógica de los pasos del flujo, solo el texto de las etiquetas HTTP

FORMATO DE SALIDA

ACCIÓN REQUERIDA (no opcional): aplicar el siguiente contenido directamente en el archivo fuente localizado, mediante la herramienta de edición del agente. No basta con mostrarlo en el chat; el archivo del proyecto debe quedar modificado en disco.

Tabla de dos columnas ("Ruta actual en el diagrama" | "Ruta corregida") lista para aplicar como
checklist de edición antes de regenerar la Figura 7.1.

CRITERIOS DE CALIDAD

Cobertura completa: ninguna ruta del diagrama debe quedar sin el prefijo /api/
Coincidencia exacta con la tabla de endpoints de la Sección 10.2
```

---

## HALLAZGO #5 — MODERADO — Campo `unidadAcademicaId` superfluo en JWT de COORDINADOR (Sec. 10.4)

```
ROL
Actúa como: ingeniero de seguridad backend especializado en autenticación basada en JWT y control
de acceso por rol.

DESTINATARIO
La respuesta está dirigida a: el propio agente de IA ejecutor. Localizar el archivo fuente que
contiene la Sección 10.4 (especificación de autenticación JWT) del proyecto AulaMatch y aplicar la
aclaración directamente en el archivo, no como texto descriptivo en el chat.

CONTEXTO
Este trabajo forma parte de: la especificación de autenticación de AulaMatch, donde el rol
COORDINADOR tiene acceso total (sin scope por Unidad Académica), pero el ejemplo de payload JWT de
la Sección 10.4 incluye "unidadAcademicaId": 3 también para ese rol, lo que puede inducir a un
desarrollador a implementar un filtrado erróneo por UA para coordinadores.

PROPÓSITO
El objetivo final es: eliminar la ambigüedad de implementación sobre si unidadAcademicaId debe
aplicarse como filtro también para COORDINADOR.

TAREA PRINCIPAL
Tu tarea es: redactar la aclaración textual y, opcionalmente, el ajuste del ejemplo JSON del token,
para dejar explícito que ese campo es ignorado por los middlewares cuando el rol es COORDINADOR.

PROCESO DE RESOLUCIÓN
1 Revisar el ejemplo de payload JWT actual (rol: "COORDINADOR", unidadAcademicaId: 3)
2 Decidir el enfoque de corrección: (a) mantener el campo pero aclarar textualmente que se ignora
  para COORDINADOR, o (b) mostrar el ejemplo con unidadAcademicaId: null para ese rol
3 Redactar una línea explicativa inmediatamente después del bloque de código del token
4 Verificar que la explicación sea coherente con el fragmento de código Express que aplica "scope
  de UA si es ADMINISTRATIVO" (ya presente en el documento)

RESTRICCIONES

No eliminar el campo unidadAcademicaId de la estructura del token para el rol ADMINISTRATIVO, que
sí lo necesita
No introducir un nuevo campo o claim no mencionado en el documento original

FORMATO DE SALIDA

ACCIÓN REQUERIDA (no opcional): aplicar el siguiente contenido directamente en el archivo fuente localizado, mediante la herramienta de edición del agente. No basta con mostrarlo en el chat; el archivo del proyecto debe quedar modificado en disco.

Una línea aclaratoria (1-2 oraciones) para insertar justo debajo del bloque de código JSON del
payload JWT, en el mismo estilo técnico que el resto de la Sección 10.4.

CRITERIOS DE CALIDAD

Elimina cualquier ambigüedad de implementación sobre el uso de unidadAcademicaId por rol
Es consistente con el middleware authorize.js ya descripto en el documento
```

---

## HALLAZGO #6 — MODERADO — React no mencionado en la Sección 6 (Arquitectura Lógica)

```
ROL
Actúa como: arquitecto de software senior encargado de mantener la coherencia entre los diagramas
de arquitectura y la guía de despliegue de un proyecto.

DESTINATARIO
La respuesta está dirigida a: el propio agente de IA ejecutor. Localizar el archivo fuente que
contiene la Sección 6 (Arquitectura Lógica) del proyecto AulaMatch y editar directamente el párrafo
de "Capa de Presentación" en el archivo, no proponerlo como texto suelto en el chat.

CONTEXTO
Este trabajo forma parte de: el Diagrama de Arquitectura Lógica (Figura 6) y su explicación por
capas. La Sección 6 describe la Capa de Presentación únicamente como "interfaz web responsive
ejecutada en el navegador", sin mencionar ningún framework, mientras que la Sección 9 (guía de
despliegue) sí especifica explícitamente "React compilado (Nginx interno)" como stack del
frontend.

PROPÓSITO
El objetivo final es: que la Sección 6 sea coherente con la Sección 9 y no deje al lector con dudas
sobre qué tecnología implementa la capa de presentación.

TAREA PRINCIPAL
Tu tarea es: agregar una frase a la explicación de "Capa de Presentación" en la Sección 6 que
mencione React como framework elegido, sin alterar el resto del párrafo ya redactado.

PROCESO DE RESOLUCIÓN
1 Localizar el párrafo "Capa de Presentación — Interfaz web responsive ejecutada en el navegador..."
2 Insertar la mención al framework inmediatamente después de la primera oración
3 Mantener consistencia terminológica con la Sección 9 ("React compilado", "frontend")
4 Verificar que no se contradiga con ningún otro punto del documento (ej. Sección 10.1, que no
  menciona frontend por estar enfocada en backend)

RESTRICCIONES

No agregar detalles de librerías adicionales (state management, routing, etc.) no mencionados en
ninguna otra sección del documento
Mantener el párrafo dentro de una extensión similar a la original (no expandir significativamente
la sección)

FORMATO DE SALIDA

ACCIÓN REQUERIDA (no opcional): aplicar el siguiente contenido directamente en el archivo fuente localizado, mediante la herramienta de edición del agente. No basta con mostrarlo en el chat; el archivo del proyecto debe quedar modificado en disco.

Una oración de inserción (máx. 25 palabras) más la ubicación exacta donde debe insertarse dentro
del párrafo existente de la Sección 6.

CRITERIOS DE CALIDAD

Elimina la inconsistencia entre Sección 6 y Sección 9 sin generar nuevas secciones
El cambio es mínimo y no altera el resto de la explicación por capas
```

---

## HALLAZGO #7 — MENOR — Navegación indirecta Comision → Materia → UnidadAcademica poco clara en el diagrama de clases (Sec. 8.2 vs Sec. 5.1)

```
ROL
Actúa como: modelador de datos UML con experiencia en documentación de diagramas de clases para
proyectos académicos.

DESTINATARIO
La respuesta está dirigida a: el propio agente de IA ejecutor. Localizar el archivo fuente que
contiene la Figura 5 (Diagrama de Clases UML) del proyecto AulaMatch y agregar la nota aclaratoria
directamente en el archivo, no como descripción en el chat.

CONTEXTO
Este trabajo forma parte de: el modelo de dominio de AulaMatch. La tabla comision no tiene FK
directa a unidad_academica; la relación es indirecta vía comision → materia → unidad_academica.
Esta decisión es correcta y ya está descripta en Sección 5.1 punto 7 (coexistencia de rutas
UA→Materia y UA→Carrera→Materia), pero el diagrama de clases no lo hace explícito visualmente para
quien no lea el texto.

PROPÓSITO
El objetivo final es: que un evaluador pueda entender la ruta de navegación Comision → Materia →
UnidadAcademica solo con mirar el diagrama, sin depender exclusivamente del texto de apoyo.

TAREA PRINCIPAL
Tu tarea es: redactar una nota al pie para la Figura 5 que explicite esa ruta de navegación
indirecta, sin modificar las cardinalidades ni las clases del diagrama.

PROCESO DE RESOLUCIÓN
1 Confirmar que comision.materia_id es la única vía hacia unidad_academica en el esquema relacional
2 Redactar la nota en una sola oración, referenciando la ruta completa con flechas
   (Comision → Materia → UnidadAcademica)
3 Ubicarla como texto adicional debajo del pie de figura existente ("Figura 5 — Diagrama de
  Clases UML de AulaMatch...")

RESTRICCIONES

No modificar el diagrama de clases en sí (no es necesario redibujar relaciones ni agregar FKs
directas)
No contradecir la justificación ya dada en el punto 7 de "Decisiones de modelado" de la Sección 5.1

FORMATO DE SALIDA

ACCIÓN REQUERIDA (no opcional): aplicar el siguiente contenido directamente en el archivo fuente localizado, mediante la herramienta de edición del agente. No basta con mostrarlo en el chat; el archivo del proyecto debe quedar modificado en disco.

Una nota al pie de una sola oración, en cursiva, para insertar inmediatamente después del pie de
figura existente de la Figura 5.

CRITERIOS DE CALIDAD

Claridad inmediata sobre la ruta de navegación sin necesidad de leer el texto completo de la
sección
No introduce inconsistencias con el resto del modelo de dominio
```

---

## HALLAZGO #8 — MENOR — Pseudocódigo crea asignaciones con `ASIGNADA` directamente, sin explicar `PENDIENTE` (Sec. 8.1 vs Sec. 10.3)

```
ROL
Actúa como: arquitecto de software senior especializado en máquinas de estado y ciclo de vida de
entidades de negocio.

DESTINATARIO
La respuesta está dirigida a: el propio agente de IA ejecutor. Localizar el archivo fuente que
contiene la Sección 10.3 del proyecto AulaMatch (el mismo archivo intervenido en el Hallazgo #1) y
agregar la aclaración directamente en el archivo, inmediatamente después del pseudocódigo del motor
automático, no como texto suelto en el chat.

CONTEXTO
Este trabajo forma parte de: la especificación del ciclo de vida del estado EstadoAsignacion
(PENDIENTE · ASIGNADA · CONFLICTO). El pseudocódigo de asignarAutomaticamente crea asignaciones
directamente con estado="ASIGNADA", sin que el documento explique en qué escenario una asignación
nace como PENDIENTE.

PROPÓSITO
El objetivo final es: completar el ciclo de vida del estado documentando explícitamente cuándo se
usa PENDIENTE, cerrando la brecha detectada entre el esquema relacional (que lo define como valor
DEFAULT) y el pseudocódigo (que nunca lo asigna).

TAREA PRINCIPAL
Tu tarea es: redactar el párrafo aclaratorio que defina el escenario de uso de PENDIENTE, coherente
con el resto del flujo de negocio ya documentado (creación manual de comisión sin aula confirmada
aún).

PROCESO DE RESOLUCIÓN
1 Revisar el DEFAULT 'PENDIENTE' del esquema relacional (Sección 8.2, tabla asignacion)
2 Revisar el flujo de "Gestión de excepciones en tiempo real" (Sección 1) y "Asignación manual
  asistida" (Sección 1 y 10.2) como candidatos naturales al estado PENDIENTE
3 Redactar la aclaración: el motor automático crea siempre en estado ASIGNADA (porque solo procesa
  comisiones que logran una asignación válida); PENDIENTE corresponde a una comisión recién creada
  vía POST /api/comisiones que aún no pasó por el motor automático ni por asignación manual
4 Verificar coherencia con el badge amarillo "Pendiente" ya resuelto en el Hallazgo #2

RESTRICCIONES

No modificar el pseudocódigo del motor automático (ya fue corregido en el Hallazgo #1; este
hallazgo es puramente de documentación textual)
No introducir una transición de estado no soportada por el esquema (PENDIENTE → CONFLICTO no
tiene sentido de negocio y no debe sugerirse)

FORMATO DE SALIDA

ACCIÓN REQUERIDA (no opcional): aplicar el siguiente contenido directamente en el archivo fuente localizado, mediante la herramienta de edición del agente. No basta con mostrarlo en el chat; el archivo del proyecto debe quedar modificado en disco.

Un párrafo de 3 a 5 líneas para insertar como nota inmediatamente después del pseudocódigo de la
Sección 10.3, antes de la Sección 10.4.

CRITERIOS DE CALIDAD

El ciclo de vida completo de EstadoAsignacion queda documentado sin zonas grises
Es consistente con el Hallazgo #2 (badge de PENDIENTE en el panel)
```

---

## HALLAZGO #9 — MENOR — Placeholder incompleto en `DATABASE_URL` del `.env` de ejemplo (Sec. 9)

```
ROL
Actúa como: ingeniero DevOps senior especializado en configuración de variables de entorno para
despliegues con Docker Compose.

DESTINATARIO
La respuesta está dirigida a: el propio agente de IA ejecutor. Localizar el archivo `.env` de
ejemplo (o el archivo de documento que lo contiene, Sección 9, Paso 3) del proyecto AulaMatch y
corregir la línea directamente en el archivo, no describir la corrección en el chat.

CONTEXTO
Este trabajo forma parte de: la Guía de Despliegue en Servidor de AulaMatch. La variable
DATABASE_URL en el archivo .env de ejemplo contiene un placeholder literal "..." dentro de la
cadena de conexión, lo que provocaría un error de parsing si un usuario copia el archivo sin
notar que debe reemplazarlo.

PROPÓSITO
El objetivo final es: que el archivo .env de ejemplo sea copiable y funcional de forma directa
(salvo por los valores que deliberadamente requieren reemplazo, como contraseñas y secretos),
eliminando el riesgo de error de parsing por placeholders ambiguos.

TAREA PRINCIPAL
Tu tarea es: corregir la línea DATABASE_URL para que use una referencia explícita a la variable
POSTGRES_PASSWORD ya definida más arriba en el mismo archivo, en lugar de "...".

PROCESO DE RESOLUCIÓN
1 Localizar el bloque de variables de entorno en el Paso 3 de la Sección 9
2 Reemplazar la línea
  DATABASE_URL=postgresql://aulamatch_user:...@db:5432/aulamatch
  por
  DATABASE_URL=postgresql://aulamatch_user:${POSTGRES_PASSWORD}@db:5432/aulamatch
3 Verificar que la sintaxis de interpolación ${VAR} sea compatible con cómo Docker Compose y/o el
  motor de la aplicación (Node.js + dotenv) resuelven variables de entorno referenciadas
4 Si el motor de configuración usado no soporta interpolación automática de variables dentro del
  mismo .env, señalarlo como advertencia y sugerir escribir el valor de la contraseña de forma
  literal en ambas variables

RESTRICCIONES

No cambiar el resto de las variables del bloque .env (POSTGRES_DB, POSTGRES_USER, JWT_SECRET, etc.)
No introducir herramientas de gestión de secretos no mencionadas en el documento (ej. Vault,
AWS Secrets Manager)

FORMATO DE SALIDA

ACCIÓN REQUERIDA (no opcional): aplicar el siguiente contenido directamente en el archivo fuente localizado, mediante la herramienta de edición del agente. No basta con mostrarlo en el chat; el archivo del proyecto debe quedar modificado en disco.

La línea corregida lista para reemplazo directo, más una advertencia de una línea sobre la
compatibilidad de la interpolación de variables si el stack no la soporta nativamente.

CRITERIOS DE CALIDAD

El archivo .env resultante es sintácticamente válido y copiable sin errores de parsing
No compromete la práctica ya documentada de "NO subir a Git"
```

---

## HALLAZGO #10 — SUGERENCIA — Afirmación de usabilidad sin respaldo en Q3 de la Sección 4

```
ROL
Actúa como: docente universitario de diseño de interacción, especializado en fundamentar
decisiones de UX con patrones reconocidos de la disciplina.

DESTINATARIO
La respuesta está dirigida a: el propio agente de IA ejecutor. Localizar el archivo fuente que
contiene la respuesta a la pregunta 3 de la Sección 4 del proyecto AulaMatch y reemplazar la
oración directamente en el archivo, no proponerla como texto suelto en el chat.

CONTEXTO
Este trabajo forma parte de: la justificación de decisiones de diseño de AulaMatch. La afirmación
actual —"El Panel de Conflictos como pantalla independiente evita que el flujo de resolución
interrumpa la vista de asignaciones"— es una hipótesis de diseño razonable pero no está anclada a
ningún patrón o principio reconocido, lo que la deja vulnerable en una defensa oral.

PROPÓSITO
El objetivo final es: elevar el rigor académico de la afirmación conectándola con un patrón de
diseño de interacción reconocido, sin cambiar la decisión de diseño en sí.

TAREA PRINCIPAL
Tu tarea es: reformular la oración señalada agregando una referencia a un patrón conocido de
navegación o arquitectura de información que la sustente.

PROCESO DE RESOLUCIÓN
1 Identificar el patrón más adecuado para justificar la separación de pantallas (ej. "Hub and
  Spoke" en arquitectura de navegación, o el principio de "Coincidencia entre el sistema y el
  mundo real" / "Consistencia y estándares" de Nielsen, ya usado en la Pregunta 5 de la Sección 9
  del documento de auditoría)
2 Reescribir la oración conectando la decisión con ese patrón, sin inventar datos de usuarios
  reales ni estudios de usabilidad que no se realizaron
3 Mantener el tono y extensión similares al resto de las respuestas de la Sección 4

RESTRICCIONES

No afirmar que se realizaron tests de usabilidad, entrevistas o validaciones con usuarios reales
si eso no ocurrió
No citar estudios académicos específicos con datos inventados; solo referenciar principios de
diseño de interacción de dominio público (Nielsen, patrones de navegación estándar)

FORMATO DE SALIDA

ACCIÓN REQUERIDA (no opcional): aplicar el siguiente contenido directamente en el archivo fuente localizado, mediante la herramienta de edición del agente. No basta con mostrarlo en el chat; el archivo del proyecto debe quedar modificado en disco.

Una oración de reemplazo (2-3 líneas) lista para sustituir la afirmación original dentro de la
respuesta a la pregunta 3 de la Sección 4.

CRITERIOS DE CALIDAD

La afirmación queda anclada a un principio o patrón verificable, no a una intuición no respaldada
Mantiene la misma decisión de diseño, solo cambia su fundamentación
```

---

## HALLAZGO #11 — SUGERENCIA — Prompt de Midjourney especifica "dark mode" pero los wireframes son en modo claro (Sec. 2 vs Sec. 3)

```
ROL
Actúa como: diseñador UX/UI senior con experiencia en flujos de trabajo de diseño asistido por IA
(Midjourney → Figma AI).

DESTINATARIO
La respuesta está dirigida a: el propio agente de IA ejecutor. Localizar el archivo fuente que
contiene la Sección 4 del proyecto AulaMatch y agregar la aclaración directamente en el archivo, no
como texto descriptivo en el chat.

CONTEXTO
Este trabajo forma parte de: el flujo de diseño documentado en dos etapas — Sección 2 (prompt de
Midjourney, con sidebar navy oscuro pero interfaz general que puede leerse como orientada a modo
oscuro) y Sección 3 (wireframes funcionales de Figma AI, con fondo blanco y filas grises,
claramente en modo claro). El documento no explica esta transición.

PROPÓSITO
El objetivo final es: dejar constancia explícita de que la elección final fue modo claro por
razones de legibilidad institucional, evitando que un evaluador interprete la diferencia como una
inconsistencia no intencional del proceso.

TAREA PRINCIPAL
Tu tarea es: redactar una breve nota para insertar en la Sección 4 (respuesta a la pregunta 1,
sobre estilo visual) que explique por qué la referencia conceptual de Midjourney evolucionó hacia
un modo claro en el wireframe funcional.

PROCESO DE RESOLUCIÓN
1 Revisar la respuesta actual a la pregunta 1 de la Sección 4, que ya justifica el diseño flat y
  la paleta semántica
2 Agregar una o dos oraciones que aclaren: el mockup de Midjourney sirvió como referencia
  conceptual de paleta y estructura (sidebar navy, acentos azules), pero el modo claro se adoptó en
  Figma AI por legibilidad prolongada en el contexto de uso (jornadas administrativas extensas,
  ya mencionado en el propio documento)
3 Mantener coherencia con el argumento ya presente sobre "reducción de fatiga ocular" del fondo
  #F7F8FC

RESTRICCIONES

No regenerar ni modificar el prompt de Midjourney de la Sección 2 (queda como referencia histórica
del proceso)
No contradecir la justificación de paleta ya presente en la Sección 4

FORMATO DE SALIDA

ACCIÓN REQUERIDA (no opcional): aplicar el siguiente contenido directamente en el archivo fuente localizado, mediante la herramienta de edición del agente. No basta con mostrarlo en el chat; el archivo del proyecto debe quedar modificado en disco.

Una nota de 2-3 oraciones lista para insertar al final de la respuesta a la pregunta 1 de la
Sección 4.

CRITERIOS DE CALIDAD

La transición de modo oscuro (referencia) a modo claro (funcional) queda documentada como decisión
consciente, no como omisión
Refuerza la narrativa de iteración de diseño ya presente en la pregunta 4 de la misma sección
```

---

## HALLAZGO #12 — SUGERENCIA — Filtro `estado != "CONFLICTO"` no documentado como mecanismo de idempotencia (Sec. 10.5)

```
ROL
Actúa como: ingeniero de software senior especializado en sistemas de detección de conflictos e
idempotencia de procesos automáticos.

DESTINATARIO
La respuesta está dirigida a: el propio agente de IA ejecutor. Localizar el archivo fuente que
contiene el pseudocódigo de la Sección 10.5 del proyecto AulaMatch y agregar la línea explicativa
directamente en el archivo, no como texto suelto en el chat.

CONTEXTO
Este trabajo forma parte de: la Verificación 1 (Superposición horaria) del proceso de detección de
conflictos. El pseudocódigo filtra "AND estado != 'CONFLICTO'" al buscar otras asignaciones en el
mismo aula y horario, lo cual es una decisión válida para evitar que dos comisiones ya marcadas en
conflicto entre sí se re-detecten mutuamente en cada ejecución, pero esa razón no está explicada en
el texto.

PROPÓSITO
El objetivo final es: documentar explícitamente que el filtro existe para garantizar idempotencia
del proceso de detección, evitando que un evaluador interprete la condición como un descuido o
como una omisión de casos de conflicto múltiple.

TAREA PRINCIPAL
Tu tarea es: agregar un comentario dentro del bloque de pseudocódigo de la Verificación 1 (Sección
10.5) que explique el propósito de la condición estado != "CONFLICTO".

PROCESO DE RESOLUCIÓN
1 Localizar el bloque "Verificación 1 — Superposición horaria" en la Sección 10.5
2 Insertar un comentario inline (usando el mismo estilo // ya presente en el pseudocódigo del
  documento) inmediatamente después de la condición SI EXISTE otra Asignacion WHERE...
3 Redactar el comentario explicando que el filtro evita la re-detección de conflictos ya marcados,
  garantizando que el proceso sea idempotente ante ejecuciones repetidas (ej. vía
  POST /api/conflictos/detectar)

RESTRICCIONES

No modificar la lógica de la condición en sí, solo agregar el comentario explicativo
No extender la explicación a la Verificación 2 (Cupo excedido), que no presenta este mismo patrón

FORMATO DE SALIDA

ACCIÓN REQUERIDA (no opcional): aplicar el siguiente contenido directamente en el archivo fuente localizado, mediante la herramienta de edición del agente. No basta con mostrarlo en el chat; el archivo del proyecto debe quedar modificado en disco.

Una línea de comentario en el mismo formato del pseudocódigo existente (prefijo //), lista para
insertar en el bloque de la Verificación 1 de la Sección 10.5.

CRITERIOS DE CALIDAD

El comentario es técnicamente preciso respecto al concepto de idempotencia
No altera el comportamiento documentado del sistema, solo mejora su documentación
```

---

## HALLAZGO #13 — SUGERENCIA — Falta mención de rotación de `JWT_SECRET` (Sec. 10.4)

```
ROL
Actúa como: ingeniero de seguridad backend especializado en gestión de secretos y ciclo de vida de
credenciales criptográficas.

DESTINATARIO
La respuesta está dirigida a: el propio agente de IA ejecutor. Localizar el archivo fuente que
contiene la Sección 10.4 del proyecto AulaMatch (el mismo archivo intervenido en el Hallazgo #5) y
agregar la nota de seguridad directamente en el archivo, no como texto descriptivo en el chat.

CONTEXTO
Este trabajo forma parte de: la especificación de autenticación JWT de AulaMatch, que usa HS256
(algoritmo simétrico) con expiración de 8 horas. El documento no menciona ninguna política de
rotación del JWT_SECRET, lo que implica que, si el secreto se filtra, todos los tokens
históricos y futuros firmados con ese secreto quedan comprometidos hasta que se rote.

PROPÓSITO
El objetivo final es: dejar documentada una mitigación básica y realista frente al riesgo inherente
de usar un algoritmo simétrico en producción, reforzando la sección de seguridad del trabajo de
cara a la defensa oral.

TAREA PRINCIPAL
Tu tarea es: redactar una nota breve sobre rotación periódica del JWT_SECRET como mitigación
complementaria a la expiración de 8 horas ya definida.

PROCESO DE RESOLUCIÓN
1 Revisar la configuración actual: HS256, JWT_EXPIRES_IN=8h, JWT_SECRET en variable de entorno
2 Redactar la nota explicando que la expiración de 8h ya limita la ventana de exposición, y que una
  rotación periódica del secreto (ej. trimestral, o ante sospecha de filtración) añade una capa de
  mitigación adicional
3 Aclarar que rotar el secreto invalida todos los tokens activos al momento del cambio, lo cual es
  aceptable dado el uso institucional diurno del sistema (los usuarios simplemente vuelven a
  iniciar sesión)

RESTRICCIONES

No proponer una migración a RS256 ni a un sistema de gestión de secretos externo, ya que la
Pregunta 3 de la Sección 9 (Preguntas Probables en Defensa Oral) del propio documento ya justifica
por qué HS256 es suficiente para este monolito
No introducir mecanismos de refresh tokens, explícitamente fuera de alcance según el propio
documento

FORMATO DE SALIDA

ACCIÓN REQUERIDA (no opcional): aplicar el siguiente contenido directamente en el archivo fuente localizado, mediante la herramienta de edición del agente. No basta con mostrarlo en el chat; el archivo del proyecto debe quedar modificado en disco.

Una nota de 3-4 líneas para agregar al final de la Sección 10.4, después del fragmento de código
Express con authenticate y authorize.

CRITERIOS DE CALIDAD

La nota es coherente con la justificación de HS256 ya presente en la Sección 9 (Preguntas de
Defensa)
Propone una mitigación realista y de bajo costo de implementación, no una reingeniería de la
arquitectura de seguridad
```

---

## Notas de uso

- Los prompts están ordenados según la severidad de la Matriz de Hallazgos (críticos → moderados →
  menores → sugerencias), para priorizar su resolución antes del render final del documento.
- Cada prompt debe ejecutarse contra un agente de IA con acceso de edición al repositorio del
  proyecto AulaMatch (Google Antigravity, Claude Code, o equivalente), que debe localizar el archivo
  fuente real y aplicar la corrección directamente en él. Ninguno depende de los demás para
  ejecutarse, salvo el Hallazgo #8, que se apoya en la resolución previa del Hallazgo #2 (coherencia
  del badge PENDIENTE).
- **Checklist de cierre:** una vez procesados los 13 hallazgos, verificar que existan cambios reales
  en los archivos del repositorio (por ejemplo con `git diff` o el historial de ediciones del
  agente) para cada uno. Si algún hallazgo no generó una modificación persistida en disco, no debe
  darse por resuelto, sin importar que el agente haya producido una respuesta en el chat describiendo
  la corrección.
- Una vez aplicadas las 13 correcciones sobre los archivos reales del proyecto, el documento queda
  alineado con el veredicto de la auditoría: "trabajo técnicamente sólido con dos puntos críticos
  corregibles antes de la defensa."
