import { useState, useEffect } from 'react'
import { api } from '../../api'

const UNIDADES = [
  { value: 'pieza',  label: 'Por Unidad/Pza' },
  { value: 'granel', label: 'A Granel (decimales)' },
  { value: 'caja',   label: 'Como paquete (kit)' },
]

const formVacio = {
  codigo_barras: '', nombre: '', descripcion: '',
  precio: '', precio_mayoreo: '', costo: '', margen: '',
  departamento_id: '', unidad: 'pieza', aplica_iva: false, controla_lote: false,
  usa_inventario: true, hay: '', minimo: '', maximo: '',
  lote: '', fecha_caducidad: '',
}

const getPctDefault = () => {
  const v = parseFloat(localStorage.getItem('pdv_pct_ganancia'))
  return isNaN(v) ? 20 : v
}

const calcPrecio = (costo, margen) => {
  const c = parseFloat(costo), m = parseFloat(margen)
  if (!c || !m || m >= 100) return ''
  return (c / (1 - m / 100)).toFixed(2)
}

const calcMargen = (costo, precio) => {
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
    codigo_barras:   producto.codigo_barras   || '',
    nombre:          producto.nombre          || '',
    descripcion:     producto.descripcion     || '',
    precio:          producto.precio          || '',
    precio_mayoreo:  producto.precio_mayoreo  || '',
    costo:           producto.costo           || '',
    aplica_iva:      producto.aplica_iva      || false,
    controla_lote:   producto.controla_lote   || false,
    departamento_id: producto.departamento_id || '',
    unidad:          producto.unidad          || 'pieza',
    margen: producto.costo && producto.precio
      ? calcMargen(producto.costo, producto.precio)
      : '',
    usa_inventario: true, hay: '', minimo: '', maximo: '',
    lote: '', fecha_caducidad: '',
  }
}

