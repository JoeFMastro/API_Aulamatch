> [!WARNING]
> **Documento histórico — No usar como referencia de estado actual.**
> Este reporte registra la verificación post-fix del estado del proyecto al **28 de junio de 2026**, inmediatamente antes del primer deploy en Render.
> El sistema ha continuado evolucionando desde esa fecha (módulo de Reportes, seed de demo, endpoint de reset, documentación de visión futura).
> Para el estado actual del proyecto, ver [guia-deploy-render.md](guia-deploy-render.md).

> [!CAUTION]
> **Este documento es un registro histórico del estado del proyecto al 28/06/2026. El estado actual puede diferir.**

# Reporte de Re-Auditoría de Listo para Producción (Pre-Deploy Render)
**Fecha:** 28 de Junio de 2026  
**Auditor:** Antigravity (Auditor Técnico Senior de Backend)  
**Proyecto:** AulaMatch API  
**Estado:** Rama `main` con el merge de `fix/pre-deploy-bloqueantes` aplicado

---

## 1. Resumen Ejecutivo
Los 4 hallazgos identificados en la auditoría previa (2 bloqueantes y 2 importantes) han sido resueltos de manera satisfactoria. La suite de pruebas de integración completa se ejecutó con éxito (15/15 tests pasando) y el entorno local Docker levantó correctamente validando el estado del backend y la base de datos. No se detectaron regresiones ni cambios no autorizados fuera de los fixes descritos.

---

## 2. Tabla de Verificación

| Hallazgo Original | Estado | Evidencia | Observación |
| :--- | :--- | :--- | :--- |
| **1. SSL en conexiones Postgres (Bloqueante)** | **Resuelto** | [db.js](file:///home/joel/Documentos/cursos_UTN/curso%20de%20IA/proyectos/API_Aulamatch/backend/src/config/db.js#L8-L9)<br>[migrate.js](file:///home/joel/Documentos/cursos_UTN/curso%20de%20IA/proyectos/API_Aulamatch/backend/scripts/migrate.js#L58) | Se configuró el atributo `ssl` de manera condicional estricta. Sólo se activa si `NODE_ENV === 'production'`. En entornos de test y desarrollo, el comportamiento permanece desactivado (evitando usar SSL), lo cual mantiene la compatibilidad sin cambios. |
| **2. Contexto Docker y ruta SQL (Bloqueante)** | **Resuelto** | [migrate.js](file:///home/joel/Documentos/cursos_UTN/curso%20de%20IA/proyectos/API_Aulamatch/backend/scripts/migrate.js#L102)<br>[dbSetup.js](file:///home/joel/Documentos/cursos_UTN/curso%20de%20IA/proyectos/API_Aulamatch/backend/tests/dbSetup.js#L60)<br>[docker-compose.yml](file:///home/joel/Documentos/cursos_UTN/curso%20de%20IA/proyectos/API_Aulamatch/deploy/docker-compose.yml#L35)<br>[guia-deploy-render.md](file:///home/joel/Documentos/cursos_UTN/curso%20de%20IA/proyectos/API_Aulamatch/docs/guia-deploy-render.md#L105) | La carpeta física `deploy/init-db` fue removida y sus scripts se movieron a `backend/sql`. Los scripts de base de datos (`dbSetup.js` y `migrate.js`) apuntan correctamente a la ruta relativa `/backend/sql`. El volumen de docker-compose y la guía de Render quedaron consistentes con el contexto de build en `backend/`. *Nota: Quedan algunos comentarios y documentación local desactualizados que aún mencionan la ruta antigua.* |
| **3. Configuración CORS abierta en Prod (Importante)** | **Resuelto** | [app.js](file:///home/joel/Documentos/cursos_UTN/curso%20de%20IA/proyectos/API_Aulamatch/backend/src/app.js#L12-L29)<br>[.env.example](file:///home/joel/Documentos/cursos_UTN/curso%20de%20IA/proyectos/API_Aulamatch/.env.example#L38-L39) | `ALLOWED_ORIGINS` parsea de forma correcta múltiples orígenes separados por comas y elimina espacios. Si no se define la variable, CORS queda abierto a todos los orígenes (`*`) pero emite una advertencia visible en consola al iniciar el servidor. Se documentó la variable en `.env.example`. |
| **4. Desviación de Roles sin documentación (Importante)** | **Resuelto** | [decisiones-diseno.md](file:///home/joel/Documentos/cursos_UTN/curso%20de%20IA/proyectos/API_Aulamatch/docs/decisiones-diseno.md)<br>[README.md](file:///home/joel/Documentos/cursos_UTN/curso%20de%20IA/proyectos/API_Aulamatch/README.md#L137) | El endpoint `POST /api/comisiones` en `academico/routes.js` no se alteró (sigue permitiendo `COORDINADOR` y `ADMINISTRATIVO`), y se documentó formalmente esta desviación y su justificación en `docs/decisiones-diseno.md`, el cual está debidamente enlazado desde el `README.md` principal. |

---

## 3. Escaneo de Regresiones y Cambios Fuera de Alcance

### 3.1. Análisis de Archivos Modificados
Se revisó el diff completo de la rama mergeada mediante control de cambios de Git. No existen modificaciones fuera de alcance:
- Las modificaciones en `.env.example`, `README.md`, `backend/scripts/migrate.js`, `backend/src/app.js`, `backend/src/config/db.js`, `backend/tests/dbSetup.js`, `deploy/docker-compose.yml`, y `docs/guia-deploy-render.md` corresponden directamente a los fixes de los 4 hallazgos.
- El movimiento de archivos `deploy/init-db/*.sql` a `backend/sql/*.sql` se realizó sin alterar el contenido SQL de los esquemas originales.
- Se añadió un único archivo nuevo: `docs/decisiones-diseno.md`.

### 3.2. Archivos Sensibles y `.env`
Se verificó que ningún archivo `.env` real (de configuración o test) quedó accidentalmente trackeado en el repositorio de Git. Los únicos archivos relacionados con variables de entorno bajo seguimiento son:
- `.env.example` (plantilla de desarrollo)
- `backend/.env.test.example` (plantilla de test)
- `backend/src/config/env.js` (cargador y validador de configuración)

### 3.3. Inconsistencias de Documentación (Observaciones Menores)
Se detectaron comentarios/logs obsoletos que aún hacen referencia a la ruta antigua `deploy/init-db/`:
- **`backend/src/modules/conflictos/service.js` (Línea 24):** `* Ver justificación completa en deploy/init-db/03_notificaciones.sql`
- **`backend/scripts/generate-seed-hashes.js` (Líneas 6 y 36):** Referencias a `deploy/init-db/02_usuarios.sql`.
- **`backend/scripts/migrate.js` (Línea 6):** Comentario de cabecera que hace referencia a `deploy/init-db/`.
- **`docs/guia-desarrollo-local.md` (Línea 61):** Paso 3 menciona `deploy/init-db/01_schema.sql`.

Estas referencias no rompen la lógica operativa de la aplicación en producción ni local, pero deberían actualizarse en una futura tarea de mantenimiento preventivo.

---

## 4. Conclusión Final

### ✅ listo para Render
El código y la configuración son consistentes, las dependencias de base de datos se resolvieron de forma robusta, todos los tests de integración pasan (15/15) y no hay riesgos bloqueantes residuales identificados antes de proceder a la creación y despliegue de los servicios en Render.
