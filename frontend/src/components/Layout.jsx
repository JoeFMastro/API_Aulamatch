import { Sidebar } from './Sidebar'

/**
 * Layout principal: sidebar fijo + área de contenido.
 * Del wireframe Figma AI: sidebar navy izquierdo, contenido claro a la derecha.
 */
export function Layout({ children, title, subtitle, actions }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-content">
        {/* Header de página */}
        <header className="header">
          <div className="flex items-center">
            <span className="header-title">{title}</span>
            {subtitle && (
              <span className="header-subtitle">— {subtitle}</span>
            )}
          </div>
          <div className="header-actions">
            <button className="header-bell btn-ghost" title="Notificaciones">
              🔔
              <span className="header-bell-dot" />
            </button>
            {actions}
          </div>
        </header>

        {/* Contenido de la página */}
        <main className="page-main">
          {children}
        </main>
      </div>
    </div>
  )
}
