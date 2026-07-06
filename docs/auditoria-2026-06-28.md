> [!WARNING]
> **Documento histórico — No usar como referencia de estado actual.**
> Este reporte registra el estado del proyecto al **28 de junio de 2026**, antes del deploy en Render.
> Todos los hallazgos bloqueantes e importantes listados aquí **ya fueron resueltos**.
> Para el estado actual del proyecto, ver [guia-deploy-render.md](guia-deploy-render.md) y [re-auditoria-2026-06-28.md](re-auditoria-2026-06-28.md).

# Reporte de Auditoría Técnica Pre-Despliegue — AulaMatch (2026-06-28)

## 1. Resumen Ejecutivo
El backend de AulaMatch presenta una arquitectura modular sólida, con la suite de pruebas de integración pasando en su totalidad (15/15 tests) y un manejo correcto del aislamiento de datos en tests y hashes bcrypt de contraseñas. Sin embargo, existen **2 hallazgos bloqueantes** de configuración (falta de SSL en base de datos y un conflicto en el contexto de Docker Build que rompería el despliegue en Render), además de **2 hallazgos importantes** (ausencia total del módulo de reportes y configuración abierta de CORS). Se recomienda corregir estos aspectos antes de proceder con el despliegue en producción.

---

## 2. Tabla de Hallazgos

