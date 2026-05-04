import { useState, useEffect } from 'react'
import { api } from '../api'

export default function UnidadesSection({ onBack }) {
  const [unidades, setUnidades]     = useState([])
  const [cargando, setCargando]     = useState(true)
  const [modal, setModal]           = useState(false)
  const [editando, setEditando]     = useState(null)
  const [form, setForm]             = useState({ clave: '', nombre: '' })
  const [guardando, setGuardando]   = useState(false)
  const [error, setError]           = useState('')
  const [confirmElim, setConfirmElim] = useState(null)

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    setCargando(true)
    try {
      const res = await api.listarUnidades()
      setUnidades(Array.isArray(res) ? res : [])
    } catch { setUnidades([]) }
    setCargando(false)
  }

  const abrirNuevo = () => {
    setForm({ clave: '', nombre: '' }); setEditando(null); setError(''); setModal(true)
  }

  const abrirEditar = (u) => {
    setForm({ clave: u.clave, nombre: u.nombre }); setEditando(u); setError(''); setModal(true)
  }

  const cerrar = () => { setModal(false); setEditando(null); setError('') }

  const handleGuardar = async (e) => {
    e.preventDefault()
    if (!form.clave.trim() || !form.nombre.trim()) { setError('Clave y nombre son requeridos'); return }
    setGuardando(true)
    try {
      const res = editando
        ? await api.editarUnidad(editando.id, form)
        : await api.crearUnidad(form)
      if (res.error) { setError(res.error) }
      else { cerrar(); cargar() }
    } catch (err) { setError(err.message) }
    setGuardando(false)
  }

  const handleEliminar = async (id) => {
    try {
      await api.eliminarUnidad(id)
      setConfirmElim(null); cargar()
    } catch (err) { alert(err.message) }
  }

  return (
    <div>
      <div style={s.header}>
        <button style={s.btnBack} onClick={onBack}>← Volver</button>
        <div>
          <h2 style={s.titulo}>Unidades de medida</h2>
          <p style={s.sub}>{unidades.length} unidades</p>
        </div>
        <button style={s.btnPrimary} onClick={abrirNuevo}>+ Nueva unidad</button>
      </div>

      {cargando ? (
        <p style={{ color: '#6B7280', padding: 20 }}>Cargando...</p>
      ) : (
        <div className="tbl-wrap">
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Clave</th>
                <th style={s.th}>Nombre</th>
                <th style={s.th}>Estado</th>
                <th style={s.th}></th>
              </tr>
            </thead>
            <tbody>
              {unidades.map(u => (
                <tr key={u.id} style={s.tr}>
                  <td style={s.td}><code style={s.code}>{u.clave}</code></td>
                  <td style={s.td}>{u.nombre}</td>
                  <td style={s.td}>
                    <span style={{ ...s.badge, background: u.activo ? '#D1FAE5' : '#F3F4F6', color: u.activo ? '#065F46' : '#6B7280' }}>
                      {u.activo ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td style={{ ...s.td, textAlign: 'right' }}>
                    <button style={s.btnIcon} onClick={() => abrirEditar(u)} title="Editar">✏️</button>
                    <button style={s.btnIcon} onClick={() => setConfirmElim(u)} title="Eliminar">🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div style={s.overlay}>
          <div style={s.modalCard}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>{editando ? 'Editar unidad' : 'Nueva unidad'}</h3>
              <button style={s.btnCerrar} onClick={cerrar}>✕</button>
            </div>
            <form onSubmit={handleGuardar}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={s.label}>Clave *</label>
                  <input style={{ ...s.input, width: 120, textTransform: 'uppercase' }} value={form.clave}
                    onChange={e => setForm(f => ({ ...f, clave: e.target.value.toUpperCase() }))}
                    maxLength={10} placeholder="PZA" autoFocus />
                  <p style={{ fontSize: 11, color: '#9CA3AF', margin: '4px 0 0' }}>Máximo 10 caracteres, mayúsculas</p>
                </div>
                <div>
                  <label style={s.label}>Nombre *</label>
                  <input style={s.input} value={form.nombre}
                    onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                    maxLength={50} placeholder="Pieza" />
                </div>
              </div>
              {error && <p style={s.errorMsg}>{error}</p>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button type="button" style={s.btnSecondary} onClick={cerrar}>Cancelar</button>
                <button type="submit" style={s.btnPrimary} disabled={guardando}>
                  {guardando ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmElim && (
        <div style={s.overlay}>
          <div style={{ ...s.modalCard, width: 360 }}>
            <h3 style={{ ...s.modalTitle, marginBottom: 12 }}>Eliminar unidad</h3>
            <p style={{ fontSize: 14, color: '#374151', marginBottom: 20 }}>
              ¿Eliminar <strong>{confirmElim.nombre}</strong> ({confirmElim.clave})?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button style={s.btnSecondary} onClick={() => setConfirmElim(null)}>Cancelar</button>
              <button style={{ ...s.btnPrimary, background: '#DC2626' }} onClick={() => handleEliminar(confirmElim.id)}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  header:     { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 },
  btnBack:    { background: 'none', border: '1px solid #D1D5DB', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 13, color: '#374151' },
  titulo:     { fontSize: 22, fontWeight: 700, margin: 0 },
  sub:        { fontSize: 13, color: '#6B7280', margin: '2px 0 0' },
  btnPrimary: { padding: '8px 18px', background: '#1E3A5F', color: '#FFF', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', marginLeft: 'auto' },
  btnSecondary: { padding: '8px 18px', background: '#FFF', color: '#374151', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 13, cursor: 'pointer' },
  table:      { width: '100%', borderCollapse: 'collapse' },
  th:         { padding: '10px 12px', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' },
  tr:         { borderBottom: '1px solid #F3F4F6' },
  td:         { padding: '12px', fontSize: 14, color: '#1F2937' },
  code:       { background: '#F3F4F6', padding: '2px 6px', borderRadius: 4, fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: '#1E3A5F' },
  badge:      { padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600 },
  btnIcon:    { background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: '2px 4px' },
  overlay:    { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modalCard:  { background: '#FFF', borderRadius: 10, padding: 28, width: 420, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' },
  modalHeader:{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 700, margin: 0 },
  btnCerrar:  { background: 'none', border: 'none', fontSize: 18, color: '#9CA3AF', cursor: 'pointer' },
  label:      { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 },
  input:      { width: '100%', padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' },
  errorMsg:   { fontSize: 12, color: '#DC2626', marginTop: 8 },
}
