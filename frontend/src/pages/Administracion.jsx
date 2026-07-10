import { useState, useEffect } from 'react'
import { Layout } from '../components/Layout'
import { api } from '../api/client'
import { LoadingSpinner } from '../components/LoadingSpinner'

function TabEdificios({ uas }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({ nombre: '', direccion: '' })
  const [error, setError] = useState('')

  const loadData = () => {
    api.getEdificios().then(setData).finally(() => setLoading(false))
  }
  useEffect(() => { loadData() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.crearEdificio(formData)
      setFormData({ nombre: '', direccion: '' })
      loadData()
      document.getElementById('modal_edificio').close()
    } catch (err) { setError(err.message) }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">Edificios</h3>
        <button className="btn btn-primary" onClick={() => document.getElementById('modal_edificio').showModal()}>+ Agregar Edificio</button>
      </div>
      {loading ? <LoadingSpinner /> : (
        <table className="table table-zebra w-full bg-base-100 rounded-lg shadow">
          <thead><tr><th>ID</th><th>Nombre</th><th>Dirección</th></tr></thead>
          <tbody>{data.map(d => <tr key={d.id}><td>{d.id}</td><td>{d.nombre}</td><td>{d.direccion}</td></tr>)}</tbody>
        </table>
      )}
      <dialog id="modal_edificio" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">Nuevo Edificio</h3>
          {error && <div className="alert alert-error mb-4">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-control mb-2"><label className="label">Nombre</label><input className="input input-bordered" required value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} /></div>
            <div className="form-control mb-4"><label className="label">Dirección</label><input className="input input-bordered" required value={formData.direccion} onChange={e => setFormData({...formData, direccion: e.target.value})} /></div>
            <div className="modal-action">
              <button type="button" className="btn" onClick={() => document.getElementById('modal_edificio').close()}>Cancelar</button>
              <button type="submit" className="btn btn-primary">Guardar</button>
            </div>
          </form>
        </div>
      </dialog>
    </div>
  )
}

function TabAulas({ edificios }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({ numero: '', capacidad: '', tipo: 'AULA', edificio_id: '' })
  const [error, setError] = useState('')

  const loadData = () => { api.getAulas().then(setData).finally(() => setLoading(false)) }
  useEffect(() => { loadData() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.crearAula({ ...formData, capacidad: Number(formData.capacidad), edificio_id: Number(formData.edificio_id) })
      setFormData({ numero: '', capacidad: '', tipo: 'AULA', edificio_id: '' })
      loadData()
      document.getElementById('modal_aula').close()
    } catch (err) { setError(err.message) }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">Aulas</h3>
        <button className="btn btn-primary" onClick={() => document.getElementById('modal_aula').showModal()}>+ Agregar Aula</button>
      </div>
      {loading ? <LoadingSpinner /> : (
        <table className="table table-zebra w-full bg-base-100 rounded-lg shadow">
          <thead><tr><th>ID</th><th>Número</th><th>Capacidad</th><th>Tipo</th><th>Edificio</th></tr></thead>
          <tbody>{data.map(d => <tr key={d.id}><td>{d.id}</td><td>{d.numero}</td><td>{d.capacidad}</td><td>{d.tipo}</td><td>{d.edificio_nombre || d.edificio_id}</td></tr>)}</tbody>
        </table>
      )}
      <dialog id="modal_aula" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">Nueva Aula</h3>
          {error && <div className="alert alert-error mb-4">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-control mb-2"><label className="label">Número</label><input className="input input-bordered" required value={formData.numero} onChange={e => setFormData({...formData, numero: e.target.value})} /></div>
            <div className="form-control mb-2"><label className="label">Capacidad</label><input type="number" className="input input-bordered" required value={formData.capacidad} onChange={e => setFormData({...formData, capacidad: e.target.value})} /></div>
            <div className="form-control mb-2"><label className="label">Tipo</label><select className="select select-bordered" required value={formData.tipo} onChange={e => setFormData({...formData, tipo: e.target.value})}><option value="AULA">AULA</option><option value="LABORATORIO">LABORATORIO</option><option value="AUDITORIO">AUDITORIO</option><option value="SALA_VIDEOCONFERENCIA">SALA_VIDEOCONFERENCIA</option></select></div>
            <div className="form-control mb-4"><label className="label">Edificio</label><select className="select select-bordered" required value={formData.edificio_id} onChange={e => setFormData({...formData, edificio_id: e.target.value})}><option value="">Seleccione...</option>{edificios.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}</select></div>
            <div className="modal-action">
              <button type="button" className="btn" onClick={() => document.getElementById('modal_aula').close()}>Cancelar</button>
              <button type="submit" className="btn btn-primary">Guardar</button>
            </div>
          </form>
        </div>
      </dialog>
    </div>
  )
}

function TabCarreras({ uas }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({ nombre: '', codigo: '', unidad_academica_id: '' })
  const [error, setError] = useState('')

  const loadData = () => { api.getCarreras().then(setData).finally(() => setLoading(false)) }
  useEffect(() => { loadData() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.crearCarrera({ ...formData, unidad_academica_id: Number(formData.unidad_academica_id) })
      setFormData({ nombre: '', codigo: '', unidad_academica_id: '' })
      loadData()
      document.getElementById('modal_carrera').close()
    } catch (err) { setError(err.message) }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">Carreras</h3>
        <button className="btn btn-primary" onClick={() => document.getElementById('modal_carrera').showModal()}>+ Agregar Carrera</button>
      </div>
      {loading ? <LoadingSpinner /> : (
        <table className="table table-zebra w-full bg-base-100 rounded-lg shadow">
          <thead><tr><th>ID</th><th>Código</th><th>Nombre</th><th>Unidad Académica</th></tr></thead>
          <tbody>{data.map(d => <tr key={d.id}><td>{d.id}</td><td>{d.codigo}</td><td>{d.nombre}</td><td>{d.unidad_academica_nombre || d.unidad_academica_id}</td></tr>)}</tbody>
        </table>
      )}
      <dialog id="modal_carrera" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">Nueva Carrera</h3>
          {error && <div className="alert alert-error mb-4">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-control mb-2"><label className="label">Código</label><input className="input input-bordered" required value={formData.codigo} onChange={e => setFormData({...formData, codigo: e.target.value})} /></div>
            <div className="form-control mb-2"><label className="label">Nombre</label><input className="input input-bordered" required value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} /></div>
            <div className="form-control mb-4"><label className="label">Unidad Académica</label><select className="select select-bordered" required value={formData.unidad_academica_id} onChange={e => setFormData({...formData, unidad_academica_id: e.target.value})}><option value="">Seleccione...</option>{uas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}</select></div>
            <div className="modal-action">
              <button type="button" className="btn" onClick={() => document.getElementById('modal_carrera').close()}>Cancelar</button>
              <button type="submit" className="btn btn-primary">Guardar</button>
            </div>
          </form>
        </div>
      </dialog>
    </div>
  )
}

function TabMaterias({ uas }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({ nombre: '', codigo: '', unidad_academica_id: '' })
  const [error, setError] = useState('')

  const loadData = () => { api.getMaterias().then(setData).finally(() => setLoading(false)) }
  useEffect(() => { loadData() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.crearMateria({ ...formData, unidad_academica_id: Number(formData.unidad_academica_id) })
      setFormData({ nombre: '', codigo: '', unidad_academica_id: '' })
      loadData()
      document.getElementById('modal_materia').close()
    } catch (err) { setError(err.message) }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">Materias</h3>
        <button className="btn btn-primary" onClick={() => document.getElementById('modal_materia').showModal()}>+ Agregar Materia</button>
      </div>
      {loading ? <LoadingSpinner /> : (
        <table className="table table-zebra w-full bg-base-100 rounded-lg shadow">
          <thead><tr><th>ID</th><th>Código</th><th>Nombre</th><th>Unidad Académica</th></tr></thead>
          <tbody>{data.map(d => <tr key={d.id}><td>{d.id}</td><td>{d.codigo}</td><td>{d.nombre}</td><td>{d.unidad_academica_nombre || d.unidad_academica_id}</td></tr>)}</tbody>
        </table>
      )}
      <dialog id="modal_materia" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">Nueva Materia</h3>
          {error && <div className="alert alert-error mb-4">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-control mb-2"><label className="label">Código</label><input className="input input-bordered" required value={formData.codigo} onChange={e => setFormData({...formData, codigo: e.target.value})} /></div>
            <div className="form-control mb-2"><label className="label">Nombre</label><input className="input input-bordered" required value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} /></div>
            <div className="form-control mb-4"><label className="label">Unidad Académica</label><select className="select select-bordered" required value={formData.unidad_academica_id} onChange={e => setFormData({...formData, unidad_academica_id: e.target.value})}><option value="">Seleccione...</option>{uas.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}</select></div>
            <div className="modal-action">
              <button type="button" className="btn" onClick={() => document.getElementById('modal_materia').close()}>Cancelar</button>
              <button type="submit" className="btn btn-primary">Guardar</button>
            </div>
          </form>
        </div>
      </dialog>
    </div>
  )
}

function TabDocentes() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({ nombre: '', apellido: '', email: '' })
  const [error, setError] = useState('')

  const loadData = () => { api.getDocentes().then(setData).finally(() => setLoading(false)) }
  useEffect(() => { loadData() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.crearDocente(formData)
      setFormData({ nombre: '', apellido: '', email: '' })
      loadData()
      document.getElementById('modal_docente').close()
    } catch (err) { setError(err.message) }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">Docentes</h3>
        <button className="btn btn-primary" onClick={() => document.getElementById('modal_docente').showModal()}>+ Agregar Docente</button>
      </div>
      {loading ? <LoadingSpinner /> : (
        <table className="table table-zebra w-full bg-base-100 rounded-lg shadow">
          <thead><tr><th>ID</th><th>Nombre</th><th>Apellido</th><th>Email</th></tr></thead>
          <tbody>{data.map(d => <tr key={d.id}><td>{d.id}</td><td>{d.nombre}</td><td>{d.apellido}</td><td>{d.email}</td></tr>)}</tbody>
        </table>
      )}
      <dialog id="modal_docente" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">Nuevo Docente</h3>
          {error && <div className="alert alert-error mb-4">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-control mb-2"><label className="label">Nombre</label><input className="input input-bordered" required value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} /></div>
            <div className="form-control mb-2"><label className="label">Apellido</label><input className="input input-bordered" required value={formData.apellido} onChange={e => setFormData({...formData, apellido: e.target.value})} /></div>
            <div className="form-control mb-4"><label className="label">Email</label><input type="email" className="input input-bordered" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
            <div className="modal-action">
              <button type="button" className="btn" onClick={() => document.getElementById('modal_docente').close()}>Cancelar</button>
              <button type="submit" className="btn btn-primary">Guardar</button>
            </div>
          </form>
        </div>
      </dialog>
    </div>
  )
}

function TabComisiones({ materias, docentes }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({ codigo: '', cupo: '', modalidad: 'PRESENCIAL', turno: 'MANANA', cuatrimestre: '1', anio: '2025', materia_id: '', docente_id: '' })
  const [error, setError] = useState('')

  const loadData = () => { api.getComisiones().then(setData).finally(() => setLoading(false)) }
  useEffect(() => { loadData() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.crearComision({ ...formData, cupo: Number(formData.cupo), cuatrimestre: Number(formData.cuatrimestre), anio: Number(formData.anio), materia_id: Number(formData.materia_id), docente_id: Number(formData.docente_id) })
      setFormData({ codigo: '', cupo: '', modalidad: 'PRESENCIAL', turno: 'MANANA', cuatrimestre: '1', anio: '2025', materia_id: '', docente_id: '' })
      loadData()
      document.getElementById('modal_comision').close()
    } catch (err) { setError(err.message) }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">Comisiones</h3>
        <button className="btn btn-primary" onClick={() => document.getElementById('modal_comision').showModal()}>+ Agregar Comisión</button>
      </div>
      {loading ? <LoadingSpinner /> : (
        <table className="table table-zebra w-full bg-base-100 rounded-lg shadow">
          <thead><tr><th>Cód.</th><th>Materia</th><th>Docente</th><th>Cupo</th><th>Turno</th><th>Modalidad</th></tr></thead>
          <tbody>{data.map(d => <tr key={d.id}><td>{d.codigo}</td><td>{d.materia_nombre || d.materia_id}</td><td>{d.docente_nombre || d.docente_id}</td><td>{d.cupo}</td><td>{d.turno}</td><td>{d.modalidad}</td></tr>)}</tbody>
        </table>
      )}
      <dialog id="modal_comision" className="modal">
        <div className="modal-box w-11/12 max-w-2xl">
          <h3 className="font-bold text-lg mb-4">Nueva Comisión</h3>
          {error && <div className="alert alert-error mb-4">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <div className="form-control mb-2"><label className="label">Código</label><input className="input input-bordered" required value={formData.codigo} onChange={e => setFormData({...formData, codigo: e.target.value})} /></div>
              <div className="form-control mb-2"><label className="label">Cupo</label><input type="number" className="input input-bordered" required value={formData.cupo} onChange={e => setFormData({...formData, cupo: e.target.value})} /></div>
              <div className="form-control mb-2"><label className="label">Materia</label><select className="select select-bordered" required value={formData.materia_id} onChange={e => setFormData({...formData, materia_id: e.target.value})}><option value="">Seleccione...</option>{materias.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select></div>
              <div className="form-control mb-2"><label className="label">Docente</label><select className="select select-bordered" required value={formData.docente_id} onChange={e => setFormData({...formData, docente_id: e.target.value})}><option value="">Seleccione...</option>{docentes.map(d => <option key={d.id} value={d.id}>{d.nombre} {d.apellido}</option>)}</select></div>
              <div className="form-control mb-2"><label className="label">Turno</label><select className="select select-bordered" required value={formData.turno} onChange={e => setFormData({...formData, turno: e.target.value})}><option value="MANANA">Mañana</option><option value="TARDE">Tarde</option><option value="NOCHE">Noche</option></select></div>
              <div className="form-control mb-2"><label className="label">Modalidad</label><select className="select select-bordered" required value={formData.modalidad} onChange={e => setFormData({...formData, modalidad: e.target.value})}><option value="PRESENCIAL">Presencial</option><option value="VIRTUAL">Virtual</option><option value="HIBRIDA">Híbrida</option></select></div>
              <div className="form-control mb-2"><label className="label">Año</label><input type="number" className="input input-bordered" required value={formData.anio} onChange={e => setFormData({...formData, anio: e.target.value})} /></div>
              <div className="form-control mb-2"><label className="label">Cuatrimestre</label><select className="select select-bordered" required value={formData.cuatrimestre} onChange={e => setFormData({...formData, cuatrimestre: e.target.value})}><option value="1">1</option><option value="2">2</option></select></div>
            </div>
            <div className="modal-action">
              <button type="button" className="btn" onClick={() => document.getElementById('modal_comision').close()}>Cancelar</button>
              <button type="submit" className="btn btn-primary">Guardar</button>
            </div>
          </form>
        </div>
      </dialog>
    </div>
  )
}

export default function Administracion() {
  const [activeTab, setActiveTab] = useState('Edificios')
  const [uas, setUas] = useState([])
  const [edificios, setEdificios] = useState([])
  const [materias, setMaterias] = useState([])
  const [docentes, setDocentes] = useState([])

  useEffect(() => {
    // Para los modales que necesitan selects con datos externos, cargamos UAs, Edificios, etc.
    const loadCommon = async () => {
      try {
        const fetchUAs = async () => {
          // Si tuviéramos un getUAs() en el client... agreguémoslo o usemos fetch directo:
          const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/unidades-academicas`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          })
          if (res.ok) setUas(await res.json())
        }
        await fetchUAs()
        setEdificios(await api.getEdificios())
        setMaterias(await api.getMaterias())
        setDocentes(await api.getDocentes())
      } catch (err) { console.error('Error preloading data', err) }
    }
    loadCommon()
  }, [])

  const tabs = ['Edificios', 'Aulas', 'Carreras', 'Materias', 'Docentes', 'Comisiones']

  return (
    <Layout title="Administración de Entidades" subtitle="Gestión de catálogos y entidades maestras">
      <div role="tablist" className="tabs tabs-boxed mb-6 bg-base-100/50 p-2 rounded-lg shadow-sm overflow-x-auto flex-nowrap">
        {tabs.map(tab => (
          <a
            role="tab"
            key={tab}
            className={`tab tab-lg whitespace-nowrap cursor-pointer ${activeTab === tab ? 'tab-active bg-primary text-white font-bold' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </a>
        ))}
      </div>

      <div className="bg-base-100 p-6 rounded-lg shadow-sm border border-base-200">
        {activeTab === 'Edificios' && <TabEdificios uas={uas} />}
        {activeTab === 'Aulas' && <TabAulas edificios={edificios} />}
        {activeTab === 'Carreras' && <TabCarreras uas={uas} />}
        {activeTab === 'Materias' && <TabMaterias uas={uas} />}
        {activeTab === 'Docentes' && <TabDocentes />}
        {activeTab === 'Comisiones' && <TabComisiones materias={materias} docentes={docentes} />}
      </div>
    </Layout>
  )
}
