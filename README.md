# AulaMatch API

API REST para la gestión y asignación de espacios académicos (aulas, laboratorios y aulas virtuales) en entornos universitarios.

## Tecnologías

- **Runtime**: Node.js
- **Framework**: Express.js
- **Base de datos**: PostgreSQL
- **Infraestructura**: Docker / Docker Compose

## Estado

🚧 En desarrollo — setup inicial del repositorio.

## Estructura del proyecto

```
API_Aulamatch/
├── backend/          # Código fuente de la API REST
│   ├── src/
│   │   ├── config/   # Configuración (DB, env, etc.)
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   └── utils/
│   ├── tests/
│   └── package.json
├── deploy/           # Archivos Docker y configuración de despliegue
│   ├── docker-compose.yml
│   └── nginx/
└── README.md
```

## Documentación de diseño

El modelo de clases, esquema SQL y endpoints están definidos en `Actividad4_Joel_Mastroiaco_Completo.pdf`.
