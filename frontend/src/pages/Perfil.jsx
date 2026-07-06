import { useState, useEffect } from 'react'
import { Layout } from '../components/Layout'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../api/client'
import { useNavigate } from 'react-router-dom'

/**
 * Pantalla 4 — Perfil y Configuración
 * Wireframe: Figuras 4a y 4b del PDF Actividad 4
 * "Datos personales e institucionales del usuario, campos editables,
 *  selector de Unidad Académica, toggles de notificaciones y seguridad."
 *
 * Endpoint confirmado (Swagger): GET /api/auth/me
 */
export default function Perfil() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Toggles de notificaciones (UI-only, el backend no expone endpoint para esto)
  const [notifConflictos, setNotifConflictos] = useState(true)
  const [notifAsignaciones, setNotifAsignaciones] = useState(true)
  const [notifReportes, setNotifReportes] = useState(false)

  useEffect(() => {
    api.me()
      .then(data => setPerfil(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const initials = user?.nombre
    ? user.nombre.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <Layout title="Perfil y Configuración">
      {error && <div className="alert alert-error">{error}</div>}

      <div style={{ maxWidth: '680px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Figura 4a — Datos personales e institucionales */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'var(--color-primary)',
                color: 'white',
                fontSize: '22px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
            <div>
              <div style={{ fontSize: '17px', fontWeight: 700 }}>
                {user?.nombre || perfil?.nombre || user?.email}
              </div>
              <div className="text-muted" style={{ marginTop: '2px' }}>
                {user?.rol || perfil?.rol || 'COORDINADOR'} de Espacios
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Nombre completo</label>
              <input
                className="form-input"
                defaultValue={user?.nombre || perfil?.nombre || ''}
                placeholder="Tu nombre completo"
                readOnly
                style={{ background: 'var(--color-bg)' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Correo electrónico</label>
              <input
                className="form-input"
                defaultValue={user?.email || perfil?.email || ''}
                type="email"
                readOnly
                style={{ background: 'var(--color-bg)' }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Rol institucional</label>
              <input
                className="form-input"
                value={user?.rol || perfil?.rol || 'COORDINADOR'}
                readOnly
                style={{ background: 'var(--color-bg)' }}
              />
            </div>

            {perfil?.unidadAcademicaId && (
              <div className="form-group">
                <label className="form-label">Unidad Académica (ID)</label>
                <input
                  className="form-input"
                  value={perfil.unidadAcademicaId}
                  readOnly
                  style={{ background: 'var(--color-bg)' }}
                />
              </div>
            )}
          </div>

          {/* Info de JWT */}
          {perfil && (
            <div
              style={{
                marginTop: '20px',
                padding: '12px',
                background: 'var(--color-bg)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border-light)',
              }}
            >
              <div className="text-muted text-sm" style={{ fontWeight: 600, marginBottom: '6px' }}>
                Datos del token JWT actual
              </div>
              <pre
                style={{
                  fontSize: '11px',
                  color: 'var(--color-text-muted)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  margin: 0,
                }}
              >
                {JSON.stringify(perfil, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Figura 4b — Notificaciones (toggles) */}
        <div className="card">
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '15px', fontWeight: 700 }}>Notificaciones</div>
            <div className="text-muted text-sm mt-4">
              Configurá qué eventos querés recibir como alertas.
            </div>
          </div>

          <Toggle
            id="notif-conflictos"
            checked={notifConflictos}
            onChange={setNotifConflictos}
            label="Conflictos detectados"
            desc="Recibir alerta cuando el sistema detecte superposición o cupo excedido."
          />
          <Toggle
            id="notif-asignaciones"
            checked={notifAsignaciones}
            onChange={setNotifAsignaciones}
            label="Asignaciones completadas"
            desc="Notificar cuando el motor automático termina de asignar aulas."
          />
          <Toggle
            id="notif-reportes"
            checked={notifReportes}
            onChange={setNotifReportes}
            label="Reportes disponibles"
            desc="Avisar cuando un nuevo reporte cuatrimestral está listo para exportar."
          />
        </div>

        {/* Figura 4b — Seguridad */}
        <div className="card">
          <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>
            Seguridad de cuenta
          </div>
          <div className="alert alert-info">
            La sesión expira automáticamente después de 8 horas (configurado en JWT_EXPIRES_IN).
            Cerrá sesión si estás en un equipo compartido.
          </div>
          <div style={{ marginTop: '16px' }}>
            <button
              id="btn-cerrar-sesion"
              className="btn btn-danger"
              onClick={handleLogout}
            >
              🚪 Cerrar sesión
            </button>
          </div>
        </div>

        {/* Info del sistema */}
        <div className="card" style={{ background: 'var(--color-bg)' }}>
          <div className="text-muted text-sm" style={{ lineHeight: '1.8' }}>
            <strong>AulaMatch</strong> — Sistema de Gestión de Espacios Académicos<br />
            Backend: <a href="https://aulamatch-backend.onrender.com/api-docs" target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)' }}>Swagger UI →</a><br />
            Versión frontend: v1.0 (Julio 2026)
          </div>
        </div>
      </div>
    </Layout>
  )
}

/** Toggle component — fiel a Figura 4b del PDF */
function Toggle({ id, checked, onChange, label, desc }) {
  return (
    <div className="toggle-row">
      <div>
        <div className="toggle-label">{label}</div>
        {desc && <div className="toggle-desc">{desc}</div>}
      </div>
      <label className="toggle">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
        />
        <span className="toggle-slider" />
      </label>
    </div>
  )
}
