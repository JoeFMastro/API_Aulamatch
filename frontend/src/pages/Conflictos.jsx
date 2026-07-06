import { useState, useEffect } from 'react'
import { Layout } from '../components/Layout'
import { Badge } from '../components/Badge'
import { LoadingSpinner, EmptyState } from '../components/LoadingSpinner'
import { api } from '../api/client'

/**
 * Pantalla 3 — Panel de Conflictos
 * Wireframe: Figura 3 del PDF Actividad 4
 * "Detección y resolución de conflictos en tiempo real.
 *  Cards métricas, tabla de conflictos y panel lateral de resolución asistida."
 *
 * Endpoints (Swagger confirmados):
 *   GET /api/conflictos
 *   GET /api/conflictos/metricas
 *   PATCH /api/asignaciones/:id  { aula_id }  ← para resolver
 */
export default function Conflictos() {
  const [conflictos, setConflictos] = useState([])
  const [metricas, setMetricas] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [resolving, setResolving] = useState(false)
  const [nuevoAulaId, setNuevoAulaId] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  async function cargar() {
    setLoading(true)
    setError('')
    try {
      const [conf, met] = await Promise.all([
        api.getConflictos(),
        api.getMetricas(),
      ])
      setConflictos(Array.isArray(conf) ? conf : conf.conflictos || [])
      setMetricas(met)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [])

  async function handleResolver() {
    if (!selected || !nuevoAulaId) return
    setResolving(true)
    setSuccessMsg('')
    try {
      await api.updateAsignacion(selected.id, Number(nuevoAulaId))
      setSuccessMsg(`✅ Asignación #${selected.id} actualizada al aula ${nuevoAulaId}.`)
      setSelected(null)
      setNuevoAulaId('')
      await cargar()
    } catch (err) {
      setError(err.message)
    } finally {
      setResolving(false)
    }
  }

  function tipoConflicto(c) {
    const comision = c.comision || c
    const aulaCapacidad = c.aula_capacidad || c.aula?.capacidad
    if (aulaCapacidad && (c.inscriptos ?? comision.inscriptos) > aulaCapacidad) return 'CUPO_EXCEDIDO'
    if (c.motivo) return c.motivo
    return 'SUPERPOSICION'
  }

  return (
    <Layout title="Panel de Conflictos" subtitle="Alertas activas">
      {error && <div className="alert alert-error">{error}</div>}
      {successMsg && <div className="alert alert-success">{successMsg}</div>}

      {/* Cards métricas (Figura 3 del PDF) */}
      {metricas && (
        <div className="metrics-grid" style={{ marginBottom: '24px' }}>
          <div className="metric-card">
            <div className="metric-card-icon">⚠️</div>
            <div className="metric-card-value" style={{ color: '#DC2626' }}>
              {metricas.conflictos_activos ?? conflictos.length}
            </div>
            <div className="metric-card-label">Conflictos activos</div>
          </div>
          <div className="metric-card">
            <div className="metric-card-icon">📅</div>
            <div className="metric-card-value">
              {metricas.asignaciones_24h ?? metricas.asignaciones_recientes ?? '—'}
            </div>
            <div className="metric-card-label">Asignaciones últimas 24h</div>
          </div>
          <div className="metric-card">
            <div className="metric-card-icon">✅</div>
            <div className="metric-card-value" style={{ color: '#16A34A' }}>
              {metricas.asignaciones_ok ?? metricas.asignadas_hoy ?? '—'}
            </div>
            <div className="metric-card-label">Sin conflictos</div>
          </div>
          <div className="metric-card">
            <div className="metric-card-icon">🏫</div>
            <div className="metric-card-value">
              {metricas.total_aulas ?? '—'}
            </div>
            <div className="metric-card-label">Aulas en sistema</div>
          </div>
        </div>
      )}

      {/* Layout de 2 columnas: tabla + panel resolución */}
      <div className={selected ? 'conflict-panel' : ''}>
        {/* Tabla de conflictos */}
        <div className="table-section">
          <div className="table-section-header">
            <span className="table-section-title">
              Conflictos detectados
              {conflictos.length > 0 && (
                <span className="badge badge-conflicto" style={{ marginLeft: '10px' }}>
                  {conflictos.length}
                </span>
              )}
            </span>
            <button className="btn btn-secondary btn-sm" onClick={cargar}>
              🔄 Actualizar
            </button>
          </div>

          <div className="table-wrapper" style={{ borderRadius: '0', border: 'none' }}>
            {loading ? (
              <LoadingSpinner text="Detectando conflictos..." />
            ) : conflictos.length === 0 ? (
              <EmptyState
                icon="✅"
                title="Sin conflictos activos"
                desc="Todas las asignaciones están en orden."
              />
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Tipo de conflicto</th>
                    <th>Comisión</th>
                    <th>Materia</th>
                    <th>Docente</th>
                    <th>Aula actual</th>
                    <th>Cupo / Capacidad</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {conflictos.map(c => {
                    const comision = c.comision || c
                    const aula = c.aula
                    const tipo = tipoConflicto(c)
                    const isSelected = selected?.id === c.id

                    return (
                      <tr
                        key={c.id}
                        style={{
                          background: isSelected ? '#FEF2F2' : undefined,
                          cursor: 'pointer',
                        }}
                        onClick={() => setSelected(isSelected ? null : c)}
                        title="Clic para resolver este conflicto"
                      >
                        <td className="td-code">#{c.id}</td>
                        <td>
                          <span
                            className={`badge ${
                              tipo === 'CUPO_EXCEDIDO'
                                ? 'badge-conflicto'
                                : 'badge-pendiente'
                            }`}
                            style={{ fontSize: '11px' }}
                          >
                            {tipo === 'CUPO_EXCEDIDO'
                              ? '📊 Cupo excedido'
                              : '🕐 Superposición'}
                          </span>
                        </td>
                        <td className="td-code">{c.comision_codigo || comision.codigo || `COM-${c.comision_id || comision.id}`}</td>
                        <td>{c.materia_nombre || comision.materia?.nombre || '—'}</td>
                        <td className="td-muted">
                          {c.docente_nombre || (comision.docente
                            ? `${comision.docente.apellido}, ${comision.docente.nombre}`
                            : '—')}
                        </td>
                        <td style={{ fontWeight: 500 }}>
                          {c.aula_numero || (aula ? aula.numero : '—')}
                        </td>
                        <td>
                          <span style={{ fontWeight: 600 }}>{c.inscriptos ?? comision.inscriptos ?? '—'}</span>
                          <span className="td-muted"> / {c.aula_capacidad ?? aula?.capacidad ?? '?'}</span>
                          {(c.aula_capacidad || aula?.capacidad) && (c.inscriptos ?? comision.inscriptos) > (c.aula_capacidad ?? aula?.capacidad) && (
                            <span
                              className="badge badge-conflicto"
                              style={{ marginLeft: '6px', fontSize: '10px' }}
                            >
                              +{(c.inscriptos ?? comision.inscriptos) - (c.aula_capacidad ?? aula.capacidad)}
                            </span>
                          )}
                        </td>
                        <td><Badge estado={c.estado} /></td>
                        <td>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={e => { e.stopPropagation(); setSelected(c); setNuevoAulaId('') }}
                          >
                            ✏️ Resolver
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Panel lateral de resolución asistida (Figura 3) */}
        {selected && (
          <div className="resolve-panel">
            <div className="resolve-panel-title">
              🔧 Resolución asistida
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Info del conflicto */}
              <div className="card card-sm" style={{ background: '#FEF2F2', borderColor: '#FECACA' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#DC2626', marginBottom: '6px' }}>
                  Conflicto #{selected.id}
                </div>
                <div style={{ fontSize: '13px' }}>
                  <strong>{selected.comision_codigo || (selected.comision || selected).codigo}</strong>
                </div>
                <div className="td-muted">
                  {selected.materia_nombre || (selected.comision || selected).materia?.nombre}
                </div>
                {(selected.aula_numero || selected.aula) && (
                  <div className="td-muted" style={{ marginTop: '4px' }}>
                    Aula actual: <strong>{selected.aula_numero || selected.aula.numero}</strong>
                    {' '}(cap. {selected.aula_capacidad || selected.aula.capacidad})
                  </div>
                )}
              </div>

              {/* Input de nueva aula */}
              <div className="form-group">
                <label className="form-label">
                  Reasignar a aula (ID numérico)
                </label>
                <input
                  id="input-nueva-aula"
                  type="number"
                  className="form-input"
                  placeholder="Ej: 5"
                  value={nuevoAulaId}
                  onChange={e => setNuevoAulaId(e.target.value)}
                  min={1}
                />
                <p className="text-muted text-sm mt-4">
                  Ingresá el ID del aula disponible compatible con la comisión.
                </p>
              </div>

              <button
                id="btn-confirmar-resolucion"
                className="btn btn-primary w-full"
                onClick={handleResolver}
                disabled={resolving || !nuevoAulaId}
                style={{ justifyContent: 'center' }}
              >
                {resolving ? 'Guardando...' : '✅ Confirmar reasignación'}
              </button>

              <button
                className="btn btn-ghost w-full"
                onClick={() => { setSelected(null); setNuevoAulaId('') }}
                style={{ justifyContent: 'center' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
