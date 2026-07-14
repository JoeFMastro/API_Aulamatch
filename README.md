# AulaMatch API

> API REST para la gestión y asignación automática de espacios académicos en entornos universitarios.

![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Jest](https://img.shields.io/badge/tests-23%20passing-brightgreen?logo=jest&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)

---

## ¿Qué es AulaMatch?

AulaMatch resuelve un problema concreto de las universidades: asignar aulas a comisiones de manera eficiente, evitando superposiciones horarias y respetando restricciones de capacidad, tipo de aula y preferencias de edificio de cada unidad académica.

El sistema permite a un **Coordinador** ejecutar una asignación automática masiva al inicio de cada cuatrimestre, gestionar manualmente los casos especiales, detectar y resolver conflictos de solapamiento en tiempo real, y exportar reportes de ocupación en formato JSON o CSV.

Fue desarrollado como proyecto final de la materia **Herramientas de IA aplicadas al Diseño** (UNSAM, 2026), utilizando asistencia de IA de forma documentada y trazable a lo largo de todo el proceso de construcción.

---

## Stack tecnológico

| Tecnología | Versión | Rol |
|---|---|---|
| Node.js | 22 | Runtime |
| Express | 5 | Framework HTTP |
| PostgreSQL | 16 | Base de datos relacional |
| Docker + Docker Compose | v2 | Entorno de desarrollo local |
| Jest + Supertest | — | Tests de integración |
| bcrypt | — | Hashing de contraseñas |
| jsonwebtoken | — | Autenticación JWT |

---

## Funcionalidades implementadas

| Módulo | Descripción | Estado |
|---|---|---|
| **auth** | Login con JWT, logout stateless, endpoint `/me`. Roles `COORDINADOR` y `ADMINISTRATIVO` con scopes diferenciados. | ✅ Completo |
| **aulas** | CRUD completo de Edificios y Aulas (tipo, capacidad, ubicación). | ✅ Completo |
| **académico** | Listados de Unidades Académicas, Carreras, Materias (con relación M:N a Carreras), Docentes y Comisiones. Gestión de excepciones en tiempo real. | ✅ Completo |
| **asignaciones** | Motor de asignación automática (prioriza cupo, tipo de aula, disponibilidad horaria y edificio preferido de la UA), asignación manual asistida, consulta de aulas compatibles y reasignación. | ✅ Completo |
| **conflictos** | Detección automática de superposición horaria y cupo excedido. Notificaciones persistidas en tabla propia. Métricas para panel de control. Resolución manual con re-verificación automática. | ✅ Completo |
| **reportes** | Exportación de asignaciones por período en JSON y CSV (compatible con Excel, con BOM UTF-8). Reporte de disponibilidad de aulas por edificio y franja horaria con cálculo de ocupación porcentual. | ✅ Completo |
| **Tests** | Suite de integración (Jest + Supertest) contra PostgreSQL real: 23 tests cubriendo auth, asignaciones, conflictos y reportes. | ✅ 23 pasando |
| **Deploy en Render** | Backend y base de datos desplegados correctamente en Render con conexión segura. Frontend conectado a la API productiva. | ✅ Completo |

---

## Arquitectura

El backend sigue una **arquitectura de monolito modular en 3 capas**:

```
┌─────────────────────────────────────────┐
│  Presentación (routes + controllers)    │  ← Recibe HTTP, valida entrada, delega
├─────────────────────────────────────────┤
│  Lógica de Negocio (services)           │  ← Motor de asignación, detección de conflictos, reglas de rol
├─────────────────────────────────────────┤
│  Persistencia (config/db.js + SQL puro) │  ← Pool pg, queries parametrizadas, sin ORM
└─────────────────────────────────────────┘
```

Cada módulo (`auth`, `aulas`, `academico`, `asignaciones`, `conflictos`, `reportes`) es autónomo: tiene su propio `routes.js`, `controller.js` y `service.js`. La comunicación entre módulos es explícita (importación directa del service correspondiente), sin bus de eventos ni capa de abstracción adicional.

Para las decisiones de diseño relevantes y las desviaciones justificadas respecto al modelo original, ver [`docs/decisiones-diseno.md`](docs/decisiones-diseno.md).

---

## Estructura del repositorio

```
API_Aulamatch/
├── backend/
│   ├── src/
│   │   ├── config/          # Pool de conexiones a PostgreSQL y validación de env vars
│   │   ├── middlewares/     # authenticate (JWT), authorize (roles), errorHandler (global)
│   │   └── modules/         # auth, aulas, academico, asignaciones, conflictos, reportes
│   ├── sql/                 # Scripts de migración para deploy externo
│   ├── tests/               # Suites de integración (Jest + Supertest)
│   ├── Dockerfile           # Multi-stage: target dev y prod
│   └── package.json
├── frontend/
│   ├── src/                 # Componentes genéricos, layouts, hooks y servicios API
│   ├── public/              # Assets estáticos
│   ├── vite.config.js       # Configuración del empaquetador
│   └── package.json
├── deploy/
│   ├── docker-compose.yml   # Servicios locales: db (postgres:16) + backend con hot-reload
│   └── init-db/             # Scripts SQL de inicialización
├── docs/
│   ├── diseño-original.md         # Modelo de dominio, diagrama de clases, endpoints
│   ├── decisiones-diseno.md       # Desviaciones justificadas respecto al diseño original
│   ├── guia-desarrollo-local.md   # Guía detallada de setup local
│   ├── guia-deploy-render.md      # Guía paso a paso para deploy en Render
│   └── guia-frontend.md           # Arquitectura y setup del frontend React
├── entrega/
│   ├── Actividad4_Joel_Mastroiaco_Completo.pdf  # Documento académico completo
│   ├── entrega_final_Joel_Mastroiaco.pdf        # Documento final de entrega
│   └── README.md
├── CHANGELOG.md             # Historial de versiones con decisiones técnicas
├── .env.example             # Plantilla de variables de entorno (copiar a .env)
└── README.md
```

---

## Requisitos previos

- **Node.js** v22 o superior (solo necesario si corrés los tests fuera de Docker)
- **Docker** instalado y corriendo
- **Docker Compose** v2 (`docker compose` sin guion medio)

---

## Setup local paso a paso

### 1. Clonar el repositorio

```bash
git clone https://github.com/JoeFMastro/API_Aulamatch.git
cd API_Aulamatch
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Abrí el archivo `.env` y completá como mínimo:

- `POSTGRES_PASSWORD` — contraseña de la base de datos
- `DATABASE_URL` — string de conexión completo (ajustar la contraseña elegida)
- `JWT_SECRET` — cadena aleatoria larga (mínimo 32 caracteres)

> **Nota sobre puertos:** Si los puertos `5432` (PostgreSQL) o `3001` (backend) ya están en uso en tu máquina, podés cambiar `HOST_DB_PORT` y `HOST_BACKEND_PORT` en el `.env` para que Docker los exponga en puertos alternativos, sin modificar ningún otro archivo.

### 3. Levantar los servicios

> Ejecutar desde la **raíz del repositorio** (donde está el `.env`).

```bash
docker compose -f deploy/docker-compose.yml up --build
```

El servicio `backend` espera automáticamente a que la base de datos supere el healthcheck antes de arrancar. Las migraciones SQL se aplican manualmente con `npm run migrate` (ver [guia-desarrollo-local.md](docs/guia-desarrollo-local.md)).

### 4. Verificar que todo funciona

```bash
curl -i http://localhost:3001/api/health
```

Respuesta esperada (`HTTP 200`):

```json
{"status":"ok","db":"connected"}
```

### 5. Credenciales del seed de desarrollo

El script de inicialización crea dos usuarios de prueba:

| Email | Contraseña | Rol |
|---|---|---|
| `coordinador@aulamatch.edu` | `Coord1234!` | `COORDINADOR` |
| `admin@aulamatch.edu` | `Admin1234!` | `ADMINISTRATIVO` (UA: FRBA) |

### Detener los servicios

```bash
docker compose -f deploy/docker-compose.yml down
```

---

## Correr los tests

Los tests se ejecutan dentro del contenedor del backend contra una base de datos real (`aulamatch_test`). **El contenedor de la base de datos debe estar corriendo** antes de ejecutar los tests.

```bash
cd backend
npm test
```

Resultado esperado:

```
Test Suites: 4 passed, 4 total
Tests:       23 passed, 23 total
Time:        ~4s
```

> Los tests corren en modo secuencial (`--runInBand`) para garantizar el aislamiento entre escenarios y evitar colisiones en la base de datos de pruebas.

---

## Variables de entorno

| Variable | Requerida | Descripción | Ejemplo |
|---|---|---|---|
| `NODE_ENV` | Opcional | Entorno de ejecución. Activa SSL en producción. | `development` |
| `PORT` | Opcional | Puerto interno del servidor Express. | `3001` |
| `HOST_DB_PORT` | Opcional | Puerto del host donde se expone PostgreSQL. | `5432` |
| `HOST_BACKEND_PORT` | Opcional | Puerto del host donde se expone el backend. | `3001` |
| `POSTGRES_DB` | ✅ Requerida | Nombre de la base de datos. | `aulamatch` |
| `POSTGRES_USER` | ✅ Requerida | Usuario de PostgreSQL. | `aulamatch_user` |
| `POSTGRES_PASSWORD` | ✅ Requerida | Contraseña de PostgreSQL. | `un_password_seguro` |
| `DATABASE_URL` | ✅ Requerida* | String de conexión completo. | `postgresql://user:pass@db:5432/aulamatch` |
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` | Opcional* | Variables individuales de conexión (fallback si no hay `DATABASE_URL`). | — |
| `JWT_SECRET` | ✅ Requerida | Clave secreta para firmar los JWT. Mínimo 32 caracteres. | `una_clave_larga_y_aleatoria` |
| `JWT_EXPIRES_IN` | Opcional | Vigencia del token JWT. | `8h` |
| `ALLOWED_ORIGINS` | Opcional | Orígenes permitidos por CORS (separados por coma). | `http://localhost:3000` |
| `VITE_API_URL` | ✅ Req (Front) | URL de la API del backend para el frontend React. | `https://aulamatch-backend.onrender.com` |

> \* Se requiere `DATABASE_URL` **o** el conjunto completo de variables individuales (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`). El sistema valida esto al arrancar y lanza un error descriptivo si falta alguna variable crítica.

---

## Endpoints principales

> La especificación completa (parámetros, cuerpos de request, respuestas y ejemplos) está en [`docs/diseño-original.md`](docs/diseño-original.md).
> **C** = `COORDINADOR` · **A** = `ADMINISTRATIVO`

### Auth

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| `GET` | `/api/health` | Público | Estado del servidor y conexión a DB |
| `POST` | `/api/auth/login` | Público | Login con email + contraseña → JWT |
| `POST` | `/api/auth/logout` | Auth | Cierre de sesión (client-side stateless) |
| `GET` | `/api/auth/me` | Auth | Datos del usuario del token activo |

### Aulas

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| `GET` | `/api/edificios` | C, A | Lista todos los edificios |
| `POST` | `/api/edificios` | C | Crear un edificio |
| `GET` | `/api/edificios/:id/aulas` | C, A | Aulas de un edificio |
| `POST` | `/api/aulas` | C | Crear un aula |
| `PATCH` | `/api/aulas/:id` | C | Actualizar datos de un aula |

### Académico

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| `GET` | `/api/unidades-academicas` | C, A | Lista todas las UAs |
| `GET` | `/api/carreras` | C, A | Lista carreras (filtro opcional por UA) |
| `GET` | `/api/materias` | C, A | Lista materias con sus carreras (relación M:N) |
| `GET` | `/api/docentes` | C, A | Lista docentes |
| `GET` | `/api/comisiones` | C, A | Lista comisiones con filtros múltiples |
| `POST` | `/api/comisiones` | C, A | Registrar una comisión |

### Asignaciones

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| `GET` | `/api/asignaciones` | C, A | Lista asignaciones con filtros |
| `POST` | `/api/asignaciones/automatica` | C, A | Ejecutar motor de asignación automática |
| `POST` | `/api/asignaciones` | C, A | Crear asignación manual |
| `GET` | `/api/asignaciones/:id/aulas-compatibles` | C, A | Aulas disponibles para una comisión |
| `PATCH` | `/api/asignaciones/:id` | C, A | Reasignar aula o cambiar estado |
| `DELETE` | `/api/asignaciones/:id` | C | Eliminar una asignación |

### Conflictos

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| `GET` | `/api/conflictos` | C, A | Lista asignaciones en conflicto con notificaciones |
| `GET` | `/api/conflictos/metricas` | C, A | Contadores del panel (conflictos activos, pendientes, etc.) |
| `POST` | `/api/conflictos/detectar` | C | Detección masiva manual sobre el período activo |

### Reportes

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| `GET` | `/api/reportes/asignaciones` | C, A | Estado de asignaciones del período (`?formato=json` o `?formato=csv`) |
| `GET` | `/api/reportes/disponibilidad` | C | Ocupación de aulas agrupada por edificio (filtro por día opcional) |

---

## Documentación adicional

| Archivo | Contenido |
|---|---|
| [`docs/diseño-original.md`](docs/diseño-original.md) | Modelo de dominio completo: diagrama de clases, esquema de tablas, especificación de endpoints y casos de uso. |
| [`docs/decisiones-diseno.md`](docs/decisiones-diseno.md) | Desviaciones justificadas respecto al modelo original (permisos de roles, representación visual de estados, mecanismo de notificaciones). |
| [`docs/guia-desarrollo-local.md`](docs/guia-desarrollo-local.md) | Guía extendida de setup local con casos de borde (puertos ocupados, troubleshooting). |
| [`docs/guia-deploy-render.md`](docs/guia-deploy-render.md) | Instrucciones paso a paso para desplegar en Render (PostgreSQL + Web Service). |
| [`docs/guia-frontend.md`](docs/guia-frontend.md) | Arquitectura del frontend React: pantallas implementadas, paleta de colores, estructura del proyecto. |
| [`CHANGELOG.md`](CHANGELOG.md) | Historial completo de versiones con decisiones técnicas registradas por iteración. |
| [`entrega/`](entrega/) | Carpeta con los documentos académicos finales en formato PDF. |

---

## Estado del proyecto

| Componente | Estado |
|---|---|
| Scaffolding y entorno Docker | ✅ Completo |
| Módulo `auth` (JWT, roles) | ✅ Completo |
| Módulo `aulas` (CRUD edificios y aulas) | ✅ Completo |
| Módulo `académico` (UAs, carreras, materias, docentes, comisiones) | ✅ Completo |
| Módulo `asignaciones` (motor automático + manual) | ✅ Completo |
| Módulo `conflictos` (detección, notificaciones, resolución) | ✅ Completo |
| Módulo `reportes` (JSON + CSV, disponibilidad) | ✅ Completo |
| Suite de tests de integración (23 tests) | ✅ Completo |
| Infraestructura de deploy (Dockerfile prod, script de migración) | ✅ Lista |
| **Deploy efectivo en Render** (Backend y DB) | ✅ Completo |
| **Deploy del Frontend** conectado a la API de producción | ✅ Completo |

---

## Autor y contexto académico

**Joel Mastroiaco**
Materia: *Herramientas de IA aplicadas al Diseño*
Institución: Universidad Nacional de San Martín (UNSAM)
Año: 2026

El proyecto fue desarrollado de forma incremental con asistencia de IA documentada. Cada decisión técnica relevante y desviación del diseño original está registrada en [`docs/decisiones-diseno.md`](docs/decisiones-diseno.md) y en el [`CHANGELOG.md`](CHANGELOG.md), respetando el principio de trazabilidad exigido por la materia.
