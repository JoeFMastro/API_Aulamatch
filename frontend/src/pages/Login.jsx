import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

/**
 * Pantalla 1 — Login / Inicio de Sesión
 * Wireframe: Figura 1 del PDF Actividad 4
 * "Permite al personal administrativo ingresar con usuario, contraseña
 * y selección de rol institucional."
 */
export default function Login() {
  const { login, loading, error } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    const ok = await login(email, password)
    if (ok) navigate('/asignaciones')
  }

  function fillCredentials(type) {
    if (type === 'coordinador') {
      setEmail('coordinador@aulamatch.edu')
      setPassword('Coord1234!')
    } else {
      setEmail('admin@aulamatch.edu')
      setPassword('Admin1234!')
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-icon">A</div>
          <span className="login-logo-text">AulaMatch</span>
        </div>

        <h1 className="login-title">Iniciar sesión</h1>
        <p className="login-subtitle">
          Sistema de Gestión de Espacios Académicos
        </p>

        {/* Error */}
        {error && <div className="alert alert-error">{error}</div>}

        {/* Form */}
        <form className="login-form" onSubmit={handleSubmit} id="login-form">
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Correo institucional
            </label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="usuario@aulamatch.edu"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button
            id="btn-login"
            type="submit"
            className="btn btn-primary w-full"
            disabled={loading}
            style={{ justifyContent: 'center', padding: '11px' }}
          >
            {loading ? 'Iniciando sesión...' : 'Ingresar al sistema'}
          </button>
        </form>

        {/* Demo credentials hint */}
        <div className="login-hint">
          <div className="login-hint-title">Credenciales de demostración</div>
          <div
            className="login-hint-row"
            style={{ cursor: 'pointer' }}
            onClick={() => fillCredentials('coordinador')}
            title="Clic para autocompletar"
          >
            <span>🎯 Coordinador</span>
            <span className="login-hint-credential">coordinador@aulamatch.edu</span>
          </div>
          <div
            className="login-hint-row"
            style={{ cursor: 'pointer' }}
            onClick={() => fillCredentials('admin')}
            title="Clic para autocompletar"
          >
            <span>📋 Administrativo</span>
            <span className="login-hint-credential">admin@aulamatch.edu</span>
          </div>
          <p
            className="text-muted text-sm mt-8"
            style={{ fontSize: '11px', marginTop: '8px' }}
          >
            Clic en una fila para autocompletar las credenciales.
          </p>
        </div>
      </div>
    </div>
  )
}
