import { useState, useEffect } from 'react'
import { api } from '../../api'

const formVacio = { nombre: '', contacto: '', telefono: '', email: '', notas: '' }

export default function TabProveedores() {
  const [proveedores, setProveedores] = useState([])
  const [form, setForm]               = useState(formVacio)
  const [editandoId, setEditandoId]   = useState(null)
  const [guardando, setGuardando]     = useState(false)
  const [error, setError]             = useState('')
  const [confirmando, setConfirmando] = useState(null)

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    try {
      const res = await api.listarProveedores()
      setProveedores(Array.isArray(res) ? res : [])
    } catch { setProveedores([]) }
  }

  const editar = (p) => {
    setForm({ nombre: p.nombre, contacto: p.contacto || '', telefono: p.telefono || '', email: p.email || '', notas: p.notas || '' })
    setEditandoId(p.id); setError('')
  }

  const cancelar = () => { setForm(formVacio); setEditandoId(null); setError('') }

  const guardar = async () => {
    if (!form.nombre.trim()) { setError('El nombre es requerido'); return }
    setGuardando(true); setError('')
    try {
      const res = editandoId
        ? await api.editarProveedor(editandoId, form)
        : await api.crearProveedor(form)
      cancelar(); cargar()
    } catch(e) { setError(e.message) }
    finally { setGuardando(false) }
  }

  const set = (campo, valor) => { setError(''); setForm(prev => ({ ...prev, [campo]: valor })) }

  return (
    <div style={e.shell}>
      {/* Lista */}
      <div style={e.leftPanel}>
        <div className="panel-header">CATALOGO DE PROVEEDORES</div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          {proveedores.length === 0 ? (
            <p style={e.vacio}>No hay proveedores. Agrega el primero.</p>
          ) : proveedores.map(p => (
            <div key={p.id}
              style={{ ...e.itemRow, ...(editandoId === p.id ? e.itemRowActivo : {}) }}
              onClick={() => editar(p)}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#1a1a1a' }}>{p.nombre}</div>
                <div style={{ fontSize: 11, color: '#888' }}>
                  {[p.telefono, p.contacto].filter(Boolean).join(' · ') || 'Sin datos de contacto'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Formulario */}
      <div style={e.rightPanel}>
        <div className="panel-header">{editandoId ? 'EDITAR PROVEEDOR' : 'NUEVO PROVEEDOR'}</div>
        <div style={e.panelBody}>
          {[
            ['nombre',   'Nombre *',  'text',  'Ej: Coca Cola FEMSA'],
            ['contacto', 'Contacto',  'text',  'Nombre del vendedor'],
            ['telefono', 'Telefono',  'tel',   ''],
            ['email',    'Email',     'email', ''],
          ].map(([campo, lbl, tipo, ph]) => (
            <div key={campo} style={e.field}>
              <label style={e.label}>{lbl}</label>
              <input className="pos-input" style={{ width: '100%' }} type={tipo} placeholder={ph}
                value={form[campo]} onChange={ev => set(campo, ev.target.value)} />
            </div>
          ))}
          <div style={e.field}>
            <label style={e.label}>Notas</label>
            <input className="pos-input" style={{ width: '100%' }} placeholder="Dias de visita, condiciones, etc."
              value={form.notas} onChange={ev => set('notas', ev.target.value)} />
          </div>
          {error && <p style={{ color: '#c02020', fontSize: 12 }}>{error}</p>}
        </div>
        <div style={e.panelFooter}>
          {editandoId && (
            <button className="pos-btn pos-btn-danger" style={{ marginRight: 'auto' }}
              onClick={() => setConfirmando(proveedores.find(p => p.id === editandoId))}>
              Eliminar
            </button>
          )}
          <button className="pos-btn" onClick={cancelar}>Cancelar</button>
          <button className="pos-btn pos-btn-success" onClick={guardar} disabled={guardando}>
            {guardando ? 'Guardando...' : editandoId ? 'Guardar Cambios' : 'Agregar Proveedor'}
          </button>
        </div>
      </div>

      {confirmando && (
        <div style={e.overlay}>
          <div style={e.modal}>
            <p style={{ fontWeight: 700, marginBottom: 10, color: '#1a1a1a' }}>Eliminar proveedor</p>
            <p style={{ fontSize: 13, color: '#374151', marginBottom: 20 }}>
              Eliminar <strong>{confirmando.nombre}</strong>? El historial de entradas se conserva.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="pos-btn" onClick={() => setConfirmando(null)}>Cancelar</button>
              <button className="pos-btn pos-btn-danger" onClick={async () => {
                await api.eliminarProveedor(confirmando.id)
                setConfirmando(null); cancelar(); cargar()
              }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const e = {
  shell:        { display: 'flex', flex: 1, overflow: 'hidden' },
  leftPanel:    { flex: 1, display: 'flex', flexDirection: 'column', borderRight: '2px solid #d0d0d0', overflow: 'hidden' },
  rightPanel:   { width: 340, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  panelBody:    { flex: 1, overflow: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 },
  panelFooter:  { padding: '10px 14px', borderTop: '2px solid #e0e0e0', display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' },
  field:        { display: 'flex', flexDirection: 'column', gap: 4 },
  label:        { fontSize: 12, fontWeight: 700, color: '#555' },
  itemRow:      { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderBottom: '1px solid #ebebeb', cursor: 'pointer' },
  itemRowActivo:{ background: '#EFF6FF', borderLeft: '3px solid #1E3A5F' },
  vacio:        { color: '#bbb', textAlign: 'center', marginTop: 30, fontSize: 13 },
  overlay:      { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  modal:        { background: '#fff', borderRadius: 6, padding: 20, width: 360, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' },
}