export default function ModalProductoForm({ producto, departamentos, negocioId, onSuccess, onClose }) {
  const editandoId = producto?.id || null

  const [form, setForm]               = useState(() => initForm(producto))
  const [guardando, setGuardando]     = useState(false)
  const [error, setError]             = useState('')
  const [pctDefault, setPctDefault]   = useState(getPctDefault)
  const [editandoPct, setEditandoPct] = useState(false)
  const [pctInput, setPctInput]       = useState('')
  const [exitoMsg, setExitoMsg]       = useState('')
  const [cuenta, setCuenta]           = useState(0)

  useEffect(() => {
    if (!exitoMsg) return
    if (cuenta <= 0) {
      setForm(initForm(null))
      setExitoMsg('')
      setError('')
      return
    }
    const t = setTimeout(() => setCuenta(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [exitoMsg, cuenta])

  const set = (campo, valor) => {
    setForm(prev => {
      const next = { ...prev, [campo]: valor }
      if (campo === 'margen' && prev.costo)  next.precio = calcPrecio(prev.costo, valor)
      if (campo === 'costo'  && prev.margen) next.precio = calcPrecio(valor, prev.margen)
      if (campo === 'precio' && prev.costo)  next.margen = calcMargen(prev.costo, valor)
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
    try {
      const data = {
        codigo_barras:   form.codigo_barras  || null,
        nombre:          form.nombre.trim(),
        descripcion:     form.descripcion    || null,
        precio:          parseFloat(form.precio),
        precio_mayoreo:  form.precio_mayoreo ? parseFloat(form.precio_mayoreo) : null,
        costo:           form.costo          ? parseFloat(form.costo)          : null,
        departamento_id: form.departamento_id ? parseInt(form.departamento_id) : null,
        unidad:          form.unidad,
        aplica_iva:      form.aplica_iva,
        controla_lote:   form.controla_lote,
        negocio_id:      negocioId,
      }

      const res = editandoId
        ? await api.editarProducto(editandoId, data)
        : await api.crearProducto(data)
      if (res?.error) { setError(String(res.error)); setGuardando(false); return }

      if (!editandoId && form.usa_inventario) {
        await api.ajustarInventario({
          producto_id:   res.id,
          negocio_id:    negocioId,
          cantidad:      parseFloat(form.hay)    || 0,
          alerta_minima: parseFloat(form.minimo) || 0,
          maximo:        parseFloat(form.maximo) || 0,
          notas:         'Stock inicial al crear producto',
        })

        if (form.controla_lote && form.lote.trim()) {
          await api.crearLoteInicial({
            producto_id:     res.id,
            negocio_id:      negocioId,
            lote:            form.lote.trim(),
            fecha_caducidad: form.fecha_caducidad || null,
            cantidad:        parseFloat(form.hay) || 0,
          })
        }
      }

      onSuccess()
      if (editandoId) {
        onClose()
      } else {
        setExitoMsg(`"${form.nombre.trim()}" creado correctamente`)
        setCuenta(3)
      }
    } catch (err) {
      setError(err.message || 'Error al guardar')
    }
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
            <input style={s.input} value={form.nombre}
              onChange={e => set('nombre', e.target.value)} autoFocus />
          </div>

          <div style={s.field}>
            <label style={s.label}>Código de barras</label>
            <input style={s.input} value={form.codigo_barras}
              onChange={e => set('codigo_barras', e.target.value)} placeholder="EAN-13 o código interno" />
          </div>

          <div style={s.field}>
            <label style={s.label}>Departamento</label>
            <select style={s.input} value={form.departamento_id}
              onChange={e => set('departamento_id', e.target.value)}>
              <option value="">Sin departamento</option>
              {departamentos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
            </select>
          </div>

          <div style={s.field}>
            <label style={s.label}>Costo (lo que pagamos)</label>
            <input style={s.input} type="text" inputMode="decimal" value={form.costo}
              onChange={e => set('costo', e.target.value)} placeholder="0.00" />
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
                  <button type="button" style={s.btnCancelPct} onClick={() => setEditandoPct(false)}>X</button>
                </div>
              ) : (
                <button type="button" style={s.btnPctDefault}
                  onClick={() => { setPctInput(String(pctDefault)); setEditandoPct(true) }}>
                  {pctDefault > 0 ? `${pctDefault}% por defecto` : 'Sin % por defecto'} · Cambiar
                </button>
              )}
            </div>
            <input style={s.input} type="text" inputMode="decimal" value={form.margen}
              onChange={e => set('margen', e.target.value)} placeholder="Ej: 30" />
          </div>

          <div style={s.field}>
            <label style={s.label}>Precio de venta *</label>
            <input style={{ ...s.input, fontWeight: 700 }} type="text" inputMode="decimal" value={form.precio}
              onChange={e => set('precio', e.target.value)} placeholder="0.00" />
          </div>

          <div style={s.field}>
            <label style={s.label}>Precio mayoreo</label>
            <input style={s.input} type="text" inputMode="decimal" value={form.precio_mayoreo}
              onChange={e => set('precio_mayoreo', e.target.value)} placeholder="0.00 (opcional)" />
          </div>

          {ganancia !== null && (
            <div style={{ ...s.fieldFull, padding: '8px 12px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 6 }}>
              <span style={{ fontSize: 13, color: '#059669' }}>
                Ganancia por unidad: <strong>${ganancia}</strong>
                {form.margen && <span style={{ color: '#6B7280' }}> ({parseFloat(form.margen).toFixed(1)}% de margen)</span>}
              </span>
            </div>
          )}

          <div style={s.fieldFull}>
            <label style={s.label}>Se vende</label>
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
              {UNIDADES.map(u => (
                <label key={u.value} style={s.radioLabel}>
                  <input type="radio" name="unidad" value={u.value}
                    checked={form.unidad === u.value}
                    onChange={() => set('unidad', u.value)} />
                  {u.label}
                </label>
              ))}
            </div>
          </div>

          <div style={s.field}>
            <label style={s.label}>Descripción</label>
            <input style={s.input} value={form.descripcion}
              onChange={e => set('descripcion', e.target.value)} placeholder="Opcional" />
          </div>

          <div style={{ ...s.field, gap: 10 }}>
            <label style={s.checkLabel}>
              <input type="checkbox" checked={form.aplica_iva}
                onChange={e => set('aplica_iva', e.target.checked)} />
              Aplica IVA (16%)
            </label>
            <label style={s.checkLabel}>
              <input type="checkbox" checked={form.controla_lote}
                onChange={e => set('controla_lote', e.target.checked)} />
              Es medicamento (controla lote y caducidad)
            </label>
          </div>

          {/* Seccion inventario — solo al crear */}
          {!editandoId && (
            <div style={s.invSeccion}>
              <div style={s.invBarra}><span style={s.invBarraLabel}>Inventario</span></div>
              <div style={s.invCuerpo}>
                <label style={s.checkLabel}>
                  <input type="checkbox" checked={form.usa_inventario}
                    onChange={e => set('usa_inventario', e.target.checked)} />
                  <strong>Este producto controla inventario</strong>
                </label>

                {form.usa_inventario && (
                  <>
                    <div style={s.invFila}>
                      <label style={s.invLabel}>Cantidad actual</label>
                      <input style={{ ...s.input, width: 100 }} type="number" min="0" step="1" placeholder="0"
                        value={form.hay} onChange={e => set('hay', e.target.value)} />
                      <span style={{ fontSize: 12, color: '#6B7280' }}>unidades en este momento</span>
                    </div>
                    <div style={s.invFila}>
                      <label style={{ ...s.invLabel, color: '#DC2626', fontWeight: 700 }}>Minimo para pedir</label>
                      <input style={{ ...s.input, width: 100, borderColor: '#DC2626' }} type="number" min="0" step="1" placeholder="0"
                        value={form.minimo} onChange={e => set('minimo', e.target.value)} />
                      <span style={{ fontSize: 12, color: '#DC2626' }}>unidades</span>
                    </div>
                    <div style={s.invFila}>
                      <label style={s.invLabel}>Maximo (opcional)</label>
                      <input style={{ ...s.input, width: 100 }} type="number" min="0" step="1" placeholder="0"
                        value={form.maximo} onChange={e => set('maximo', e.target.value)} />
                    </div>
                  </>
                )}

                {form.controla_lote && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #F59E0B', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={s.invFila}>
                      <label style={s.invLabel}>Lote</label>
                      <input style={{ ...s.input, width: 180 }} placeholder="Ej. ABC-2025"
                        value={form.lote} onChange={e => set('lote', e.target.value)} />
                    </div>
                    <div style={s.invFila}>
                      <label style={s.invLabel}>Caducidad</label>
                      <input style={{ ...s.input, width: 160 }} type="date"
                        value={form.fecha_caducidad} onChange={e => set('fecha_caducidad', e.target.value)} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {exitoMsg && (
            <div style={{ ...s.exitoBanner, gridColumn: '1 / -1' }}>
              <span style={{ fontWeight: 600 }}>{exitoMsg}</span>
              <span style={{ color: '#059669', fontSize: 13 }}>Limpiando formulario en {cuenta}s...</span>
              <button type="button" style={s.btnCrearOtro}
                onClick={() => { setForm(initForm(null)); setExitoMsg(''); setCuenta(0); setError('') }}>
                Crear otro ahora
              </button>
            </div>
          )}

          {error && <p style={{ ...s.errorMsg, gridColumn: '1 / -1' }}>{error}</p>}

          <div style={{ ...s.modalFooter, gridColumn: '1 / -1' }}>
            <button type="button" style={s.btnSecondary} onClick={onClose}>Cerrar</button>
            <button type="submit" style={{ ...s.btnPrimary, opacity: (guardando || exitoMsg) ? 0.6 : 1 }} disabled={guardando || !!exitoMsg}>
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
  modalCard:    { background: '#FFF', borderRadius: 10, padding: 28, width: 600, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', maxHeight: '92vh', overflow: 'auto' },
  modalTitle:   { fontSize: 18, fontWeight: 700, marginBottom: 20 },
  formGrid:     { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  field:        { display: 'flex', flexDirection: 'column', gap: 5 },
  fieldFull:    { display: 'flex', flexDirection: 'column', gap: 5, gridColumn: '1 / -1' },
  label:        { fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 },
  input:        { padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 14 },
  radioLabel:   { display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#374151', cursor: 'pointer' },
  checkLabel:   { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#374151', cursor: 'pointer' },
  errorMsg:     { color: '#DC2626', fontSize: 13 },
  exitoBanner:  { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 6, flexWrap: 'wrap' },
  btnCrearOtro: { marginLeft: 'auto', padding: '5px 12px', background: '#059669', color: '#FFF', border: 'none', borderRadius: 5, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  modalFooter:  { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
  btnPrimary:   { padding: '9px 18px', background: '#1E3A5F', color: '#FFF', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnSecondary: { padding: '9px 18px', background: '#FFF', color: '#374151', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 14, cursor: 'pointer' },
  btnOk:        { fontSize: 11, padding: '2px 6px', background: '#1E3A5F', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' },
  btnCancelPct: { fontSize: 11, padding: '2px 6px', background: '#F3F4F6', color: '#374151', border: '1px solid #D1D5DB', borderRadius: 4, cursor: 'pointer' },
  btnPctDefault:{ fontSize: 11, padding: '2px 8px', background: '#F3F4F6', color: '#374151', border: '1px solid #D1D5DB', borderRadius: 4, cursor: 'pointer' },
  invSeccion:   { gridColumn: '1 / -1', display: 'flex', border: '1px solid #E5E7EB', borderRadius: 6, overflow: 'hidden' },
  invBarra:     { width: 20, background: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  invBarraLabel:{ fontSize: 10, fontWeight: 700, color: '#78350F', writingMode: 'vertical-rl', transform: 'rotate(180deg)', letterSpacing: 1 },
  invCuerpo:    { flex: 1, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 },
  invFila:      { display: 'flex', alignItems: 'center', gap: 8 },
  invLabel:     { fontSize: 12, fontWeight: 600, color: '#374151', width: 130, flexShrink: 0 },
}
