import { useState, useEffect } from 'react'
import { api } from '../api'

export default function NegociosSection({ onBack }) {
  const [negocios, setNegocios]     = useState([])
  const [cargando, setCargando]     = useState(true)
  const [modal, setModal]           = useState(false)
  const [editando, setEditando]     = useState(null)
  const [form, setForm]             = useState({ nombre: '', direccion: '', rfc: '' })
  const [guardando, setGuardando]   = useState(false)
  const [error, setError]           = useState('')
  const [confirmElim, setConfirmElim] = useState(null)

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    setCargando(true)
    try {
      const res = await api.listarNegocios()
      setNegocios(Array.isArray(res) ? res : [])
    } catch { setNegocios([]) }
    setCargando(false)
  }

  const abrirNuevo = () => {
    setForm({ nombre: '', direccion: '', rfc: '' })
    setEditando(null); setError(''); setModal(true)
  }

  const abrirEditar = (n) => {
    setForm({ nombre: n.nombre, direccion: n.direccion || '', rfc: n.rfc || '' })
    setEditando(n); setError(''); setModal(true)
  }

  const cerrar = () => { setModal(false); setEditando(null); setError('') }

  const handleGuardar = async (e) => {
    e.preventDefault()
    if (!form.nombre.trim()) { setError('El nombre es requerido'); return }
    setGuardando(true)
    try {
      const res = editando
        ? await api.actualizarNegocio(editando.id, form)
        : await api.crearNegocio(form)
      if (res.error) { setError(res.error) }
      else { cerrar(); cargar() }
    } catch (err) { setError(err.message) }
    setGuardando(false)
  }

  const handleEliminar = async (id) => {
    try {
      const res = await api.eliminarNegocio(id)
      if (res.error) alert(res.error)
      else { setConfirmElim(null); cargar() }
    } catch (err) { alert(err.message) }
  }

  const toggleActivo = async (n) => {
    try { await api.actualizarNegocio(n.id, { activo: !n.activo }); cargar() }
    catch (err) { alert(err.message) }
  }

  return (
    <div>
      <div style={s.header}>
        <button style={s.btnBack} onClick={onBack}>← Volver</button>
        <div>
          <h2 style={s.titulo}>Negocios</h2>
          <p style={s.sub}>{negocios.length} negocio{negocios.length !== 1 ? 's' : ''}</p>
        </div>
        <button style={s.btnPrimary} onClick={abrirNuevo}>+ Nuevo negocio</button>
      </div>

      {cargando ? (
        <p style={{ color: '#6B7280', padding: 20 }}>Cargando...</p>
      ) : negocios.length === 0 ? (
        <div style={s.empty}>No hay negocios registrados.</div>
      ) : (
        <div className="tbl-wrap">
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Nombre</th>
                <th style={s.th}>Dirección</th>
                <th style={s.th}>RFC</th>
                <th style={s.th}>Estado</th>
                <th style={s.th}></th>
              </tr>
            </thead>
            <tbody>
              {negocios.map(n => (
                <tr key={n.id} style={s.tr}>
                  <td style={s.td}><strong>{n.nombre}</strong></td>
                  <td style={s.td}>{n.direccion || <span style={{ color: '#9CA3AF' }}>—</span>}</td>
                  <td style={s.td}>{n.rfc || <span style={{ color: '#9CA3AF' }}>—</span>}</td>
                  <td style={s.td}>
                    <span style={{ ...s.badge, background: n.activo ? '#D1FAE5' : '#FEE2E2', color: n.activo ? '#065F46' : '#991B1B' }}>
                      {n.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td style={{ ...s.td, textAlign: 'right' }}>
                    <button style={s.btnIcon} onClick={() => abrirEditar(n)} title="Editar">✏️</button>
                    <button style={s.btnIcon} onClick={() => toggleActivo(n)} title={n.activo ? 'Desactivar' : 'Activar'}>
                      {n.activo ? '🔴' : '🟢'}
                    </button>
                    <button style={s.btnIcon} onClick={() => setConfirmElim(n)} title="Eliminar">🗑️</button>
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
              <h3 style={s.modalTitle}>{editando ? 'Editar negocio' : 'Nuevo negocio'}</h3>
              <button style={s.btnCerrar} onClick={cerrar}>✕</button>
            </div>
            <form onSubmit={handleGuardar}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={s.label}>Nombre *</label>
                  <input style={s.input} value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} autoFocus maxLength={100} />
                </div>
                <div>
                  <label style={s.label}>Dirección</label>
                  <input style={s.input} value={form.direccion} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))} maxLength={200} />
                </div>
                <div>
                  <label style={s.label}>RFC</label>
                  <input style={s.input} value={form.rfc} onChange={e => setForm(f => ({ ...f, rfc: e.target.value.toUpperCase() }))} maxLength={13} placeholder="XAXX010101000" />
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
          <div style={{ ...s.modalCard, width: 380 }}>
            <h3 style={{ ...s.modalTitle, marginBottom: 12 }}>Eliminar negocio</h3>
            <p style={{ fontSize: 14, color: '#374151', marginBottom: 20 }}>
              ¿Eliminar <strong>{confirmElim.nombre}</strong>? Esta acción no se puede deshacer.
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
  badge:      { padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600 },
  btnIcon:    { background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: '2px 4px' },
  empty:      { padding: 32, textAlign: 'center', color: '#6B7280', background: '#F9FAFB', borderRadius: 8 },
  overlay:    { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modalCard:  { background: '#FFF', borderRadius: 10, padding: 28, width: 500, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' },
  modalHeader:{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 700, margin: 0 },
  btnCerrar:  { background: 'none', border: 'none', fontSize: 18, color: '#9CA3AF', cursor: 'pointer' },
  label:      { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 },
  input:      { width: '100%', padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' },
  errorMsg:   { fontSize: 12, color: '#DC2626', marginTop: 8 },
}