| Dimensión | Hallazgo | Severidad | Archivo(s) afectado(s) | Recomendación |
|---|---|---|---|---|
| **Configuración** | **Bloqueo de conexión por falta de SSL**: Las conexiones a PostgreSQL en Render requieren SSL. Actualmente ni el pool de la app ni el cliente del script de migración configuran SSL, lo que causará caídas instantáneas (crash) en producción o al intentar correr migraciones remotas (Paso 6, Opción B). | **Bloqueante** | [db.js](file:///home/joel/Documentos/cursos_UTN/curso%20de%20IA/proyectos/API_Aulamatch/backend/src/config/db.js#L5-L15)<br>[migrate.js](file:///home/joel/Documentos/cursos_UTN/curso%20de%20IA/proyectos/API_Aulamatch/backend/scripts/migrate.js#L56) | Agregar la configuración de SSL `{ ssl: { rejectUnauthorized: false } }` cuando `NODE_ENV === 'production'` o al detectar una base de datos externa. |
| **Configuración** | **Incompatibilidad de contexto Docker Build**: La guía de Render indica usar `.` (raíz) como contexto, pero el Dockerfile asume context `backend/` al ejecutar `COPY package.json ./`. Si se cambia el contexto a `backend/` en Render para evitar fallar el build, la carpeta `deploy/` quedará fuera del contenedor, haciendo imposible ejecutar las migraciones desde el Shell de Render ya que `migrate.js` busca `deploy/init-db/`. | **Bloqueante** | [guia-deploy-render.md](file:///home/joel/Documentos/cursos_UTN/curso%20de%20IA/proyectos/API_Aulamatch/docs/guia-deploy-render.md#L103-L104)<br>[Dockerfile](file:///home/joel/Documentos/cursos_UTN/curso%20de%20IA/proyectos/API_Aulamatch/backend/Dockerfile#L23-L29)<br>[migrate.js](file:///home/joel/Documentos/cursos_UTN/curso%20de%20IA/proyectos/API_Aulamatch/backend/scripts/migrate.js#L99) | Ajustar la ubicación del script de migración y la copia de esquemas SQL (ej. mover los SQL a `backend/src/config/sql` o similar), de modo que el contenedor del backend sea auto-contenido y no dependa de directorios hermanos en desarrollo. |
| **Completitud funcional** | **Módulo de Reportes no implementado**: Los endpoints `/api/reportes/asignaciones` y `/api/reportes/disponibilidad` requeridos en el diseño original están comentados y sólo existen archivos stub con comentarios TODO. | **Importante** | [app.js](file:///home/joel/Documentos/cursos_UTN/curso%20de%20IA/proyectos/API_Aulamatch/backend/src/app.js#L35-L36)<br>[routes.js](file:///home/joel/Documentos/cursos_UTN/curso%20de%20IA/proyectos/API_Aulamatch/backend/src/modules/reportes/routes.js)<br>[controller.js](file:///home/joel/Documentos/cursos_UTN/curso%20de%20IA/proyectos/API_Aulamatch/backend/src/modules/reportes/controller.js)<br>[service.js](file:///home/joel/Documentos/cursos_UTN/curso%20de%20IA/proyectos/API_Aulamatch/backend/src/modules/reportes/service.js) | Implementar los servicios y controladores correspondientes para habilitar los reportes en formato JSON/CSV y ocupación por edificio antes del despliegue productivo final. |
| **Seguridad** | **Configuración permisiva de CORS**: El middleware global de CORS se aplica por omisión `app.use(cors())` permitiendo solicitudes cruzadas desde cualquier origen. | **Importante** | [app.js](file:///home/joel/Documentos/cursos_UTN/curso%20de%20IA/proyectos/API_Aulamatch/backend/src/app.js#L11) | Configurar CORS restringiendo las peticiones a un listado explícito de dominios de confianza mediante una variable de entorno `ALLOWED_ORIGINS`. |
| **Consistencia** | **Desviación de roles en Registro de Comisión**: El endpoint `POST /api/comisiones` permite el acceso a `COORDINADOR` y `ADMINISTRATIVO` en el router, pero la especificación del diseño original (Sección 10.2) restringe este endpoint a **Solo Administrativo**. | **Importante** | [routes.js](file:///home/joel/Documentos/cursos_UTN/curso%20de%20IA/proyectos/API_Aulamatch/backend/src/modules/academico/routes.js#L77-L88) | Evaluar si se debe restringir el endpoint en el router para cumplir rigurosamente el diseño, o si se modifica el documento de diseño original si la decisión del desarrollador fue aprobada. |
| **Configuración** | **Inclusión de archivos innecesarios en producción**: La instrucción `COPY . .` copia logs locales, archivos de tests (`tests/`) y esquemas de variables de pruebas (`.env.test.example`) al contenedor de producción. | **Menor** | [Dockerfile](file:///home/joel/Documentos/cursos_UTN/curso%20de%20IA/proyectos/API_Aulamatch/backend/Dockerfile#L29)<br>[.dockerignore](file:///home/joel/Documentos/cursos_UTN/curso%20de%20IA/proyectos/API_Aulamatch/backend/.dockerignore) | Añadir patrones de exclusión en `.dockerignore` (`tests/`, `*.log`, `.env.test*`) para optimizar el tamaño de la imagen. |
| **Documentación** | **Estado del README desactualizado**: La sección "Estado" describe el proyecto en etapa de "Scaffolding inicial y configuración local", omitiendo la madurez de los módulos completados. | **Menor** | [README.md](file:///home/joel/Documentos/cursos_UTN/curso%20de%20IA/proyectos/API_Aulamatch/README.md#L14) | Actualizar el README para reflejar el estado actual (módulos funcionales y suite de pruebas completadas). |
| **Documentación** | **CHANGELOG desactualizado**: No registra la creación de la guía de despliegue en Render, las correcciones de Docker local ni la configuración final de la suite de pruebas de integración. | **Menor** | [CHANGELOG.md](file:///home/joel/Documentos/cursos_UTN/curso%20de%20IA/proyectos/API_Aulamatch/CHANGELOG.md) | Agregar una versión final o notas de release que cubran el scaffolding del deploy en Render y el setup de tests. |
| **Completitud funcional** | **Endpoint de salud discrepante**: La sección 10.2 del diseño detalla el endpoint `/health` (público) bajo Reportes, pero el código lo monta directamente bajo `/api/health`. | **Menor** | [app.js](file:///home/joel/Documentos/cursos_UTN/curso%20de%20IA/proyectos/API_Aulamatch/backend/src/app.js#L16) | Alinear la especificación de diseño o agregar un redireccionamiento/alias en el router si es necesario. |
| **Consistencia** | **Semántica del parámetro :id en Aulas Compatibles**: El endpoint `GET /api/asignaciones/:id/aulas-compatibles` toma el `:id` como `comision_id` en lugar de `asignacion_id`, desviándose sutilmente de la semántica habitual de los routers REST. | **Menor** | [routes.js](file:///home/joel/Documentos/cursos_UTN/curso%20de%20IA/proyectos/API_Aulamatch/backend/src/modules/asignaciones/routes.js#L61-L67) | Documentar de forma clara esta decisión en la sección de rutas para evitar confusiones de integración. |

---

## 3. Checklist de Production Readiness

### 1. Completitud Funcional: ⚠️ (Incompleto)
- [x] Autenticación y Autorización (/api/auth) - Implementado y montado.
- [x] Académico (/api/comisiones, etc.) - Implementado y montado.
- [x] Aulas y Edificios (/api/edificios, /api/aulas) - Implementado y montado.
- [x] Asignaciones (/api/asignaciones) - Implementado y montado.
- [x] Conflictos (/api/conflictos) - Implementado y montado.
- [ ] Reportes (/api/reportes) - **FALTANTE** (Stubs comentados).
- [x] Healthcheck (/api/health) - Implementado y montado.

### 2. Seguridad: ⚠️ (Importante)
- [x] Ningún archivo `.env` real está trackeado en el repositorio (verificado con `git ls-files`).
- [x] `.gitignore` cubre `node_modules/`, `.env`, `.env.test` y salidas de compilación.
- [x] `JWT_SECRET` no tiene valores débiles por defecto en el código (se valida de forma estricta en `env.js`).
- [x] Todos los endpoints de escritura (POST/PATCH/DELETE) tienen aplicados `authenticate` y `authorize`.
- [x] Contraseñas almacenadas exclusivamente como hashes de bcrypt tanto en seeds (`02_usuarios.sql`) como en fixtures de tests (`fixtures.js`).
- [ ] CORS configurado de forma restrictiva - **FALTANTE** (Usa wildcard abierto `*`).

### 3. Configuración: ❌ (Bloqueante)
- [x] `config/env.js` valida correctamente las variables críticas (JWT_SECRET y base de datos).
- [x] El Dockerfile producción separa dependencias con `--omit=dev`.
- [ ] Docker Build Context consistente para Render - **FALTANTE** (Provoca fallos de build y ejecución de migraciones en la guía actual).
- [ ] Configuración de conexión segura (SSL) a base de datos en producción - **FALTANTE** (Requerida por Render, provocará fallos de conexión).

### 4. Calidad de Tests: ✅ (Cumplido)
- [x] Cobertura real contra casos de borde descritos (priorización de edificio preferido probado en `Caso Prioridad por Edificio Preferido`, no duplicación en `/automatica` validado, y prevención de colisión horaria/exceso de cupo comprobados).
- [x] Independencia de orden de ejecución en suite de tests (verificado: uso de `resetDbAndSeed` en `beforeEach` en cada suite).

### 5. Documentación: ⚠️ (Importante)
- [x] El README documenta el setup y comandos para iniciar el proyecto en local desde cero.
- [ ] CHANGELOG.md actualizado con las últimas revisiones del entorno Render y Docker Compose.
- [ ] `docs/guia-deploy-render.md` coherente con el código (indica un contexto incorrecto y pasos de migración local sin soporte SSL).

### 6. Consistencia Diseño-Código: ⚠️ (Importante)
- [ ] Roles y permisos alineados al 100% con la sección 10.2 (Discrepancia en `POST /api/comisiones`).
- [x] Decisiones del CHANGELOG coherentes con el código real (reglas de inferencia de aulas y lógica de superposición).
