import { useState, useEffect, useCallback } from 'react'
import { Layout } from '../components/Layout'
import { EntityTable } from '../components/EntityTable'
import { EntityForm } from '../components/EntityForm'
import { api } from '../api/client'

// ─── Configuración de tabs ────────────────────────────────────────────────────

const TABS = ['Edificios', 'Aulas', 'Carreras', 'Materias', 'Docentes', 'Comisiones']

// ─── Hook genérico de CRUD ────────────────────────────────────────────────────

function useCrud(getter) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try { 
      const res = await getter()
      console.log('useCrud load success:', res)
      setRows(res) 
    }
    catch (e) { 
      console.error('useCrud load error:', e)
      setError(e.message) 
    }
    finally { setLoading(false) }
  }, [getter])

  useEffect(() => { load() }, [load])

  return { rows, loading, error, reload: load }
}

// ─── Panel de una entidad (tabla + botón agregar + formulario) ────────────────

function EntityPanel({ columns, fields, getter, creator, updater, deleter, emptyMsg, formTitle, onSaved }) {
  const { rows, loading, error, reload } = useCrud(getter)
  const [formOpen, setFormOpen] = useState(false)
  const [editRow, setEditRow] = useState(null)   // null = modo creación
  const [submitError, setSubmitError] = useState(null)

  const openCreate = () => { setEditRow(null); setSubmitError(null); setFormOpen(true) }
  const openEdit   = (row) => { setEditRow(row); setSubmitError(null); setFormOpen(true) }
  const close      = () => { setFormOpen(false); setEditRow(null) }

  const handleSubmit = async (payload) => {
    setSubmitError(null)
    try {
      if (editRow) await updater(editRow.id, payload)
      else await creator(payload)
      await reload()
      if (onSaved) onSaved()
      close()
    } catch (e) {
      setSubmitError(e.message)
      // No cerrar el modal — el usuario ve el error y puede corregir
    }
  }

  const handleDelete = async (row) => {
    try { await deleter(row.id); await reload() }
    catch (e) { alert(`No se pudo eliminar: ${e.message}`) }
  }

  return (
    <div>
      {error && (
        <div className="alert alert-error">
          Error al cargar datos: {error}
        </div>
      )}

      {/* Header de la sección (metadatos y acción principal) usando clases nativas del proyecto */}
      <div className="filters-bar">
        <div className="filter-group">
          <span className="td-muted font-medium">
            {loading ? 'Cargando…' : `${rows.length} registro${rows.length !== 1 ? 's' : ''}`}
          </span>
        </div>
        <div className="filter-actions">
          <button onClick={openCreate} className="btn btn-primary">
            + Agregar {formTitle}
          </button>
        </div>
      </div>

      <EntityTable
        columns={columns}
        rows={rows}
        loading={loading}
        onEdit={openEdit}
        onDelete={handleDelete}
        emptyMsg={emptyMsg}
      />

      <EntityForm
        isOpen={formOpen}
        onClose={close}
        onSubmit={handleSubmit}
        title={editRow ? `Editar ${formTitle}` : `Nuevo ${formTitle}`}
        fields={fields}
        initialData={editRow}
        error={submitError}
      />
    </div>
  )
}

// ─── Definiciones de entidades ────────────────────────────────────────────────

