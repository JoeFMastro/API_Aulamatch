# ─────────────────────────────────────────────────────────────
# AulaMatch — Backend Dockerfile
# Imagen base: Node.js LTS (alpine para imagen liviana)
# ─────────────────────────────────────────────────────────────

# ── Etapa de producción ───────────────────────────────────────
FROM node:22-alpine AS base

# Metadatos
LABEL maintainer="Joel Mastroiaco"
LABEL description="AulaMatch API — Node.js + Express + PostgreSQL"

# Directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiar manifiestos de dependencias primero (aprovecha cache de capas)
COPY package.json package-lock.json ./

# Instalar solo dependencias de producción
RUN npm ci --omit=dev

# Copiar el código fuente
COPY . .

# Puerto expuesto (debe coincidir con PORT en .env)
EXPOSE 3001

# Comando de arranque
CMD ["node", "server.js"]

# ── Etapa de desarrollo (target: dev) ────────────────────────
FROM base AS dev

# Reinstalar incluyendo devDependencies (nodemon)
RUN npm ci

CMD ["npm", "run", "dev"]
