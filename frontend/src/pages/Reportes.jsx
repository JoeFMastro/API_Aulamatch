import { useState } from 'react'
import { Layout } from '../components/Layout'
import { LoadingSpinner, EmptyState } from '../components/LoadingSpinner'
import { api } from '../api/client'

/**
 * Pantalla — Reportes
 * Extensión del diseño (no tiene wireframe propio en el PDF).
 * Se usa la misma paleta, tipografía y componentes del diseño del PDF.
 *
 * Endpoints (Swagger confirmados):
 *   GET /api/reportes/asignaciones?anio=&cuatrimestre=&formato=
 *   GET /api/reportes/disponibilidad?anio=&cuatrimestre=&dia=
 */
export default function Reportes() {
  const [anio, setAnio] = useState(2025)
  const [cuatrimestre, setCuatrimestre] = useState(1)
  const [dia, setDia] = useState('')
  const [tabActiva, setTabActiva] = useState('asignaciones')

  const [dataAsig, setDataAsig] = useState(null)
  const [dataDisp, setDataDisp] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function cargarAsignaciones() {
    setLoading(true)
    setError('')
    try {
      const data = await api.getReporteAsignaciones(anio, cuatrimestre)
      setDataAsig(Array.isArray(data) ? data : data.data || data.asignaciones || [])
      setTabActiva('asignaciones')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function cargarDisponibilidad() {
    setLoading(true)
    setError('')
    try {
      const data = await api.getDisponibilidad(anio, cuatrimestre, dia)
      setDataDisp(data)
      setTabActiva('disponibilidad')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function descargarCSV() {
    const url = api.getReporteCSVUrl(anio, cuatrimestre)
    const a = document.createElement('a')
    a.href = url
    a.download = `aulamatch-asignaciones-${anio}-q${cuatrimestre}.csv`
    a.click()
  }

  // Normalizar disponibilidad: puede llegar como objeto de edificios o array
  const edificiosDisp = dataDisp
    ? Array.isArray(dataDisp)
      ? dataDisp
      : Object.values(dataDisp)
    : []

  return (
    <Layout title="Reportes" subtitle="Exportación y disponibilidad de aulas">
      {error && <div className="alert alert-error">{error}</div>}

      {/* Panel de controles */}
      <div className="report-controls">
        <div className="form-group" style={{ minWidth: '100px' }}>
          <label className="form-label">Año</label>
          <input
            id="reporte-anio"
            type="number"
            className="form-input"
            value={anio}
            onChange={e => setAnio(Number(e.target.value))}
            min={2020}
            max={2030}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Cuatrimestre</label>
          <select
            id="reporte-cuatrimestre"
            className="form-select"
            value={cuatrimestre}
            onChange={e => setCuatrimestre(Number(e.target.value))}
          >
            <option value={1}>1° Cuatrimestre</option>
            <option value={2}>2° Cuatrimestre</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Día (disponibilidad)</label>
          <select
            id="reporte-dia"
            className="form-select"
            value={dia}
            onChange={e => setDia(e.target.value)}
          >
            <option value="">Todos los días</option>
            {['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'].map(d => (
              <option key={d} value={d}>{d.charAt(0) + d.slice(1).toLowerCase()}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-8" style={{ marginTop: '20px', flexWrap: 'wrap' }}>
          <button
            id="btn-reporte-asignaciones"
            className="btn btn-primary"
            onClick={cargarAsignaciones}
            disabled={loading}
          >
            📋 Ver asignaciones
          </button>
          <button
            id="btn-reporte-disponibilidad"
            className="btn btn-secondary"
            onClick={cargarDisponibilidad}
            disabled={loading}
          >
            🏫 Ver disponibilidad
          </button>
          <button
            id="btn-descargar-csv"
            className="btn btn-secondary"
            onClick={descargarCSV}
            title="Descarga el reporte de asignaciones en formato CSV compatible con Excel"
          >
            ⬇️ Descargar CSV
          </button>
        </div>
      </div>

      {loading && <LoadingSpinner text="Generando reporte..." />}

      {/* Reporte de asignaciones */}
      {!loading && tabActiva === 'asignaciones' && dataAsig && (
        <div className="table-section">
          <div className="table-section-header">
            <span className="table-section-title">
              Asignaciones — {cuatrimestre}° Cuatrimestre {anio}
              <span className="badge badge-asignada" style={{ marginLeft: '10px' }}>
                {dataAsig.length} registros
              </span>
            </span>
            <button className="btn btn-ghost btn-sm" onClick={descargarCSV}>
              ⬇️ CSV
            </button>
          </div>
          <div className="table-wrapper" style={{ border: 'none' }}>
            {dataAsig.length === 0 ? (
              <EmptyState
                icon="📊"
                title="Sin datos"
                desc="No hay asignaciones para el período seleccionado."
              />
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Comisión</th>
                    <th>Materia</th>
                    <th>Docente</th>
                    <th>Modalidad</th>
                    <th>Turno</th>
                    <th>Aula</th>
                    <th>Edificio</th>
                    <th>Cupo</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {dataAsig.map((row, i) => (
                    <tr key={row.id || i}>
                      <td className="td-code">{row.comision_codigo || row.codigo || `COM-${row.comision_id}`}</td>
                      <td>{row.materia_nombre || row.materia?.nombre || '—'}</td>
                      <td className="td-muted">
                        {row.docente_nombre || (row.docente
                          ? `${row.docente.apellido}, ${row.docente.nombre}`
                          : '—')}
                      </td>
                      <td className="td-muted">{row.modalidad || '—'}</td>
                      <td className="td-muted">{row.turno || '—'}</td>
                      <td style={{ fontWeight: 500 }}>{row.aula_numero || row.aula?.numero || '—'}</td>
                      <td className="td-muted">{row.edificio_nombre || row.aula?.edificio?.nombre || '—'}</td>
                      <td>
                        <span style={{ fontWeight: 600 }}>{row.inscriptos ?? '—'}</span>
                        <span className="td-muted"> / {row.cupo ?? '—'}</span>
                      </td>
                      <td>
                        <span className={`badge badge-${(row.estado || 'pendiente').toLowerCase()}`}>
                          {row.estado || '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Reporte de disponibilidad */}
      {!loading && tabActiva === 'disponibilidad' && dataDisp && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {edificiosDisp.length === 0 ? (
            <EmptyState
              icon="🏫"
              title="Sin datos de disponibilidad"
              desc="No hay aulas registradas para el período seleccionado."
            />
          ) : (
            edificiosDisp.map((edificio, i) => (
              <div key={edificio.edificio_id || edificio.edificio?.id || i} className="table-section">
                <div className="table-section-header">
                  <div>
                    <span className="table-section-title">
                      🏢 {edificio.edificio_nombre || edificio.nombre || `Edificio ${i + 1}`}
                    </span>
                    {edificio.direccion && (
                      <div className="td-muted" style={{ fontSize: '12px', marginTop: '2px' }}>
                        {edificio.direccion}
                      </div>
                    )}
                  </div>
                </div>
                <div className="table-wrapper" style={{ border: 'none' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Aula</th>
                        <th>Tipo</th>
                        <th>Capacidad</th>
                        <th>% Ocupación</th>
                        <th>Bloques libres</th>
                        <th>Bloques ocupados</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(edificio.aulas || []).map(aula => {
                        const pct = aula.porcentaje_ocupacion ?? aula.ocupacion_pct ?? 0
                        const barColor = pct > 80 ? '#DC2626' : pct > 50 ? '#CA8A04' : '#16A34A'
                        return (
                          <tr key={aula.aula_id || aula.id}>
                            <td style={{ fontWeight: 600 }}>{aula.aula_numero || aula.numero}</td>
                            <td className="td-muted">{aula.tipo}</td>
                            <td>{aula.capacidad}</td>
                            <td>
                              <div className="flex items-center gap-8">
                                <div
                                  style={{
                                    width: '60px',
                                    height: '6px',
                                    background: '#E5E7EB',
                                    borderRadius: '3px',
                                    overflow: 'hidden',
                                  }}
                                >
                                  <div
                                    style={{
                                      width: `${Math.min(pct, 100)}%`,
                                      height: '100%',
                                      background: barColor,
                                    }}
                                  />
                                </div>
                                <span style={{ fontSize: '12px', fontWeight: 600, color: barColor }}>
                                  {Number(pct).toFixed(1)}%
                                </span>
                              </div>
                            </td>
                            <td style={{ color: '#16A34A', fontWeight: 600 }}>
                              {Array.isArray(aula.bloques_libres)
                                ? aula.bloques_libres.length
                                : aula.bloques_libres ?? '—'}
                            </td>
                            <td style={{ color: '#CA8A04', fontWeight: 600 }}>
                              {Array.isArray(aula.bloques_ocupados)
                                ? aula.bloques_ocupados.length
                                : aula.bloques_ocupados ?? '—'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </Layout>
  )
}
