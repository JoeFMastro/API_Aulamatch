import { useState, useEffect } from 'react'

/**
 * EntityForm — modal de formulario genérico para Create/Edit.
 * Usa clases de index.css: modal-overlay, modal, form-group, form-input, btn, etc.
 */
export function EntityForm({ isOpen, onClose, onSubmit, title, fields, initialData, error }) {
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    if (isOpen) {
      const init = {}
      fields.forEach(f => {
        if (initialData && initialData[f.key] !== undefined) {
          if (f.type === 'multiselect' && Array.isArray(initialData[f.key])) {
            init[f.key] = initialData[f.key].map(item => String(item.id ?? item))
          } else {
            init[f.key] = String(initialData[f.key] ?? '')
          }
        } else {
          init[f.key] = f.type === 'multiselect' ? [] : (f.defaultValue ?? '')
        }
      })
      setForm(init)
      setFieldErrors({})
      setSaving(false)
    }
  }, [isOpen, initialData, fields])

  if (!isOpen) return null

  const validate = () => {
    const errs = {}
    fields.forEach(f => {
      const val = form[f.key]
      if (f.required) {
        const isEmpty = f.type === 'multiselect' ? !val?.length : !String(val ?? '').trim()
        if (isEmpty) errs[f.key] = `${f.label} es obligatorio`
      }
      if (f.type === 'number' && val !== '' && (isNaN(Number(val)) || (f.min !== undefined && Number(val) < f.min))) {
        errs[f.key] = f.min !== undefined ? `Debe ser un número >= ${f.min}` : 'Debe ser un número'
      }
    })
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setFieldErrors(errs); return }
    setSaving(true)
    try {
      const payload = {}
      fields.forEach(f => {
        if (f.type === 'number') {
          payload[f.key] = Number(form[f.key])
        } else if (f.type === 'multiselect') {
          payload[f.key] = (form[f.key] || []).map(Number)
        } else {
          const val = form[f.key]
          // Campos opcionales vacíos: omitirlos del payload en lugar de enviar undefined
          // Campos requeridos: siempre incluirlos (el backend genera el error descriptivo)
          if (val === '' && !f.required) {
            // Omitir — no incluir la clave en el payload
          } else {
            payload[f.key] = val === '' ? null : val
          }
        }
      })
      await onSubmit(payload)
    } finally {
      setSaving(false)
    }
  }


  const setField = (key, val) => {
    setForm(prev => ({ ...prev, [key]: val }))
    setFieldErrors(prev => ({ ...prev, [key]: undefined }))
  }

  const toggleMulti = (key, val) => {
    setForm(prev => {
      const cur = prev[key] || []
      return { ...prev, [key]: cur.includes(val) ? cur.filter(v => v !== val) : [...cur, val] }
    })
    setFieldErrors(prev => ({ ...prev, [key]: undefined }))
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button onClick={onClose} className="modal-close">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-error">{error}</div>}

            {fields.map(f => (
              <div key={f.key} className="form-group">
                <label className="form-label">
                  {f.label}{f.required && <span style={{ color: 'var(--badge-red-text)', marginLeft: '4px' }}>*</span>}
                </label>

                {f.type === 'select' ? (
                  <select
                    className="form-select"
                    style={fieldErrors[f.key] ? { borderColor: 'var(--badge-red-text)' } : {}}
                    value={form[f.key] ?? ''}
                    onChange={e => setField(f.key, e.target.value)}
                  >
                    <option value="">Seleccione...</option>
                    {(f.options || []).map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>

                ) : f.type === 'multiselect' ? (
                  <div
                    style={{
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '8px',
                      maxHeight: '160px',
                      overflowY: 'auto',
                      borderColor: fieldErrors[f.key] ? 'var(--badge-red-text)' : 'var(--color-border)'
                    }}
                  >
                    {(f.options || []).map(opt => {
                      const checked = (form[f.key] || []).includes(String(opt.value))
                      return (
                        <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleMulti(f.key, String(opt.value))}
                          />
                          <span style={{ fontSize: '13px' }}>{opt.label}</span>
                        </label>
                      )
                    })}
                    {!(f.options || []).length && <p className="td-muted" style={{ padding: '4px' }}>Sin opciones disponibles</p>}
                  </div>

                ) : (
                  <input
                    type={f.type || 'text'}
                    className="form-input"
                    style={fieldErrors[f.key] ? { borderColor: 'var(--badge-red-text)' } : {}}
                    value={form[f.key] ?? ''}
                    onChange={e => setField(f.key, e.target.value)}
                    min={f.min}
                    placeholder={f.placeholder}
                  />
                )}

                {fieldErrors[f.key] && (
                  <p className="form-error">{fieldErrors[f.key]}</p>
                )}
              </div>
            ))}
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-ghost">Cancelar</button>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? 'Guardando...' : (initialData ? 'Guardar cambios' : 'Crear')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
