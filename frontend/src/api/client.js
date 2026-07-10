/**
 * AulaMatch API Client
 * Wrapper sobre fetch con manejo de JWT automático.
 * La URL base viene de VITE_API_URL (sin hardcodear).
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'https://aulamatch-backend.onrender.com'

function getToken() {
  return localStorage.getItem('aulamatch_token')
}

async function request(path, options = {}) {
  const token = getToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const res = await fetch(`${BASE_URL}/api${path}`, {
    ...options,
    headers,
  })

  if (res.status === 401) {
    localStorage.removeItem('aulamatch_token')
    localStorage.removeItem('aulamatch_user')
    window.location.href = '/login'
    throw new Error('No autenticado')
  }

  if (!res.ok) {
    let errMsg = `Error ${res.status}`
    try {
      const body = await res.json()
      errMsg = body.message || body.error || errMsg
    } catch {
      // ignore parse error
    }
    throw new Error(errMsg)
  }

  const contentType = res.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return res.json()
  }
  return res.text()
}

export const api = {
  // Auth
  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request('/auth/me'),

  // Asignaciones
  getAsignaciones: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/asignaciones${qs ? `?${qs}` : ''}`)
  },
  asignarAutomatica: (anio, cuatrimestre) =>
    request('/asignaciones/automatica', {
      method: 'POST',
      body: JSON.stringify({ anio, cuatrimestre }),
    }),
  updateAsignacion: (id, aula_id) =>
    request(`/asignaciones/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ aula_id, estado: 'ASIGNADA' }),
    }),
  getAulasCompatibles: (comisionId) =>
    request(`/asignaciones/${comisionId}/aulas-compatibles`),
  deleteAsignacion: (id) =>
    request(`/asignaciones/${id}`, { method: 'DELETE' }),

  // Conflictos
  getConflictos: () => request('/conflictos'),
  getMetricas: () => request('/conflictos/metricas'),

  // Reportes
  getReporteAsignaciones: (anio, cuatrimestre) =>
    request(`/reportes/asignaciones?anio=${anio}&cuatrimestre=${cuatrimestre}`),
  getDisponibilidad: (anio, cuatrimestre, dia = '') => {
    const qs = new URLSearchParams({ anio, cuatrimestre, ...(dia ? { dia } : {}) }).toString()
    return request(`/reportes/disponibilidad?${qs}`)
  },
  getReporteCSVUrl: (anio, cuatrimestre) =>
    `${BASE_URL}/api/reportes/asignaciones?anio=${anio}&cuatrimestre=${cuatrimestre}&formato=csv`,

  // Health
  health: () => request('/health'),
  resetDb: () => request('/health/reset-db', { method: 'POST' }),

  // ─────────────────────────────────────────────────────────
  // ADMINISTRACIÓN (Catálogos)
  // ─────────────────────────────────────────────────────────
  getEdificios: () => request('/edificios').catch(() => []),
  crearEdificio: (data) => request('/edificios', { method: 'POST', body: JSON.stringify(data) }),
  
  getAulas: () => request('/aulas').catch(() => []),
  crearAula: (data) => request('/aulas', { method: 'POST', body: JSON.stringify(data) }),

  getComisiones: (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return request(`/comisiones${qs ? `?${qs}` : ''}`).catch(() => [])
  },
  crearComision: (data) => request('/comisiones', { method: 'POST', body: JSON.stringify(data) }),

  getMaterias: () => request('/materias').catch(() => []),
  crearMateria: (data) => request('/materias', { method: 'POST', body: JSON.stringify(data) }),

  getCarreras: () => request('/carreras').catch(() => []),
  crearCarrera: (data) => request('/carreras', { method: 'POST', body: JSON.stringify(data) }),

  getDocentes: () => request('/docentes').catch(() => []),
  crearDocente: (data) => request('/docentes', { method: 'POST', body: JSON.stringify(data) }),
}
