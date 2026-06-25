# Guía de Inicio Rápido — Entorno de Desarrollo Local

Esta guía describe paso a paso cómo configurar, levantar, verificar y apagar el entorno de desarrollo local para el backend de **AulaMatch**.

---

## 1. Requisitos Previos

Antes de comenzar, asegúrate de tener instalado en tu sistema local:
- **Docker** y **Docker Compose** (preferiblemente Docker Compose V2).
- Si quieres probar localmente de manera nativa sin Docker (opcional): **Node.js** (v18+) y **PostgreSQL 16**.

---

## 2. Paso 1: Configurar las Variables de Entorno

El proyecto cuenta con una plantilla de variables de entorno llamada `.env.example` en la raíz del repositorio. Para configurarla:

1. Duplica el archivo y renombralo a `.env`:
   ```bash
   cp .env.example .env
   ```
2. Abre el archivo `.env` en tu editor de código y completa/modifica los valores si es necesario. Por defecto, ya viene configurado para funcionar de forma integrada con el contenedor Docker de PostgreSQL.

---

## 3. Paso 2: Permisos de Docker en Linux (Caso de Borde común)

En sistemas basados en Linux, es común ver un error de permisos al intentar interactuar con el socket del daemon de Docker:
```text
permission denied while trying to connect to the Docker daemon socket
```

### Solución inmediata:
Puedes anteponer `sudo` a tus comandos de Docker Compose para ejecutarlos con los permisos necesarios.

### Solución permanente (Recomendada):
Agrega tu usuario al grupo `docker` para no necesitar `sudo` nunca más:
```bash
sudo usermod -aG docker $USER
```
*Nota: Después de ejecutar esto, debes cerrar tu sesión de usuario en el sistema operativo y volver a iniciarla para que se apliquen los cambios de grupo.*

---

## 4. Paso 3: Levantar el Entorno de Desarrollo

> [!IMPORTANT]
> **Todos los comandos `docker compose` deben ejecutarse desde la raíz del repositorio** (donde está el archivo `.env`).
> Ejecutarlos desde un subdirectorio como `backend/` provocará un error de ruta al no encontrar `deploy/docker-compose.yml`.

Para construir y levantar los contenedores de la base de datos y el backend con **hot-reload** (recarga en caliente ante cambios de código mediante `nodemon`):

```bash
docker compose -f deploy/docker-compose.yml up --build
```

### ¿Qué hace este comando internamente?
1. **Carga del archivo `.env`**: El `docker-compose.yml` declara `env_file: - ../.env` en cada servicio, por lo que las variables se cargan automáticamente desde la raíz — no es necesario pasar `--env-file` manualmente.
2. **Construcción del Backend**: Compila la imagen local del backend utilizando la etapa `dev` del `Dockerfile`.
3. **Inicio de base de datos**: Levanta PostgreSQL, aplica el script de inicialización (`deploy/init-db/01_schema.sql`) y realiza pruebas de salud.
4. **Sincronización del Backend**: Espera que la base de datos esté saludable (`service_healthy`) y arranca el backend.

---

## 5. Paso 4: Manejo de Conflictos de Puertos (Caso de Borde)

Si los puertos por defecto (`5432` para PostgreSQL o `3001` para el Backend) ya están siendo ocupados por otros servicios locales en tu máquina, verás un error similar a:
```text
Bind for 0.0.0.0:3001 failed: port is already allocated
```

### Solución:
No modifiques el archivo `docker-compose.yml`. Simplemente abre tu archivo `.env` en la raíz y cambia los puertos del host:
```ini
HOST_DB_PORT=5433         # Cambia el puerto de la base de datos en tu máquina
HOST_BACKEND_PORT=3002    # Cambia el puerto de la API en tu máquina
```
Al reiniciar los contenedores, Docker redirigirá el tráfico automáticamente.

---

## 6. Paso 5: Verificar el Funcionamiento (Health Check)

Con los contenedores activos, abre una nueva terminal y realiza una petición HTTP al endpoint de estado público para verificar que todo esté correctamente conectado:

```bash
curl -i http://localhost:3001/api/health
```

### Respuestas esperadas:

* **Conexión Exitosa (HTTP 200 OK)**:
  ```json
  {"status":"ok","db":"connected"}
  ```
  *Esto significa que la API Express está activa y se conecta correctamente a PostgreSQL.*

* **Error de Base de Datos (HTTP 503 Service Unavailable)**:
  ```json
  {"status":"error","db":"disconnected"}
  ```
  *Esto significa que la API Express está activa, pero no logra comunicarse con la base de datos.*

---

## 7. Paso 6: Detener y Limpiar el Entorno

### Detener los servicios:
Si estás visualizando los logs en tiempo real, puedes detener la ejecución presionando:
**`Ctrl + C`**

### Apagar y limpiar recursos:
Para remover los contenedores y liberar las redes virtuales creadas sin perder tus datos de base de datos (los datos se conservan en un volumen persistente llamado `deploy_postgres_data`):

```bash
docker compose -f deploy/docker-compose.yml down
```

> [!CAUTION]
> Este comando también debe ejecutarse **desde la raíz del repositorio**. Si lo corrés desde `backend/` u otro subdirectorio, Docker Compose no encontrará el archivo `deploy/docker-compose.yml` y fallará con un error de ruta.
