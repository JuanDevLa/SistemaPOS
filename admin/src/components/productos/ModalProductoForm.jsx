import { useState } from 'react'
import { api } from '../../api'

const UNIDADES = ['pieza', 'caja']

const formVacio = {
  codigo_barras: '', nombre: '', descripcion: '',
  precio: '', precio_mayoreo: '', costo: '', margen: '',
  departamento_id: '', unidad: 'pieza', aplica_iva: false, controla_lote: false,
}

const getPctDefault = () => {
  const v = parseFloat(localStorage.getItem('pdv_pct_ganancia'))
  return isNaN(v) ? 20 : v
}

const calcularPrecioDesdeMargen = (costo, margen) => {
  const c = parseFloat(costo), m = parseFloat(margen)
  if (!c || !m || m >= 100) return ''
  return (c / (1 - m / 100)).toFixed(2)
}

const calcularMargenDesdePrecio = (costo, precio) => {
  const c = parseFloat(costo), p = parseFloat(precio)
  if (!c || !p || p <= c) return ''
  return (((p - c) / p) * 100).toFixed(1)
}

const initForm = (producto) => {
  if (!producto) {
    const pct = getPctDefault()
    return { ...formVacio, margen: pct > 0 ? String(pct) : '' }
  }
  return {
    codigo_barras:  producto.codigo_barras  || '',
    nombre:         producto.nombre         || '',
    descripcion:    producto.descripcion    || '',
    precio:         producto.precio         || '',
    precio_mayoreo: producto.precio_mayoreo || '',
    costo:          producto.costo          || '',
    aplica_iva:     producto.aplica_iva     || false,
    controla_lote:  producto.controla_lote  || false,
    departamento_id: producto.departamento_id || '',
    unidad:         producto.unidad         || 'pieza',
    margen: producto.costo && producto.precio
      ? calcularMargenDesdePrecio(producto.costo, producto.precio)
      : '',
  }
}