function useAdminConfig() {
  const [edificios, setEdificios] = useState([])
  const [uas, setUas] = useState([])
  const [carreras, setCarreras] = useState([])
  const [materias, setMaterias] = useState([])
  const [docentes, setDocentes] = useState([])

  const loadConfig = useCallback(() => {
    api.getEdificios().then(setEdificios).catch(() => {})
    api.getUAs().then(setUas).catch(() => {})
    api.getCarreras().then(setCarreras).catch(() => {})
    api.getMaterias().then(setMaterias).catch(() => {})
    api.getDocentes().then(setDocentes).catch(() => {})
  }, [])

  useEffect(() => { loadConfig() }, [loadConfig])

  const TIPO_AULA_OPS  = ['AULA', 'LABORATORIO', 'AUDITORIO', 'SALA_VIDEOCONFERENCIA'].map(v => ({ value: v, label: v }))
  const MODALIDAD_OPS  = [{ value: 'PRESENCIAL', label: 'Presencial' }, { value: 'VIRTUAL', label: 'Virtual' }, { value: 'HIBRIDA', label: 'Híbrida' }]
  const TURNO_OPS      = [{ value: 'MANANA', label: 'Mañana' }, { value: 'TARDE', label: 'Tarde' }, { value: 'NOCHE', label: 'Noche' }]
  const CUATRI_OPS     = [{ value: '1', label: '1er cuatrimestre' }, { value: '2', label: '2do cuatrimestre' }]

  const config = {
    edificios: {
      columns: [
        { key: 'id', label: 'ID' },
        { key: 'nombre', label: 'Nombre' },
        { key: 'direccion', label: 'Dirección' },
      ],
      fields: [
        { key: 'nombre', label: 'Nombre', type: 'text', required: true },
        { key: 'direccion', label: 'Dirección', type: 'text', required: true },
      ],
      getter: api.getEdificios,
      creator: api.crearEdificio,
      updater: api.editarEdificio,
      deleter: api.eliminarEdificio,
      formTitle: 'Edificio',
      emptyMsg: 'No hay edificios registrados',
    },
    aulas: {
      columns: [
        { key: 'id', label: 'ID' },
        { key: 'numero', label: 'Número' },
        { key: 'capacidad', label: 'Capacidad' },
        { key: 'tipo', label: 'Tipo' },
        { key: 'edificio_nombre', label: 'Edificio' },
      ],
      fields: [
        { key: 'numero', label: 'Número', type: 'text', required: true },
        { key: 'capacidad', label: 'Capacidad', type: 'number', required: true, min: 1 },
        { key: 'tipo', label: 'Tipo', type: 'select', required: true, options: TIPO_AULA_OPS },
        { key: 'edificio_id', label: 'Edificio', type: 'select', required: true,
          options: edificios.map(e => ({ value: String(e.id), label: e.nombre })) },
      ],
      getter: api.getAulas,
      creator: api.crearAula,
      updater: api.editarAula,
      deleter: api.eliminarAula,
      formTitle: 'Aula',
      emptyMsg: 'No hay aulas registradas',
    },
    carreras: {
      columns: [
        { key: 'id', label: 'ID' },
        { key: 'codigo', label: 'Código', render: (val) => <span className="td-code">{val}</span> },
        { key: 'nombre', label: 'Nombre' },
        { key: 'unidad_academica_nombre', label: 'Unidad Académica' },
      ],
      fields: [
        { key: 'codigo', label: 'Código', type: 'text', required: true },
        { key: 'nombre', label: 'Nombre', type: 'text', required: true },
        { key: 'unidad_academica_id', label: 'Unidad Académica', type: 'select', required: true,
          options: uas.map(u => ({ value: String(u.id), label: u.nombre })) },
      ],
      getter: api.getCarreras,
      creator: api.crearCarrera,
      updater: api.editarCarrera,
      deleter: api.eliminarCarrera,
      formTitle: 'Carrera',
      emptyMsg: 'No hay carreras registradas',
    },
    materias: {
      columns: [
        { key: 'id', label: 'ID' },
        { key: 'codigo', label: 'Código', render: (val) => <span className="td-code">{val}</span> },
        { key: 'nombre', label: 'Nombre' },
        { key: 'unidad_academica_nombre', label: 'Unidad Académica' },
        { key: 'carreras', label: 'Carreras',
          render: (val) => Array.isArray(val) && val.length
            ? <div className="chips-cell">{val.map(c => <span key={c.id} className="chip">{c.codigo}</span>)}</div>
            : <span className="td-muted">—</span>
        },
      ],
      fields: [
        { key: 'codigo', label: 'Código', type: 'text', required: true },
        { key: 'nombre', label: 'Nombre', type: 'text', required: true },
        { key: 'unidad_academica_id', label: 'Unidad Académica', type: 'select', required: true,
          options: uas.map(u => ({ value: String(u.id), label: u.nombre })) },
        { key: 'carrera_ids', label: 'Carreras asociadas', type: 'multiselect',
          options: carreras.map(c => ({ value: String(c.id), label: `${c.codigo} — ${c.nombre}` })) },
      ],
      getter: api.getMaterias,
      creator: api.crearMateria,
      updater: api.editarMateria,
      deleter: api.eliminarMateria,
      formTitle: 'Materia',
      emptyMsg: 'No hay materias registradas',
    },
    docentes: {
      columns: [
        { key: 'id', label: 'ID' },
        { key: 'apellido', label: 'Apellido' },
        { key: 'nombre', label: 'Nombre' },
        { key: 'cargo', label: 'Cargo' },
      ],
      fields: [
        { key: 'apellido', label: 'Apellido', type: 'text', required: true },
        { key: 'nombre', label: 'Nombre', type: 'text', required: true },
        { key: 'cargo', label: 'Cargo', type: 'text', required: false, placeholder: 'Ej: Profesor Titular' },
      ],
      getter: api.getDocentes,
      creator: api.crearDocente,
      updater: api.editarDocente,
      deleter: api.eliminarDocente,
      formTitle: 'Docente',
      emptyMsg: 'No hay docentes registrados',
    },
    comisiones: {
      columns: [
        { key: 'codigo', label: 'Código', render: (val) => <span className="td-code">{val}</span> },
        { key: 'materia_nombre', label: 'Materia' },
        { key: 'docente_nombre', label: 'Docente' },
        { key: 'cupo', label: 'Cupo' },
        { key: 'turno', label: 'Turno' },
        { key: 'modalidad', label: 'Modalidad' },
        { key: 'anio', label: 'Año' },
        { key: 'cuatrimestre', label: 'Cuatri' },
      ],
      fields: [
        { key: 'codigo', label: 'Código', type: 'text', required: true },
        { key: 'cupo', label: 'Cupo', type: 'number', required: true, min: 1 },
        { key: 'modalidad', label: 'Modalidad', type: 'select', required: true, options: MODALIDAD_OPS },
        { key: 'turno', label: 'Turno', type: 'select', required: true, options: TURNO_OPS },
        { key: 'cuatrimestre', label: 'Cuatrimestre', type: 'select', required: true, options: CUATRI_OPS },
        { key: 'anio', label: 'Año', type: 'number', required: true, min: 2000, defaultValue: new Date().getFullYear() },
        { key: 'materia_id', label: 'Materia', type: 'select', required: true,
          options: materias.map(m => ({ value: String(m.id), label: `${m.codigo} — ${m.nombre}` })) },
        { key: 'docente_id', label: 'Docente', type: 'select', required: true,
          options: docentes.map(d => ({ value: String(d.id), label: `${d.apellido}, ${d.nombre}` })) },
      ],
      getter: api.getComisiones,
      creator: api.crearComision,
      updater: api.editarComision,
      deleter: api.eliminarComision,
      formTitle: 'Comisión',
      emptyMsg: 'No hay comisiones registradas',
    },
  }
  return { config, reloadConfig: loadConfig }
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function Administracion() {
  const [activeTab, setActiveTab] = useState('Edificios')
  const { config, reloadConfig } = useAdminConfig()

  const tabKey = activeTab.toLowerCase()
  const current = config[tabKey]

  return (
    <Layout title="Administración" subtitle="Gestión de catálogos y entidades maestras">

      {/* Tabs list: Usando un bloque estilizado similar a la barra de filtros pero como pestañas */}
      <div className="filters-bar" style={{ gap: '8px', overflowX: 'auto', flexWrap: 'nowrap', marginBottom: '24px', borderRadius: 'var(--radius-md)' }}>
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={activeTab === tab ? 'btn btn-primary' : 'btn btn-ghost'}
            style={{ minWidth: 'auto' }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Contenido del tab activo */}
      {current && (
        <div>
          <EntityPanel key={activeTab} {...current} onSaved={reloadConfig} />
        </div>
      )}
    </Layout>
  )
}
