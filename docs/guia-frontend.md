# Guía del Frontend — AulaMatch

> **Origen visual**: El diseño de este frontend está basado íntegramente en
> [`docs/Actividad4_Joel_Mastroiaco_Completo.pdf`](Actividad4_Joel_Mastroiaco_Completo.pdf) —
> el entregable académico de la Actividad N°4 que contiene los wireframes de Figma AI,
> el prompt de generación visual de Midjourney y los diagramas UML.

---

## Arquitectura del Frontend

El frontend es una **SPA (Single Page Application)** construida con:

| Tecnología | Versión | Propósito |
|---|---|---|
| React | 19 | UI declarativa por componentes |
| Vite | 6 | Dev server + build tool |
| React Router v7 | 7 | Navegación entre pantallas |
| fetch nativo | — | Llamadas a la API REST |

El frontend **consume la API REST** ya deployada en producción sin hardcodear URLs.
La URL del backend se configura via variable de entorno `VITE_API_URL`.

---

## Levantar el Frontend Localmente

### 1. Requisitos

- Node.js v18 o superior
- npm v9 o superior

### 2. Instalación

```bash
# Desde la raíz del repositorio
cd frontend
npm install
```

### 3. Configurar la Variable de Entorno

El proyecto incluye un `.env.example`. Copiarlo y editarlo si es necesario:

```bash
cp .env.example .env
```

Contenido por defecto (apunta a producción en Render):

```ini
VITE_API_URL=https://aulamatch-backend.onrender.com
```

Para apuntar al backend local (Docker Compose):

```ini
VITE_API_URL=http://localhost:3001
```

> [!NOTE]
> Si usás el backend local, asegurate de que Docker Compose esté corriendo:
> ```bash
> # Desde la raíz del repo
> docker compose -f deploy/docker-compose.yml up --build
> ```

### 4. Iniciar el Servidor de Desarrollo

```bash
# Desde la carpeta frontend/
npm run dev
```

La app queda disponible en `http://localhost:5173`.

---

## Pantallas Implementadas

| Pantalla | Ruta | Fuente en PDF | Endpoints consumidos |
|---|---|---|---|
| **Login** | `/login` | Figura 1 (Figma AI) | `POST /api/auth/login` |
| **Asignaciones** | `/asignaciones` | Figura 2 (Figma AI) | `GET /api/asignaciones`, `POST /api/asignaciones/automatica`, `PATCH /api/asignaciones/:id`, `DELETE /api/asignaciones/:id` |
| **Conflictos** | `/conflictos` | Figura 3 (Figma AI) | `GET /api/conflictos`, `GET /api/conflictos/metricas`, `PATCH /api/asignaciones/:id` |
| **Reportes** | `/reportes` | *Extensión del diseño* | `GET /api/reportes/asignaciones`, `GET /api/reportes/disponibilidad` |
| **Perfil** | `/perfil` | Figuras 4a y 4b (Figma AI) | `GET /api/auth/me` |

> [!NOTE]
> La pantalla de **Reportes** no tiene wireframe propio en el PDF pero se implementó
> usando la misma paleta de colores, tipografía y componentes del resto del diseño.
> Ver `decisiones-diseno.md` para más contexto.

---

## Fidelidad al Diseño del PDF (Actividad 4)

### Paleta de Colores

| Token | Color | Origen en PDF |
|---|---|---|
| Sidebar | `#1E2A45` | Prompt Midjourney: "deep navy blue sidebar" |
| Fondo principal | `#F7F8FC` | Sección 4: "fondo #F7F8FC reduce la fatiga ocular" |
| Primario (botones) | `#2563EB` | Prompt Midjourney: "blue accent buttons (#2563EB)" |
| Badge ASIGNADA | `#16A34A` | `decisiones-diseno.md §2` |
| Badge PENDIENTE | `#CA8A04` | `decisiones-diseno.md §2` |
| Badge CONFLICTO | `#DC2626` | `decisiones-diseno.md §2` |
| Chips de Carrera | `#DBEAFE` | Sección 4: "pills visuales compactas en #DBEAFE" |

### Componentes Clave

- **Sidebar fijo** con items: Asignaciones, Conflictos, Reportes, Perfil — y badge rojo de conflictos activos
- **Tabla densa** de asignaciones con 11 columnas, alternating row shading, scroll horizontal
- **Filtros superiores** (Turno, Estado, Año, Cuatrimestre) encima de la tabla
- **Botón "Asignar automáticamente"** como acción principal destacada en el header
- **Badges semánticos** verde/amarillo/rojo para estados de asignación
- **Chips de Carrera** en azul claro `#DBEAFE`
- **Cards métricas** en el panel de conflictos
- **Panel lateral de resolución asistida** para conflictos
- **Toggles** en la pantalla de Perfil (Figura 4b)