export default function ModalProductoForm({ producto, departamentos, onSuccess, onClose }) {
  const editandoId = producto?.id || null

  const [form, setForm]             = useState(() => initForm(producto))
  const [guardando, setGuardando]   = useState(false)
  const [error, setError]           = useState('')
  const [pctDefault, setPctDefault] = useState(getPctDefault)
  const [editandoPct, setEditandoPct] = useState(false)
  const [pctInput, setPctInput]     = useState('')

  const handleCampoForm = (campo, valor) => {
    setForm(prev => {
      const next = { ...prev, [campo]: valor }
      if (campo === 'margen' && prev.costo)
        next.precio = calcularPrecioDesdeMargen(prev.costo, valor)
      if (campo === 'costo' && prev.margen)
        next.precio = calcularPrecioDesdeMargen(valor, prev.margen)
      if (campo === 'precio' && prev.costo)
        next.margen = calcularMargenDesdePrecio(prev.costo, valor)
      return next
    })
  }

  const guardarPctDefault = () => {
    const v = parseFloat(pctInput)
    const nuevo = isNaN(v) || v < 0 ? 0 : v
    localStorage.setItem('pdv_pct_ganancia', nuevo)
    setPctDefault(nuevo)
    setEditandoPct(false)
    setPctInput('')
  }

  const handleGuardar = async (e) => {
    e.preventDefault()
    if (!form.nombre.trim()) { setError('El nombre es requerido'); return }
    if (!form.precio || parseFloat(form.precio) <= 0) { setError('Ingresa un precio válido'); return }
    setGuardando(true); setError('')
    const data = {
      codigo_barras:  form.codigo_barras  || null,
      nombre:         form.nombre,
      descripcion:    form.descripcion    || null,
      precio:         parseFloat(form.precio),
      precio_mayoreo: form.precio_mayoreo ? parseFloat(form.precio_mayoreo) : null,
      costo:          form.costo          ? parseFloat(form.costo)          : null,
      departamento_id: form.departamento_id ? parseInt(form.departamento_id) : null,
      unidad:         form.unidad,
      aplica_iva:     form.aplica_iva,
      controla_lote:  form.controla_lote,
    }
    try {
      const res = editandoId
        ? await api.editarProducto(editandoId, data)
        : await api.crearProducto(data)
      if (res?.error) setError(String(res.error))
      else { onSuccess(); onClose() }
    } catch (e) { setError(e.message || 'Error al guardar') }
    setGuardando(false)
  }

  const ganancia = form.costo && form.precio
    ? (parseFloat(form.precio) - parseFloat(form.costo)).toFixed(2)
    : null

  return (
    <div style={s.overlay}>
      <div style={s.modalCard}>
        <h3 style={s.modalTitle}>{editandoId ? 'Editar producto' : 'Nuevo producto'}</h3>

        <form onSubmit={handleGuardar} style={s.formGrid}>
          <div style={s.fieldFull}>
            <label style={s.label}>Nombre *</label>
            <input style={s.input} value={form.nombre} onChange={e => handleCampoForm('nombre', e.target.value)} autoFocus />
          </div>

          <div style={s.field}>
            <label style={s.label}>Código de barras</label>
            <input style={s.input} value={form.codigo_barras} onChange={e => handleCampoForm('codigo_barras', e.target.value)} placeholder="EAN-13 o código interno" />
          </div>

          <div style={s.field}>
            <label style={s.label}>Departamento</label>
            <select style={s.input} value={form.departamento_id} onChange={e => handleCampoForm('departamento_id', e.target.value)}>
              <option value="">Sin departamento</option>
              {departamentos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
            </select>
          </div>

          <div style={s.field}>
            <label style={s.label}>Costo (lo que pagamos)</label>
            <input style={s.input} type="text" inputMode="decimal" value={form.costo}
              onChange={e => handleCampoForm('costo', e.target.value)} placeholder="0.00" />
          </div>

          <div style={s.field}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
              <label style={{ ...s.label, marginBottom: 0 }}>% Ganancia</label>
              {editandoPct ? (
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <input style={{ ...s.input, padding: '2px 6px', width: 56, fontSize: 12 }}
                    type="text" inputMode="decimal" value={pctInput} autoFocus
                    onChange={e => setPctInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') guardarPctDefault(); if (e.key === 'Escape') setEditandoPct(false) }} />
                  <button type="button" style={s.btnOk} onClick={guardarPctDefault}>OK</button>
                  <button type="button" style={s.btnCancelPct} onClick={() => setEditandoPct(false)}>✕</button>
                </div>
              ) : (
                <button type="button" style={s.btnPctDefault}
                  onClick={() => { setPctInput(String(pctDefault)); setEditandoPct(true) }}>
                  {pctDefault > 0 ? `${pctDefault}% por defecto` : 'Sin % por defecto'} · Cambiar
                </button>
              )}
            </div>
            <input style={s.input} type="text" inputMode="decimal" value={form.margen}
              onChange={e => handleCampoForm('margen', e.target.value)} placeholder="Ej: 30" />
          </div>

          <div style={s.field}>
            <label style={s.label}>Precio de venta *</label>
            <input style={{ ...s.input, fontWeight: 700 }} type="text" inputMode="decimal" value={form.precio}
              onChange={e => handleCampoForm('precio', e.target.value)} placeholder="0.00" />
          </div>

          <div style={s.field}>
            <label style={s.label}>Precio mayoreo</label>
            <input style={s.input} type="text" inputMode="decimal" value={form.precio_mayoreo}
              onChange={e => handleCampoForm('precio_mayoreo', e.target.value)} placeholder="0.00 (opcional)" />
          </div>

          {ganancia !== null && (
            <div style={{ ...s.fieldFull, padding: '8px 12px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 6 }}>
              <span style={{ fontSize: 13, color: '#059669' }}>
                Ganancia por unidad: <strong>${ganancia}</strong>
                {form.margen && <span style={{ color: '#6B7280' }}> ({parseFloat(form.margen).toFixed(1)}% de margen)</span>}
              </span>
            </div>
          )}

          <div style={s.field}>
            <label style={s.label}>Unidad de venta</label>
            <select style={s.input} value={form.unidad} onChange={e => handleCampoForm('unidad', e.target.value)}>
              {UNIDADES.map(u => <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>)}
            </select>
          </div>

          <div style={s.field}>
            <label style={s.label}>Descripción</label>
            <input style={s.input} value={form.descripcion} onChange={e => handleCampoForm('descripcion', e.target.value)} placeholder="Opcional" />
          </div>

          <div style={{ ...s.field, display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 20 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.aplica_iva} onChange={e => handleCampoForm('aplica_iva', e.target.checked)} />
              Aplica IVA (16%) — precio incluye IVA
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={form.controla_lote} onChange={e => handleCampoForm('controla_lote', e.target.checked)} />
              Es medicamento (activa control de lote y caducidad)
            </label>
          </div>

          {error && <p style={{ ...s.errorMsg, gridColumn: '1 / -1' }}>{error}</p>}

          <div style={{ ...s.modalFooter, gridColumn: '1 / -1' }}>
            <button type="button" style={s.btnSecondary} onClick={onClose}>Cancelar</button>
            <button type="submit" style={{ ...s.btnPrimary, opacity: guardando ? 0.6 : 1 }} disabled={guardando}>
              {guardando ? 'Guardando...' : (editandoId ? 'Guardar cambios' : 'Crear producto')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const s = {
  overlay:      { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modalCard:    { background: '#FFF', borderRadius: 10, padding: 28, width: 560, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', maxHeight: '90vh', overflow: 'auto' },
  modalTitle:   { fontSize: 18, fontWeight: 700, marginBottom: 20 },
  formGrid:     { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  field:        { display: 'flex', flexDirection: 'column', gap: 5 },
  fieldFull:    { display: 'flex', flexDirection: 'column', gap: 5, gridColumn: '1 / -1' },
  label:        { fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 },
  input:        { padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 14 },
  errorMsg:     { color: '#DC2626', fontSize: 13 },
  modalFooter:  { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
  btnPrimary:   { padding: '9px 18px', background: '#1E3A5F', color: '#FFF', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnSecondary: { padding: '9px 18px', background: '#FFF', color: '#374151', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 14, cursor: 'pointer' },
  btnOk:        { fontSize: 11, padding: '2px 6px', background: '#1E3A5F', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' },
  btnCancelPct: { fontSize: 11, padding: '2px 6px', background: '#F3F4F6', color: '#374151', border: '1px solid #D1D5DB', borderRadius: 4, cursor: 'pointer' },
  btnPctDefault:{ fontSize: 11, padding: '2px 8px', background: '#F3F4F6', color: '#374151', border: '1px solid #D1D5DB', borderRadius: 4, cursor: 'pointer' },
}
