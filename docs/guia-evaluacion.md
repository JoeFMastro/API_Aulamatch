# 🎓 Guía de Evaluación: API AulaMatch

¡Bienvenido/a! Esta guía está diseñada para que puedas probar e interactuar con la API REST de AulaMatch de forma completamente visual, sin necesidad de instalar nada ni tocar código, gracias a la interfaz interactiva de Swagger UI.

---

## 📍 1. Acceso al Sistema

El sistema se encuentra desplegado en un servidor gratuito en la nube (Render) con una base de datos PostgreSQL. 

Para acceder a la consola interactiva, ingresá a:
👉 **URL:** [https://aulamatch-backend.onrender.com/api-docs](https://aulamatch-backend.onrender.com/api-docs)

> **Nota importante:**
> Dado que es un servidor gratuito, si nadie lo usó en los últimos 15 minutos, **la primera petición puede tardar unos 50 segundos en responder** mientras el servidor "se despierta". Las siguientes peticiones serán instantáneas.

---

## 🔐 2. Autenticación (Login)

La API está protegida. Necesitás un "Token" para demostrar que sos el Coordinador.

1. En la página de Swagger, bajá hasta el endpoint de color verde **`POST /api/auth/login`** y hacé clic en él.
2. Hacé clic en el botón blanco que dice **"Try it out"** (a la derecha).
3. En la caja de texto, asegurate de que las credenciales sean estas:
   ```json
   {
     "email": "coordinador@aulamatch.edu",
     "password": "Coord1234!",
     "rol": "COORDINADOR"
   }
   ```
4. Apretá el botón azul **"Execute"**.
5. En la sección "Server response", vas a ver que te devuelve un código `200` y un texto largo llamado `"token"`.
6. **Copiá ese texto largo** (IMPORTANTE: copialo sin las comillas `"` del principio y del final).
7. Subí al inicio de la página, hacé clic en el botón **"Authorize"** (el candadito verde), pegá el token ahí y hacé clic en Authorize y luego en Close.

¡Listo! Ya tenés permisos totales sobre el sistema.

---

## 🚀 3. Flujos para probar (Playground)

El sistema ya viene precargado con datos de prueba reales (Unidades Académicas, Edificios, Carreras, Materias, y Comisiones).

### A. Ver el estado actual (Reportes)
- Andá a **`GET /api/reportes/asignaciones`**, tocá "Try it out". Poné año `2025` y cuatrimestre `1`. En `formato` podés escribir `csv` para descargar el Excel, o dejarlo vacío para verlo en pantalla.
- Andá a **`GET /api/reportes/disponibilidad`**, ingresá los mismos datos. Te va a devolver el porcentaje de ocupación exacto de cada aula (ej: Aula CI-A02 con 14.29% de ocupación) y los huecos libres.

### B. Comprobar la detección automática de conflictos
Al cargar la base, inyectamos errores intencionales para que la API los detecte sola.
- Andá a **`GET /api/conflictos`**, tocá "Try it out" y "Execute".
- Vas a ver que el sistema detectó 2 problemas graves:
  1. Un `CUPO_EXCEDIDO` (se anotaron 60 alumnos en un aula de capacidad 50).
  2. Una `SUPERPOSICION_HORARIA` (dos materias están chocando en el Aula "AN-201" un Lunes a las 08:00).

### C. Jugar con el Motor Automático
El motor de AulaMatch es **idempotente** (si ya asignó aulas y está todo perfecto, no hace nada para no duplicar). Para verlo trabajar en vivo, hagamos esto:

1. **"Romper" una asignación:** 
   - Andá a **`DELETE /api/asignaciones/{id}`**. 
   - Tocá "Try it out", poné el número `9` o `10` en el ID y tocá "Execute". Con esto borraste la reserva del aula, dejando a la materia "huérfana".
2. **Correr el Motor:**
   - Andá a **`POST /api/asignaciones/automatica`**.
   - Tocá "Try it out", poné `"anio": 2025` y `"cuatrimestre": 1`.
   - Apretá "Execute".
   - **¡Magia!** La API te va a devolver `"asignadas": 1` y vas a ver el JSON de cómo el motor volvió a ubicar inteligentemente esa comisión en el laboratorio o aula que le correspondía, calculando los horarios para que no choque con nadie.

---

## 🆘 4. Botón de Pánico (Cómo Deshacer los Errores)

Si durante la evaluación jugás mucho, borrás muchas asignaciones, generás conflictos mezclados y sentís que la base de datos quedó en un estado irrecuperable o confuso, **¡no hay problema!**

El sistema cuenta con un mecanismo para formatear la base de datos y devolverla al estado inicial del "Seed" en 3 segundos.

### ¿Cómo restaurar la base a fábrica?
Dado que este comando es peligroso (borra la base), no se expone en un botón web. Si necesitás reiniciar todo:
1. Comunicate con el administrador (Joel) para que corra el comando de reseteo desde la consola segura.
2. **Si sos evaluador técnico y tenés Node.js instalado** junto con el código fuente local de GitHub, podés blanquear todo ejecutando este único comando en tu terminal (en la carpeta backend):

```bash
NODE_ENV=production DATABASE_URL='postgresql://aulamatch_user:CambiarPorContrase%C3%B1aSegura123!@dpg-cptttbm1hbls73bs49l0-a.oregon-postgres.render.com/aulamatch_xnsb' SEED_DEMO=true MIGRATE_FORCE=true npm run migrate
```
*(Nota: Estarás afectando directamente la base de datos productiva en la nube).*

Esto borra absolutamente todas las modificaciones, limpia el historial y vuelve a insertar los datos iniciales con la configuración exacta para la demo. 

¡Que disfrutes probando AulaMatch!