### Estilo Visual General

Del PDF (Sección 4 — Justificación de Decisiones de Diseño):
- **Flat UI sin gradientes ni sombras profundas** — fiel a "se descartó glassmorphism"
- **Tipografía Inter** — "clean sans-serif typography" del prompt Midjourney
- **Modo claro** — el PDF describe "fondo #F7F8FC" no dark mode

---

## Autenticación

La app usa **JWT Bearer** contra `POST /api/auth/login`.

El token se guarda en `localStorage` bajo la clave `aulamatch_token`. Un wrapper sobre
`fetch` en `src/api/client.js` inyecta automáticamente el header `Authorization: Bearer <token>`
en todas las peticiones autenticadas.

Si el servidor devuelve `401`, el token se elimina y el usuario es redirigido a `/login`.

### Credenciales de Demostración

| Rol | Email | Contraseña |
|---|---|---|
| COORDINADOR | `coordinador@aulamatch.edu` | `Coord1234!` |
| ADMINISTRATIVO | `admin@aulamatch.edu` | `Admin1234!` |

En la pantalla de Login, hacer clic en una fila del recuadro "Credenciales de demostración"
autocompleta el formulario automáticamente.

---

## Relación con el Backend

El frontend **no modifica ningún archivo dentro de `backend/`**. Toda la comunicación es
via HTTP sobre la API REST ya deployada.

Swagger UI sigue siendo la referencia técnica de los endpoints:
👉 [https://aulamatch-backend.onrender.com/api-docs](https://aulamatch-backend.onrender.com/api-docs)

---

## Notas sobre CORS

El backend actualmente está configurado con CORS abierto (`*`) porque `ALLOWED_ORIGINS` no
está definida en las variables de entorno de Render (ver `decisiones-diseno.md §7`).

Esto significa que el frontend de desarrollo en `localhost:5173` funciona sin problemas.
Si en el futuro se deploye el frontend en producción (ej. Vercel, Netlify, Render), será
necesario que Joel agregue el origen del frontend a `ALLOWED_ORIGINS` en la configuración
del Web Service de Render. **Esto es una acción pendiente para el momento del deploy.**

---

## Estructura del Proyecto

```
frontend/
├── .env                    # Variables de entorno (no commitear si tiene datos sensibles)
├── .env.example            # Plantilla de variables
├── index.html              # HTML raíz con meta SEO e Inter font
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx            # Entry point
    ├── App.jsx             # Router + AuthProvider
    ├── index.css           # Design tokens + estilos globales
    ├── api/
    │   └── client.js       # fetch wrapper con JWT automático
    ├── contexts/
    │   └── AuthContext.jsx # Estado global de autenticación
    ├── components/
    │   ├── Layout.jsx      # Sidebar + Header
    │   ├── Sidebar.jsx     # Nav con badge de conflictos activos
    │   ├── Badge.jsx       # Badges semánticos + ChipCarrera
    │   └── LoadingSpinner.jsx
    └── pages/
        ├── Login.jsx       # Pantalla 1 (Figura 1 PDF)
        ├── Asignaciones.jsx # Pantalla 2 (Figura 2 PDF) — pantalla principal
        ├── Conflictos.jsx  # Pantalla 3 (Figura 3 PDF)
        ├── Reportes.jsx    # Extensión (sin wireframe en PDF)
        └── Perfil.jsx      # Pantallas 4a/4b (Figuras 4a/4b PDF)
```

## Troubleshooting: Errores Comunes

### Error "Failed to fetch"
Si al iniciar la aplicación en entorno local aparece un banner rojo indicando "Failed to fetch" con todos los contadores en 0, revisá en el siguiente orden:

1. **Configuración de .env:** Verificá que exista el archivo `frontend/.env` y que la variable `VITE_API_URL` apunte al entorno correcto. Si estás probando contra producción, debe ser `https://aulamatch-backend.onrender.com`. Si probás contra un servidor local que no está encendido o apunta al puerto incorrecto, todas las peticiones fallarán.
2. **Cold Start de Render:** Si apuntas a producción y recibís el error, podría deberse a que el plan gratuito de Render pone a "dormir" el backend tras periodos de inactividad. La primera petición puede fallar por timeout. Probá entrar a `https://aulamatch-backend.onrender.com/api/health` desde el navegador para "despertarlo".
3. **CORS:** Render tiene el CORS abierto por defecto. Si esto cambia (mediante la variable `ALLOWED_ORIGINS`), el dashboard de Render deberá incluir tu origen (`http://localhost:5173`).
