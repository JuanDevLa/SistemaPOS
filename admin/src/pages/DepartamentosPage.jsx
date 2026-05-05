import { useState, useEffect } from 'react'
import { api } from '../api'

export default function DepartamentosPage() {
  const [departamentos, setDepartamentos] = useState([])
  const [cargando, setCargando]           = useState(true)
  const [modal, setModal]                 = useState(false)
  const [nombre, setNombre]               = useState('')
  const [editandoId, setEditandoId]       = useState(null)
  const [guardando, setGuardando]         = useState(false)
  const [error, setError]                 = useState('')
  const [confirmEliminar, setConfirmEliminar] = useState(null)

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    setCargando(true)
    try {
      const res = await api.listarDepartamentos()
      setDepartamentos(Array.isArray(res) ? res : [])
    } catch {
      setDepartamentos([])
    }
    setCargando(false)
  }

  const abrirNuevo = () => {
    setNombre(''); setEditandoId(null); setError(''); setModal(true)
  }

  const abrirEditar = (d) => {
    setNombre(d.nombre); setEditandoId(d.id); setError(''); setModal(true)
  }

  const cerrar = () => {
    setModal(false); setNombre(''); setEditandoId(null); setError('')
  }

  const handleGuardar = async (e) => {
    e.preventDefault()
    if (!nombre.trim()) { setError('El nombre es requerido'); return }
    setGuardando(true)
    const res = editandoId
      ? await api.editarDepartamento(editandoId, { nombre })
      : await api.crearDepartamento({ nombre })
    setGuardando(false)
    if (res.error) { setError(res.error) }
    else { cerrar(); cargar() }
  }

  const handleEliminar = async (id) => {
    await api.eliminarDepartamento(id)
    setConfirmEliminar(null)
    cargar()
  }

  return (
    <div>
      <div style={s.pageHeader}>
        <div>
          <h2 style={s.pageTitle}>Departamentos</h2>
          <p style={s.pageSub}>{departamentos.length} departamentos</p>
        </div>
        <button style={s.btnPrimary} onClick={abrirNuevo}>+ Nuevo departamento</button>
      </div>

      {cargando ? (
        <p style={{ color: '#6B7280', padding: 20 }}>Cargando...</p>
      ) : departamentos.length === 0 ? (
        <div style={s.empty}>No hay departamentos. Crea el primero para organizar tus productos.</div>
      ) : (
        <div className="tbl-wrap">
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Nombre</th>
                <th style={s.th}></th>
              </tr>
            </thead>
            <tbody>
              {departamentos.map(d => (
                <tr key={d.id} style={s.tr}>
                  <td style={s.td}>{d.nombre}</td>
                  <td style={{ ...s.td, textAlign: 'right' }}>
                    <div style={s.actions}>
                      <button style={s.btnEdit} onClick={() => abrirEditar(d)}>Editar</button>
                      <button style={s.btnDelete} onClick={() => setConfirmEliminar(d)}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div style={s.overlay}>
          <div style={{ ...s.modalCard, width: 380 }}>
            <h3 style={s.modalTitle}>{editandoId ? 'Editar departamento' : 'Nuevo departamento'}</h3>
            <form onSubmit={handleGuardar}>
              <label style={s.label}>Nombre</label>
              <input style={s.input} value={nombre} onChange={e => setNombre(e.target.value)} autoFocus placeholder="Ej: Medicamentos, Bebidas..." />
              {error && <p style={s.errorMsg}>{error}</p>}
              <div style={s.modalFooter}>
                <button type="button" style={s.btnSecondary} onClick={cerrar}>Cancelar</button>
                <button type="submit" style={{ ...s.btnPrimary, opacity: guardando ? 0.6 : 1 }} disabled={guardando}>
                  {guardando ? 'Guardando...' : (editandoId ? 'Guardar' : 'Crear')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmEliminar && (
        <div style={s.overlay}>
          <div style={{ ...s.modalCard, width: 360 }}>
            <h3 style={s.modalTitle}>Eliminar departamento</h3>
            <p style={{ color: '#374151', marginBottom: 20 }}>
              ¿Eliminar <strong>{confirmEliminar.nombre}</strong>? Los productos que lo usen quedarán sin departamento.
            </p>
            <div style={s.modalFooter}>
              <button style={s.btnSecondary} onClick={() => setConfirmEliminar(null)}>Cancelar</button>
              <button style={{ ...s.btnPrimary, background: '#DC2626' }} onClick={() => handleEliminar(confirmEliminar.id)}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  pageHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  negocioTabs: { display: 'flex', gap: 4, marginBottom: 20 },
  tabBtn:      { padding: '7px 16px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 13, background: '#FFF', color: '#374151', cursor: 'pointer' },
  tabBtnActive:{ background: '#1E3A5F', color: '#FFF', border: '1px solid #1E3A5F' },
  pageTitle:   { fontSize: 22, fontWeight: 700 },
  pageSub:     { color: '#6B7280', fontSize: 13, marginTop: 2 },
  btnPrimary:  { padding: '9px 18px', background: '#1E3A5F', color: '#FFF', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnSecondary:{ padding: '9px 18px', background: '#FFF', color: '#374151', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 14, cursor: 'pointer' },
  empty:       { padding: 40, textAlign: 'center', color: '#9CA3AF', background: '#FFF', borderRadius: 8, border: '1px solid #E5E7EB' },
  tableWrap:   { background: '#FFF', borderRadius: 8, border: '1px solid #E5E7EB', overflow: 'hidden' },
  table:       { width: '100%', borderCollapse: 'collapse' },
  th:          { padding: '10px 14px', background: '#F9FAFB', fontSize: 12, fontWeight: 600, color: '#6B7280', textAlign: 'left', borderBottom: '1px solid #E5E7EB' },
  tr:          { borderBottom: '1px solid #F3F4F6' },
  td:          { padding: '10px 14px', fontSize: 14, verticalAlign: 'middle' },
  actions:     { display: 'flex', gap: 6, justifyContent: 'flex-end' },
  btnEdit:     { padding: '4px 10px', background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', borderRadius: 4, fontSize: 12, cursor: 'pointer' },
  btnDelete:   { padding: '4px 10px', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 4, fontSize: 12, cursor: 'pointer' },
  overlay:     { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modalCard:   { background: '#FFF', borderRadius: 10, padding: 28, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' },
  modalTitle:  { fontSize: 18, fontWeight: 700, marginBottom: 20 },
  label:       { fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 },
  input:       { width: '100%', padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 14, boxSizing: 'border-box', marginBottom: 12 },
  errorMsg:    { color: '#DC2626', fontSize: 13, marginBottom: 10 },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
}
