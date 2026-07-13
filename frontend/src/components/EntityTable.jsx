import { useState } from 'react'

/**
 * EntityTable — tabla genérica reutilizable con botones Editar/Eliminar.
 * Usa las clases maestras del proyecto: data-table, table-wrapper, btn
 */
export function EntityTable({ columns, rows, onEdit, onDelete, loading, emptyMsg = 'Sin registros' }) {
  const [confirmId, setConfirmId] = useState(null)

  const handleDeleteClick = (row) => setConfirmId(row.id)
  const handleConfirm = (row) => { setConfirmId(null); onDelete(row) }

  if (loading) {
    return (
      <div className="loading-center">
        <div className="spinner"></div>
        Cargando...
      </div>
    )
  }

  if (!rows.length) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📭</div>
        <div className="empty-state-title">{emptyMsg}</div>
      </div>
    )
  }

  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key}>{col.label}</th>
            ))}
            <th style={{ textAlign: 'right' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id}>
              {columns.map(col => (
                <td key={col.key}>
                  {col.render ? col.render(row[col.key], row) : (row[col.key] ?? <span className="td-muted">—</span>)}
                </td>
              ))}
              <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                {confirmId === row.id ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                    <span className="td-muted" style={{ color: 'var(--badge-red-text)', fontWeight: 600 }}>¿Eliminar?</span>
                    <button onClick={() => handleConfirm(row)} className="btn btn-danger btn-sm">Sí</button>
                    <button onClick={() => setConfirmId(null)} className="btn btn-secondary btn-sm">No</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                    <button onClick={() => onEdit(row)} className="btn btn-secondary btn-sm">
                      ✏️ Editar
                    </button>
                    <button onClick={() => handleDeleteClick(row)} className="btn btn-danger btn-sm">
                      🗑️ Eliminar
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
