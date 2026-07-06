import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useState, useEffect } from 'react'
import { api } from '../api/client'

const NAV_ITEMS = [
  { to: '/asignaciones', icon: '📋', label: 'Asignaciones' },
  { to: '/conflictos',   icon: '⚠️',  label: 'Conflictos', showBadge: true },
  { to: '/reportes',     icon: '📊', label: 'Reportes' },
  { to: '/perfil',       icon: '👤', label: 'Perfil' },
]

export function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [conflictoCount, setConflictoCount] = useState(0)

  useEffect(() => {
    api.getMetricas()
      .then(d => setConflictoCount(d.conflictos_activos || 0))
      .catch(() => {})
  }, [])

  const initials = user?.nombre
    ? user.nombre.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">A</div>
        <div>
          <div className="sidebar-logo-text">AulaMatch</div>
          <div className="sidebar-logo-sub">Gestión de Espacios</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Menú principal</div>
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `sidebar-item${isActive ? ' active' : ''}`
            }
          >
            <span className="sidebar-item-icon">{item.icon}</span>
            {item.label}
            {item.showBadge && conflictoCount > 0 && (
              <span className="sidebar-badge">{conflictoCount}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="sidebar-footer">
        <div className="sidebar-user" onClick={handleLogout} title="Cerrar sesión">
          <div className="sidebar-user-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.nombre || user?.email}</div>
            <div className="sidebar-user-role">{user?.rol || 'COORDINADOR'} · Cerrar sesión</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
