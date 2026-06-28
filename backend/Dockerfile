# ─────────────────────────────────────────────────────────────
# AulaMatch — Backend Dockerfile
# Imagen base: Node.js LTS (alpine para imagen liviana)
#
# Targets disponibles:
#   prod  → imagen de producción (sin devDependencies, node server.js)
#            Usar en Render: Docker Build Target = prod
#   dev   → imagen de desarrollo (nodemon, devDeps, bind-mount del código)
#            Usado por docker-compose.yml local (target: dev)
# ─────────────────────────────────────────────────────────────

# ── Etapa de producción (target: prod) ───────────────────────
FROM node:22-alpine AS prod

# Metadatos
LABEL maintainer="Joel Mastroiaco"
LABEL description="AulaMatch API — Node.js + Express + PostgreSQL"

# Directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiar manifiestos de dependencias primero (aprovecha cache de capas)
COPY package.json package-lock.json ./

# Instalar solo dependencias de producción (sin devDependencies)
RUN npm ci --omit=dev

# Copiar el código fuente
COPY . .

# Puerto expuesto (debe coincidir con PORT en .env o con el asignado por Render)
EXPOSE 3001

# Comando de arranque de producción (sin nodemon)
CMD ["node", "server.js"]

# ── Etapa de desarrollo (target: dev) ────────────────────────
FROM prod AS dev

# Reinstalar incluyendo devDependencies (nodemon)
RUN npm ci

CMD ["npm", "run", "dev"]
