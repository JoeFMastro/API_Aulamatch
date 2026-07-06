export function LoadingSpinner({ text = 'Cargando...' }) {
  return (
    <div className="loading-center">
      <div className="spinner" />
      <span className="text-muted text-sm">{text}</span>
    </div>
  )
}

export function EmptyState({ icon = '📭', title = 'Sin datos', desc = '' }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <div className="empty-state-title">{title}</div>
      {desc && <p className="text-muted text-sm mt-4">{desc}</p>}
    </div>
  )
}
