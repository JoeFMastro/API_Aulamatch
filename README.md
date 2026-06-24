# AulaMatch API

API REST para la gestión y asignación de espacios académicos (aulas, laboratorios y aulas virtuales) en entornos universitarios.

## Tecnologías

- **Runtime**: Node.js (v22+)
- **Framework**: Express.js
- **Base de datos**: PostgreSQL (v16)
- **Infraestructura**: Docker / Docker Compose

## Estado

🚧 En desarrollo — Scaffolding inicial y configuración del entorno de desarrollo local.

## Estructura del proyecto

```
API_Aulamatch/
├── backend/          # Código fuente de la API REST
│   ├── src/
│   │   ├── config/   # Configuración (DB, env, etc.)
│   │   ├── controllers/
│   │   ├── middlewares/ # Middlewares globales y de ruta (autenticación, errores, etc.)
│   │   ├── models/
│   │   ├── modules/  # Módulos del monolito modular (auth, aulas, asignaciones, etc.)
│   │   ├── routes/
│   │   └── utils/
│   ├── tests/
│   ├── Dockerfile    # Dockerfile multi-stage para desarrollo/producción
│   └── package.json
├── deploy/           # Archivos Docker y configuración de despliegue
│   ├── docker-compose.yml # Composición de servicios locales (db + backend)
│   ├── init-db/      # Scripts SQL de inicialización de la base de datos
│   └── nginx/        # Configuración del proxy reverso (pendiente producción)
├── README.md
└── .env.example      # Plantilla de variables de entorno
```

## Guía de Desarrollo Local

El entorno local está diseñado para ser reproducible y levantarse con un solo comando mediante Docker Compose.

### Requisitos previos

- Docker instalado.
- Docker Compose instalado.

### 1. Configuración de Variables de Entorno

Antes de iniciar los servicios, clona el archivo de configuración `.env` desde la plantilla `.env.example` en la raíz del proyecto:

```bash
cp .env.example .env
```

Edita el archivo `.env` según tus necesidades locales. Asegúrate de configurar contraseñas seguras para la base de datos y un secreto para JWT.

> [!TIP]
> **Casos de borde (Puertos ocupados)**:
> Si los puertos `5432` o `3001` ya están siendo utilizados en tu máquina por otras aplicaciones (como una base de datos local), puedes redefinir los puertos expuestos editando las siguientes variables en tu archivo `.env`:
> ```ini
> HOST_DB_PORT=5433
> HOST_BACKEND_PORT=3002
> ```
> De esta forma, Docker redireccionará los puertos automáticamente sin interferir con tus servicios locales.

### 2. Levantar el Entorno Local

Para construir e iniciar los servicios de la base de datos (`db`) y el backend (`backend` con nodemon y hot-reload):

```bash
docker compose -f deploy/docker-compose.yml up --build
```

El servicio `backend` espera a que el servicio `db` pase el control de salud (healthcheck) antes de arrancar, garantizando una conexión segura desde el principio.

### 3. Verificar el Funcionamiento (Health Check)

Puedes validar que el servidor está corriendo y se ha conectado exitosamente a la base de datos realizando una consulta HTTP al endpoint de salud pública:

```bash
curl -i http://localhost:3001/api/health
```

**Respuesta exitosa (HTTP 200)**:
```json
{"status":"ok","db":"connected"}
```

Si la conexión con la base de datos se pierde o no está configurada correctamente, el endpoint responderá con código `503 Service Unavailable`:
```json
{"status":"error","db":"disconnected"}
```

---

## Documentación de diseño

El modelo de clases, esquema SQL y endpoints están definidos en `Actividad4_Joel_Mastroiaco_Completo.pdf` y resumidos en [docs/diseño-original.md](file:///home/joel/Documentos/cursos_UTN/curso%20de%20IA/proyectos/API_Aulamatch/docs/dise%C3%B1o-original.md).
