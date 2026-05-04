import { useState, useEffect, useRef, useMemo } from 'react'
import { api } from '../../api'

export default function TabDepartamentos({ usuario }) {
  const [departamentos, setDepartamentos] = useState([])
  const [busqueda, setBusqueda]           = useState('')
  const [seleccionado, setSeleccionado]   = useState(null) // null = modo nuevo
  const [nombre, setNombre]               = useState('')
  const [guardando, setGuardando]         = useState(false)
  const [error, setError]                 = useState('')
  const [confirmEliminar, setConfirmEliminar] = useState(false)
  const nombreRef = useRef()

  useEffect(() => { cargar() }, [])
  useEffect(() => { nombreRef.current?.focus() }, [seleccionado])

  const cargar = async () => {
    try {
      const res = await api.listarDepartamentos(usuario.negocio_id)
      setDepartamentos(Array.isArray(res) ? res : [])
    } catch { /* silencioso */ }
  }

  const filtrados = useMemo(() => {
    if (!busqueda) return departamentos
    const q = busqueda.toLowerCase()
    return departamentos.filter(d => d.nombre.toLowerCase().includes(q))
  }, [departamentos, busqueda])

  const seleccionarNuevo = () => {
    setSeleccionado(null)
    setNombre('')
    setError('')
    setConfirmEliminar(false)
  }

  const seleccionarDept = (d) => {
    setSeleccionado(d)
    setNombre(d.nombre)
    setError('')
    setConfirmEliminar(false)
  }

  const guardar = async () => {
    const n = nombre.trim()
    if (!n) { setError('El nombre es requerido'); return }

    setGuardando(true); setError('')
    try {
      if (seleccionado) {
        await api.editarDepartamento(seleccionado.id, { nombre: n })
      } else {
        await api.crearDepartamento({ nombre: n, negocio_id: usuario.negocio_id })
      }
      await cargar()
      seleccionarNuevo()
    } catch(e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  const eliminar = async () => {
    if (!seleccionado) return
    setGuardando(true)
    try {
      await api.eliminarDepartamento(seleccionado.id)
      await cargar()
      seleccionarNuevo()
    } catch(e) {
      setError(e.message)
    } finally {
      setGuardando(false)
      setConfirmEliminar(false)
    }
  }

  const modoNuevo = seleccionado === null

  return (
    <div style={e.shell}>
      {/* ── Panel izquierdo ── */}
      <div style={e.leftPanel}>
        <div style={e.titulo}>DEPARTAMENTOS</div>
        <div style={e.searchWrap}>
          <span style={e.searchIco}>🔍</span>
          <input
            className="pos-input"
            style={e.searchInput}
            placeholder="Buscar ..."
            value={busqueda}
            onChange={ev => setBusqueda(ev.target.value)}
          />
        </div>
        <div style={e.listaHeader}>Departamento</div>
        <div style={e.lista}>
          {/* Fila permanente Sin Departamento */}
          <div
            style={{ ...e.fila, ...(modoNuevo ? e.filaActiva : {}) }}
            onClick={seleccionarNuevo}
          >
            <span style={e.filaIcono}>▶</span>
            <span style={{ color: modoNuevo ? '#fff' : '#555', fontSize: 12 }}>- Sin Departamento -</span>
          </div>
          {filtrados.map(d => {
            const activo = seleccionado?.id === d.id
            return (
              <div key={d.id} style={{ ...e.fila, ...(activo ? e.filaActiva : {}) }}
                onClick={() => seleccionarDept(d)}>
                <span style={{ fontSize: 14, marginRight: 6 }}>📁</span>
                <span style={{ color: activo ? '#fff' : '#1a1a1a', fontSize: 12 }}>{d.nombre}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Panel derecho ── */}
      <div style={e.rightPanel}>
        {/* Toolbar */}
        <div style={e.toolbar}>
          <button className="pos-btn" style={e.btnToolbar} onClick={seleccionarNuevo}>
            <span style={{ marginRight: 4 }}>▤</span> Nuevo Departamento
          </button>
          <button
            className="pos-btn"
            style={{ ...e.btnToolbar, color: seleccionado ? '#c02020' : '#aaa', cursor: seleccionado ? 'pointer' : 'default' }}
            disabled={!seleccionado}
            onClick={() => seleccionado && setConfirmEliminar(true)}
          >
            — Eliminar
          </button>
        </div>

        {/* Formulario */}
        <div style={e.formArea}>
          <div style={modoNuevo ? e.formTituloNuevo : e.formTituloEditar}>
            {modoNuevo ? 'NUEVO DEPARTAMENTO' : `EDITAR: ${seleccionado?.nombre}`}
          </div>

          <div style={e.formFila}>
            <label style={e.label}>Nombre</label>
            <input
              ref={nombreRef}
              className="pos-input"
              style={e.inputNombre}
              value={nombre}
              onChange={ev => { setNombre(ev.target.value); setError('') }}
              onKeyDown={ev => ev.key === 'Enter' && guardar()}
            />
          </div>

          {error && <div style={e.errorMsg}>{error}</div>}

          <div style={e.formBtns}>
            <button className="pos-btn pos-btn-success" style={e.btnGuardar} onClick={guardar} disabled={guardando}>
              {guardando ? 'Guardando...' : 'Guardar Departamento'}
            </button>
            <button className="pos-btn pos-btn-danger" style={e.btnCancelar} onClick={seleccionarNuevo}>
              Cancelar
            </button>
          </div>
        </div>
      </div>

      {/* Modal confirmar eliminar */}
      {confirmEliminar && (
        <div style={e.overlay}>
          <div style={e.modal}>
            <div style={e.modalTitulo}>Eliminar departamento</div>
            <div style={e.modalCuerpo}>
              Eliminar <strong>{seleccionado?.nombre}</strong>?<br />
              Los productos de este departamento quedaran sin departamento.
            </div>
            <div style={e.modalBtns}>
              <button className="pos-btn" onClick={() => setConfirmEliminar(false)}>Cancelar</button>
              <button className="pos-btn pos-btn-danger" onClick={eliminar} disabled={guardando}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const e = {
  shell:          { display: 'flex', flex: 1, overflow: 'hidden', background: '#fff' },
  // izquierdo
  leftPanel:      { width: 260, display: 'flex', flexDirection: 'column', borderRight: '1px solid #d0d0d0', overflow: 'hidden' },
  titulo:         { fontSize: 13, fontWeight: 700, color: '#1e3a5f', padding: '8px 10px', borderBottom: '1px solid #e0e0e0' },
  searchWrap:     { display: 'flex', alignItems: 'center', padding: '6px 8px', borderBottom: '1px solid #e0e0e0', gap: 4 },
  searchIco:      { fontSize: 12, color: '#888' },
  searchInput:    { flex: 1, fontSize: 12, padding: '2px 6px', border: 'none', outline: 'none', background: 'transparent', color: '#1a1a1a' },
  listaHeader:    { fontSize: 11, fontWeight: 700, color: '#555', padding: '4px 10px', background: '#f0f0f0', borderBottom: '1px solid #ddd' },
  lista:          { flex: 1, overflowY: 'auto' },
  fila:           { display: 'flex', alignItems: 'center', padding: '6px 10px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0', gap: 4 },
  filaActiva:     { background: '#3a6bbf' },
  filaIcono:      { fontSize: 9, color: '#fff', marginRight: 2 },
  // derecho
  rightPanel:     { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  toolbar:        { display: 'flex', gap: 4, padding: '8px 12px', borderBottom: '1px solid #e0e0e0', background: '#f9f9f9' },
  btnToolbar:     { fontSize: 12, padding: '4px 12px', background: '#fff', border: '1px solid #bbb', color: '#1a1a1a' },
  formArea:       { padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 },
  formTituloNuevo:{ fontSize: 14, fontWeight: 700, color: '#c8860a' },
  formTituloEditar:{ fontSize: 14, fontWeight: 700, color: '#1e3a5f' },
  formFila:       { display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 360 },
  label:          { fontSize: 12, fontWeight: 700, color: '#333' },
  inputNombre:    { fontSize: 12, padding: '4px 8px', border: '1.5px solid #e8c000', outline: 'none', borderRadius: 3 },
  errorMsg:       { fontSize: 12, color: '#c02020', padding: '4px 8px', background: '#FEF2F2', borderRadius: 3, maxWidth: 360 },
  formBtns:       { display: 'flex', gap: 8 },
  btnGuardar:     { fontSize: 12, padding: '5px 14px' },
  btnCancelar:    { fontSize: 12, padding: '5px 14px' },
  // modal
  overlay:        { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  modal:          { background: '#fff', borderRadius: 4, padding: '20px 24px', width: 340, boxShadow: '0 4px 20px rgba(0,0,0,0.2)' },
  modalTitulo:    { fontSize: 14, fontWeight: 700, marginBottom: 10, color: '#1a1a1a' },
  modalCuerpo:    { fontSize: 13, color: '#444', marginBottom: 16, lineHeight: 1.5 },
  modalBtns:      { display: 'flex', justifyContent: 'flex-end', gap: 8 },
}
