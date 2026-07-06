import { useState, useEffect, useCallback } from 'react'
import { Layout } from '../components/Layout'
import { Badge, CarreraChip } from '../components/Badge'
import { LoadingSpinner, EmptyState } from '../components/LoadingSpinner'
import { api } from '../api/client'

/**
 * Pantalla 2 — Panel de Asignaciones (Pantalla Principal)
 * Wireframe: Figura 2 del PDF Actividad 4
 * "Vista central de gestión de asignaciones. Filtros por UA, Carrera, Edificio,
 *  Turno y Modalidad. Tabla con 11 columnas y badges de estado semánticos."
 *
 * Endpoints (Swagger confirmados):
 *   GET  /api/asignaciones?turno=&estado=
 *   POST /api/asignaciones/automatica  { anio, cuatrimestre }
 *   PATCH /api/asignaciones/:id        { aula_id }
 *   DELETE /api/asignaciones/:id
 */
export default function Asignaciones() {
  const [asignaciones, setAsignaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [running, setRunning] = useState(false)
  const [runResult, setRunResult] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [resetConfirm, setResetConfirm] = useState(false)
  const [resetting, setResetting] = useState(false)

  // Filtros
  const [filtroTurno, setFiltroTurno] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroAnio, setFiltroAnio] = useState(2025)
  const [filtroCuatrimestre, setFiltroCuatrimestre] = useState(1)

  const cargar = useCallback(async () => {
    setLoading(true)
    setError('')
    setRunResult(null)
    try {
      const params = {}
      if (filtroTurno) params.turno = filtroTurno
      if (filtroEstado) params.estado = filtroEstado
      const data = await api.getAsignaciones(params)
      setAsignaciones(Array.isArray(data) ? data : data.asignaciones || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [filtroTurno, filtroEstado])

  useEffect(() => { cargar() }, [cargar])

  async function handleAutomatica() {
    setRunning(true)
    setRunResult(null)
    setError('')
    try {
      const result = await api.asignarAutomatica(filtroAnio, filtroCuatrimestre)
      setRunResult(result)
      await cargar()
    } catch (err) {
      setError(err.message)
    } finally {
      setRunning(false)
    }
  }

  async function handleDelete(id) {
    if (deletingId) return
    if (!window.confirm('¿Eliminar esta asignación? La comisión quedará pendiente.')) return
    setDeletingId(id)
    try {
      await api.deleteAsignacion(id)
      setAsignaciones(prev => prev.filter(a => a.id !== id))
    } catch (err) {
      setError(err.message)
    } finally {
      setDeletingId(null)
    }
  }

  async function handleReset() {
    setResetting(true)
    try {
      await api.resetDb()
      setResetConfirm(false)
      await cargar()
    } catch (err) {
      setError(err.message)
    } finally {
      setResetting(false)
    }
  }

  // Estadísticas rápidas
  const stats = {
    total: asignaciones.length,
    asignadas: asignaciones.filter(a => a.estado === 'ASIGNADA').length,
    pendientes: asignaciones.filter(a => a.estado === 'PENDIENTE').length,
    conflictos: asignaciones.filter(a => a.estado === 'CONFLICTO').length,
  }

  return (
    <Layout
      title="Asignaciones"
      subtitle={`${filtroCuatrimestre}° Cuatrimestre ${filtroAnio}`}
      actions={
        <div className="flex items-center gap-8">
          <button
            id="btn-reset-db"
            className="btn btn-ghost btn-sm"
            onClick={() => setResetConfirm(true)}
            title="Resetear base de datos al estado de demostración"
          >
            🔄 Reset DB
          </button>
          <button
            id="btn-asignar-automatica"
            className="btn btn-primary"
            onClick={handleAutomatica}
            disabled={running}
          >
            {running ? '⏳ Procesando...' : '⚡ Asignar automáticamente'}
          </button>
        </div>
      }
    >
      {/* Resultado del motor automático */}
      {runResult && (
        <div className="alert alert-success mb-16">
          ✅ Motor ejecutado — {runResult.asignadas ?? 0} asignadas,{' '}
          {runResult.pendientes ?? 0} pendientes,{' '}
          {runResult.fallidas ?? 0} fallidas.
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      {/* Miniestadísticas */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '20px' }}>
        <div className="metric-card">
          <div className="metric-card-icon">📋</div>
          <div className="metric-card-value">{stats.total}</div>
          <div className="metric-card-label">Total comisiones</div>
        </div>
        <div className="metric-card">
          <div className="metric-card-icon" style={{ color: '#16A34A' }}>✅</div>
          <div className="metric-card-value" style={{ color: '#16A34A' }}>{stats.asignadas}</div>
          <div className="metric-card-label">Asignadas</div>
        </div>
        <div className="metric-card">
          <div className="metric-card-icon" style={{ color: '#CA8A04' }}>⏳</div>
          <div className="metric-card-value" style={{ color: '#CA8A04' }}>{stats.pendientes}</div>
          <div className="metric-card-label">Pendientes</div>
        </div>
        <div className="metric-card">
          <div className="metric-card-icon" style={{ color: '#DC2626' }}>⚠️</div>
          <div className="metric-card-value" style={{ color: '#DC2626' }}>{stats.conflictos}</div>
          <div className="metric-card-label">Conflictos</div>
        </div>
      </div>

      {/* Filtros + Tabla (fiel al wireframe Figura 2) */}
      <div>
        {/* Barra de filtros superior */}
        <div className="filters-bar">
          <div className="filter-group">
            <select
              id="filtro-turno"
              className="filter-select"
              value={filtroTurno}
              onChange={e => setFiltroTurno(e.target.value)}
            >
              <option value="">Todos los turnos</option>
              <option value="MANANA">Mañana</option>
              <option value="TARDE">Tarde</option>
              <option value="NOCHE">Noche</option>
            </select>

            <select
              id="filtro-estado"
              className="filter-select"
              value={filtroEstado}
              onChange={e => setFiltroEstado(e.target.value)}
            >
              <option value="">Todos los estados</option>
              <option value="ASIGNADA">Asignada</option>
              <option value="PENDIENTE">Pendiente</option>
              <option value="CONFLICTO">Conflicto</option>
            </select>

            <select
              id="filtro-cuatrimestre"
              className="filter-select"
              value={filtroCuatrimestre}
              onChange={e => setFiltroCuatrimestre(Number(e.target.value))}
            >
              <option value={1}>1° Cuatrimestre</option>
              <option value={2}>2° Cuatrimestre</option>
            </select>

            <input
              id="filtro-anio"
              type="number"
              className="filter-input"
              value={filtroAnio}
              onChange={e => setFiltroAnio(Number(e.target.value))}
              min={2020}
              max={2030}
            />
          </div>

          <div className="filter-actions">
            <button
              id="btn-refrescar"
              className="btn btn-secondary btn-sm"
              onClick={cargar}
            >
              🔄 Refrescar
            </button>
          </div>
        </div>

        {/* Tabla densa de asignaciones */}
        <div className="table-wrapper">
          {loading ? (
            <LoadingSpinner text="Cargando asignaciones..." />
          ) : asignaciones.length === 0 ? (
            <EmptyState
              icon="📭"
              title="Sin asignaciones"
              desc='Usá "Asignar automáticamente" para procesar las comisiones pendientes.'
            />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Comisión</th>
                  <th>Materia</th>
                  <th>Carreras</th>
                  <th>Docente</th>
                  <th>Cupo</th>
                  <th>Modalidad</th>
                  <th>Turno</th>
                  <th>Aula asignada</th>
                  <th>Edificio</th>
                  <th>Horario</th>
                  <th style={{ textAlign: 'right' }}>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {asignaciones.map(a => (
                  <AsignacionRow
                    key={a.id}
                    a={a}
                    onDelete={handleDelete}
                    deleting={deletingId === a.id}
                    onReload={cargar}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Reset DB */}
      {resetConfirm && (
        <div className="modal-overlay" onClick={() => setResetConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">🔄 Resetear base de datos</span>
              <button className="modal-close btn" onClick={() => setResetConfirm(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="alert alert-warning">
                Esta acción <strong>borrará todos los datos</strong> y restaurará el seed de demostración. No se puede deshacer.
              </div>
              <p className="text-muted text-sm">
                Útil para volver al estado inicial antes de una evaluación o prueba.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setResetConfirm(false)}>
                Cancelar
              </button>
              <button
                id="btn-confirm-reset"
                className="btn btn-danger"
                onClick={handleReset}
                disabled={resetting}
              >
                {resetting ? 'Reseteando...' : '⚠️ Confirmar Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

/** Fila de la tabla de asignaciones */
function AsignacionRow({ a, onDelete, deleting, onReload }) {
  const [editMode, setEditMode] = useState(false)
  const [aulaId, setAulaId] = useState('')
  const [saving, setSaving] = useState(false)

  const comision = a.comision || a
  const aula = a.aula || a
  const bandas = comision.bandas_horarias || comision.bandasHorarias || []
  const carreras = a.carrera_nombre || comision.materia?.carreras || []

  const horario = a.horario ? a.horario : bandas.length > 0
    ? bandas.map(b => `${b.dia?.slice(0, 2)} ${b.hora_inicio?.slice(0, 5)}–${b.hora_fin?.slice(0, 5)}`).join(', ')
    : '—'

  const [aulasOptions, setAulasOptions] = useState([])
  const [loadingAulas, setLoadingAulas] = useState(false)
  const [errorAulas, setErrorAulas] = useState(null)

  // Fetch aulas when entering edit mode
  useEffect(() => {
    if (editMode) {
      setLoadingAulas(true)
      setErrorAulas(null)
      api.getAulasCompatibles(a.comision_id || a.id)
        .then(res => setAulasOptions(res || []))
        .catch(err => {
          console.error('Error fetching aulas:', err)
          setErrorAulas('Error al cargar aulas')
        })
        .finally(() => setLoadingAulas(false))
    }
  }, [editMode, a.comision_id, a.id])

  async function handleSaveAula() {
    if (!aulaId) return
    setSaving(true)
    try {
      await api.updateAsignacion(a.id, Number(aulaId))
      setEditMode(false)
      onReload()
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <tr>
      <td className="td-code">{a.comision_codigo || comision.codigo || `COM-${a.comision_id || a.id}`}</td>
      <td>
        <div style={{ fontWeight: 500 }}>{a.materia_nombre || comision.materia?.nombre || '—'}</div>
        <div className="td-muted">{a.materia_codigo || comision.materia?.codigo}</div>
      </td>
      <td>
        <div className="chips-cell">
          {carreras.length > 0
            ? carreras.map(c => <CarreraChip key={c.id} nombre={c.codigo || c.nombre} />)
            : <span className="td-muted">—</span>
          }
        </div>
      </td>
      <td>
        {a.docente_nombre || (comision.docente
          ? `${comision.docente.apellido}, ${comision.docente.nombre}`
          : '—')}
      </td>
      <td>
        <span style={{ fontWeight: 600 }}>{a.inscriptos ?? comision.inscriptos ?? '—'}</span>
        <span className="td-muted"> / {a.cupo ?? comision.cupo}</span>
      </td>
      <td className="td-muted">{a.modalidad ?? comision.modalidad}</td>
      <td className="td-muted">{a.turno ?? comision.turno}</td>
      <td>
        {editMode ? (
          <div className="flex items-center gap-8">
            {loadingAulas ? (
              <span className="td-muted text-sm">Cargando aulas...</span>
            ) : errorAulas ? (
              <span className="text-sm" style={{ color: '#DC2626' }}>{errorAulas}</span>
            ) : aulasOptions.length === 0 ? (
              <span className="td-muted text-sm" style={{ fontStyle: 'italic' }}>No hay aulas compatibles disponibles para este horario/cupo.</span>
            ) : (
              <select
                className="filter-input"
                value={aulaId}
                onChange={e => setAulaId(e.target.value)}
                style={{ width: '140px' }}
              >
                <option value="">Seleccione aula...</option>
                {aulasOptions.map(opt => (
                  <option key={opt.id} value={opt.id}>
                    {opt.numero} (Cap: {opt.capacidad}) - {opt.edificio_nombre}
                  </option>
                ))}
              </select>
            )}
            <button className="btn btn-primary btn-sm" onClick={handleSaveAula} disabled={saving || !aulaId}>
              {saving ? '...' : '✓'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditMode(false)}>✕</button>
          </div>
        ) : (
          <div>
            {a.aula_numero || aula.numero ? (
              <span
                style={{ cursor: 'pointer', fontWeight: 500 }}
                onClick={() => { setAulaId(a.aula_id || aula.id); setEditMode(true) }}
                title="Clic para reasignar"
              >
                {a.aula_numero || aula.numero}
              </span>
            ) : (
              <span
                className="td-muted"
                style={{ cursor: 'pointer' }}
                onClick={() => setEditMode(true)}
              >
                Sin aula ✏️
              </span>
            )}
          </div>
        )}
      </td>
      <td className="td-muted">{a.edificio_nombre || aula?.edificio?.nombre || '—'}</td>
      <td className="td-muted" style={{ fontSize: '12px' }}>{horario}</td>
      <td style={{ textAlign: 'right' }}>
        <Badge estado={a.estado} />
      </td>
      <td>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => onDelete(a.id)}
          disabled={deleting}
          title="Eliminar asignación"
          style={{ color: '#DC2626', opacity: deleting ? 0.4 : 1 }}
        >
          🗑️
        </button>
      </td>
    </tr>
  )
}
