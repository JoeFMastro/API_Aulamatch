# Guía de Despliegue — AulaMatch en Render

> **Versión:** 1.0 — Junio 2026  
> **Audiencia:** Desarrollador del proyecto (sin experiencia previa en Render)  
> **Tiempo estimado:** 20-30 minutos

Esta guía explica paso a paso cómo desplegar AulaMatch en Render usando dos servicios: una **Render Postgres database** (administrada) y un **Web Service** (backend Node.js con Dockerfile).

---

## Arquitectura en Render

```
┌──────────────────────────────────────────────────────────────┐
│  Render                                                      │
│                                                              │
│  ┌─────────────────────┐       ┌──────────────────────────┐  │
│  │   Web Service        │──────▶│  Render Postgres DB      │  │
│  │   (Backend Node.js)  │       │  (administrada por       │  │
│  │   Dockerfile: prod   │       │   Render)                │  │
│  └─────────────────────┘       └──────────────────────────┘  │
│          ▲                                                   │
│          │ auto-deploy                                       │
│          │ desde rama en GitHub                              │
└──────────┼───────────────────────────────────────────────────┘
           │
    ┌──────────────┐
    │  GitHub repo  │
    │  main branch  │
    └──────────────┘
```

> **Importante:** Render **NO usa** `docker-compose.yml`. Cada servicio se configura independientemente en el dashboard. El `docker-compose.yml` queda exclusivamente para el entorno de desarrollo local.

---

## Variables de entorno a configurar en Render

Estas variables deben cargarse manualmente en el dashboard del Web Service en Render (**Settings → Environment**):

| Variable | Valor de ejemplo | De dónde sacarlo |
|---|---|---|
| `DATABASE_URL` | `postgresql://aulamatch_user:abc123@dpg-xxxxx-a.oregon-postgres.render.com/aulamatch` | Render → tu Postgres DB → **Internal Database URL** (ver Paso 2) |
| `JWT_SECRET` | `s3cr3t0_muy_largo_de_al_menos_32_caracteres_aqui` | Generarlo manualmente (ver más abajo) |
| `JWT_EXPIRES_IN` | `24h` | Libre elección (ej: `1h`, `7d`, `24h`) |
| `ALLOWED_ORIGINS` | `https://aulamatch-frontend.onrender.com` | Origen de confianza del frontend (opcional, lista separada por comas) |
| `NODE_ENV` | `production` | Hardcodear este valor |
| `PORT` | `3001` | Render lo sobreescribe con su propio valor, pero declararlo evita confusiones |

> **No necesitás definir** `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` en Render — la variable `DATABASE_URL` sola ya satisface la validación de `config/env.js`.

### Generar un JWT_SECRET seguro

Correr en la terminal local:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Copiar el output completo (96 caracteres hex) y pegarlo como valor de `JWT_SECRET` en Render.

---

## Paso a paso

### Paso 1 — Crear la Render Postgres database

1. Ir a [https://dashboard.render.com](https://dashboard.render.com) → **New +** → **PostgreSQL**.
2. Completar los campos:
   - **Name:** `aulamatch-db` (o cualquier nombre descriptivo)
   - **Database:** `aulamatch`
   - **User:** `aulamatch_user` (Render puede generarlo automáticamente)
   - **Region:** elegir la más cercana (ej: `Oregon (US West)`)
   - **Plan:** `Free` (expira a los 30 días — ver nota al final)
3. Hacer clic en **Create Database** y esperar a que el estado cambie a **Available** (puede tardar 1-2 minutos).

---

### Paso 2 — Copiar la Internal Database URL

1. En el dashboard de la base recién creada, ir a la sección **Connections**.
2. Copiar el valor de **Internal Database URL**. Tiene el formato:

   ```
   postgresql://<user>:<password>@<host>:5432/<dbname>
   ```

   > Usar la **Internal URL** (no la External) para la variable `DATABASE_URL` del Web Service, porque la comunicación interna dentro de Render es más rápida y no tiene costo de transferencia.

3. Guardar este valor en un lugar seguro (lo pegarás en el siguiente paso).

---

### Paso 3 — Crear el Web Service

1. **New +** → **Web Service**.
2. Conectar el repositorio de GitHub:
   - Seleccionar `JoeFMastro/API_Aulamatch` (o el nombre de tu repo).
   - **Branch:** `main` (o la rama que quieras desplegar).
3. Configurar el servicio:
   - **Name:** `aulamatch-backend`
   - **Region:** la misma que elegiste para la base de datos (importante para la latencia)
   - **Runtime:** `Docker`
   - **Dockerfile Path:** `backend/Dockerfile`
   - **Docker Build Context:** `backend` (directorio del backend)
   - **Docker Build Target:** `prod`
   - **Docker Command:** `node server.js` (para forzar el stage correcto en producción)
4. En **Advanced** (o al editar después):
   - **Health Check Path:** `/api/health`
   - Desactivar cualquier opción de "auto-deploy from docker-compose" si aparece.

---

### Paso 4 — Configurar las variables de entorno

1. En la configuración del Web Service, ir a **Environment**.
2. Agregar las variables una por una según la tabla del comienzo de esta guía:

   ```
    DATABASE_URL    = <Internal Database URL del Paso 2>
    JWT_SECRET      = <cadena generada con el comando de la sección anterior>
    JWT_EXPIRES_IN  = 24h
    ALLOWED_ORIGINS = https://aulamatch-frontend.onrender.com
    NODE_ENV        = production
    PORT            = 3001
   ```

3. Guardar los cambios.

---

### Paso 5 — Primer deploy

1. Hacer clic en **Deploy** (o esperar el auto-deploy si ya estaba configurado).
2. Observar los logs del build en tiempo real. El proceso sigue estos pasos:
   - Render clona el repo.
   - Construye la imagen Docker usando el target `prod`.
   - Levanta el contenedor ejecutando `node server.js`.
3. El build tarda aproximadamente **2-5 minutos** la primera vez.
4. Cuando el estado cambia a **Live**, el servicio está corriendo.

---

### Paso 6 — Aplicar las migraciones SQL (obligatorio, una sola vez)

La base de datos de Render comienza **vacía**. Las migraciones deben aplicarse manualmente una sola vez.

> [!WARNING]
> El **Shell de Render** (pestaña Shell del Web Service) **solo está disponible en planes de pago**.
> En el plan Free, la pestaña Shell aparece pero no permite abrir una sesión interactiva.
> Usá siempre la **Opción B** (desde tu máquina local) si estás en el plan Free.

#### Opción A — Desde el Shell de Render (requiere plan de pago)

1. En el dashboard del Web Service, ir a la pestaña **Shell**.
2. Esperar a que se abra la terminal del contenedor.
3. Ejecutar:

   ```bash
   npm run migrate
   ```

4. El script aplica `01_schema.sql`, `02_usuarios.sql` y `03_notificaciones.sql` en orden.
5. Verificar que la salida termina con:

   ```
   [migrate] ✅ Todas las migraciones aplicadas correctamente.
   ```

#### Opción B — Desde tu máquina local usando la External URL (recomendada en plan Free)

1. En Render → Postgres DB → **Connections** → copiar la **External Database URL**.
2. En tu terminal local (dentro de la carpeta `backend/`):

   ```bash
   NODE_ENV=production DATABASE_URL='<External Database URL>' npm run migrate
   ```

   > [!IMPORTANT]
   > Usar **comillas simples** (`'`) en la URL es obligatorio en Linux/macOS para evitar que
   > la terminal interprete el signo `!` de la contraseña como un comando de historial de shell.
   > `NODE_ENV=production` es necesario para activar el SSL que Render requiere.

3. Verificar la salida:
   ```
   [migrate] ✅ Todas las migraciones aplicadas correctamente.
   ```

---

### Paso 7 — Verificar que el deploy funcionó

Hacer una petición al endpoint de salud:

```bash
curl https://aulamatch-backend.onrender.com/api/health
```

Respuesta esperada:

```json
{
  "status": "ok",
  "db": "connected"
}
```

Si la respuesta es un error 503 o similar, revisar los logs del Web Service en Render para ver si hay variables de entorno faltantes o un problema de conexión a la base.

---

### Paso 8 — Aplicar el seed de demostración (opcional pero recomendado para evaluación)

El proyecto incluye un seed de datos realistas (FRBA, 8 comisiones, 12 aulas, 2 conflictos
pre-cargados) que permite demostrar todas las funcionalidades al evaluador.

Desde tu máquina local (con la External URL):

```bash
NODE_ENV=production DATABASE_URL='<External Database URL>' SEED_DEMO=true npm run migrate
```

Alternativamente, si el servidor ya está corriendo, se puede usar el endpoint de reset
directamente desde la interfaz Swagger UI:

1. Abrir `https://aulamatch-backend.onrender.com/api-docs`
2. Ejecutar `POST /health/reset-db` — no requiere autenticación.
3. Respuesta esperada: `{ "message": "Base de datos formateada y poblada con datos de demostración exitosamente." }`

> [!NOTE]
> `POST /health/reset-db` es un endpoint de uso exclusivo para demostración y evaluación.
> Ejecuta `DROP TABLE ... CASCADE` sobre todas las tablas. **No usar en productión con datos reales.**

## Notas importantes sobre el plan Free de Render

### ⏱️ Cold Start (arranque en frío)

El plan Free de Render **suspende el Web Service** después de **15 minutos de inactividad**. Cuando llega una nueva petición tras esa suspensión, el servidor tarda **30-60 segundos en volver a estar disponible** (cold start). La primera petición después de un período inactivo puede dar timeout en el cliente si este tiene un timeout corto.

**Mitigación:** Usar un servicio de "ping" externo (ej. UptimeRobot con un check cada 10 minutos) para mantener el servicio activo. O actualizar al plan Starter de Render.

### 📅 Expiración de la base de datos gratuita

Las **Render Postgres databases del plan Free expiran a los 30 días** y son eliminadas automáticamente. Render envía avisos por email antes de la eliminación.

**Opciones antes de los 30 días:**
1. Hacer un dump de la base: `pg_dump <External Database URL> > backup.sql`
2. Actualizar al plan Starter de Render (de pago, sin expiración).
3. Crear una nueva base gratuita y re-aplicar las migraciones.

---

## Re-despliegue tras cambios en el código

Render detecta automáticamente los pushes a la rama configurada y hace un nuevo deploy. No es necesario hacer nada manual salvo que:
- Se agreguen nuevas migraciones SQL → correr `npm run migrate` de nuevo (solo los archivos nuevos; los existentes serán detectados por las tablas ya presentes y el script abortará si se intenta re-ejecutar sin `MIGRATE_FORCE=true`).
- Se agreguen nuevas variables de entorno → configurarlas en el dashboard antes del deploy.

---

## Resolución de problemas comunes

| Síntoma | Causa probable | Solución |
|---|---|---|
| `[config/env] Variable de entorno requerida no definida: JWT_SECRET` | Falta la variable en el dashboard | Agregar `JWT_SECRET` en Environment del Web Service |
| `[config/env] Variable de entorno de base de datos faltante` | `DATABASE_URL` no definida | Agregar `DATABASE_URL` copiada del panel de la Postgres DB |
| Error 502 / timeout en la primera petición | Cold start del plan Free | Esperar 30-60 segundos y reintentar |
| `ECONNREFUSED` en los logs del backend | Servicio levantado antes de que la DB estuviera lista | Render reintenta automáticamente; si persiste, verificar que `DATABASE_URL` apunta a la Internal URL correcta |
| Build falla con `no such file or directory: Dockerfile` | Dockerfile Path incorrecto en Render | Verificar que el path sea `backend/Dockerfile` y el Build Context sea `backend` |

---

## Lo que el agente NO hará (pasos manuales a cargo del usuario)

> El agente de IA preparó el código y esta guía, pero **no tiene acceso a la cuenta de Render**. Las siguientes acciones deben realizarse manualmente:
>
> - [ ] Crear la Render Postgres database (Paso 1)
> - [ ] Crear el Web Service (Paso 3)
> - [ ] Configurar las variables de entorno en el dashboard (Paso 4)
> - [ ] Correr `npm run migrate` desde el Shell de Render (Paso 6)
> - [ ] Verificar el endpoint `/api/health` (Paso 7)
