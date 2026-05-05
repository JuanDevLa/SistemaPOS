import { useState, useRef, useEffect } from 'react'
import { api } from '../../api'

const UNIDADES = [
  { value: 'pieza',  label: 'Por Unidad/Pza' },
  { value: 'granel', label: 'A Granel (Usa Decimales)' },
  { value: 'caja',   label: 'Como paquete (kit)' },
]

const getPct = () => {
  const v = parseFloat(localStorage.getItem('pdv_pct_ganancia'))
  return isNaN(v) ? 20 : v
}

const getFormVacio = () => {
  const pct = getPct()
  return {
    codigo_barras: '',
    nombre: '',
    unidad: 'pieza',
    costo: '',
    margen: pct > 0 ? String(pct) : '',
    precio: '',
    precio_mayoreo: '',
    departamento_id: '',
    aplica_iva: false,
    usa_inventario: true,
    hay: '',
    minimo: '',
    maximo: '',
    controla_lote: false,
    lote: '',
    fecha_caducidad: '',
  }
}

const calcPrecio = (costo, margen) => {
  const c = parseFloat(costo), m = parseFloat(margen)
  if (!c || !m || m >= 100) return ''
  return (c / (1 - m / 100)).toFixed(2)
}
const calcMargen = (costo, precio) => {
  const c = parseFloat(costo), p = parseFloat(precio)
  if (!c || !p || p <= c) return ''
  return (((p - c) / p) * 100).toFixed(2)
}

export default function TabNuevo({ usuario }) {
  const [form, setForm]               = useState(getFormVacio)
  const [departamentos, setDepts]     = useState([])
  const [guardando, setGuardando]     = useState(false)
  const [error, setError]             = useState('')
  const [mensaje, setMensaje]         = useState('')
  const [pctDefault, setPctDefault]   = useState(getPct)
  const [editandoPct, setEditandoPct] = useState(false)
  const [pctInput, setPctInput]       = useState('')
  const [cuenta, setCuenta]           = useState(0)
  const codigoRef = useRef()

  useEffect(() => {
    if (!mensaje) return
    if (cuenta <= 0) {
      setForm(getFormVacio())
      setMensaje('')
      codigoRef.current?.focus()
      return
    }
    const t = setTimeout(() => setCuenta(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [mensaje, cuenta])

  useEffect(() => {
    api.listarDepartamentos(usuario.negocio_id)
      .then(d => setDepts(Array.isArray(d) ? d : []))
      .catch(() => {})
    codigoRef.current?.focus()
  }, [])

  const set = (campo, valor) => {
    setError('')
    setMensaje('')
    setForm(prev => {
      const next = { ...prev, [campo]: valor }
      if (campo === 'costo'  && prev.margen) next.precio = calcPrecio(valor, prev.margen)
      if (campo === 'margen' && prev.costo)  next.precio = calcPrecio(prev.costo, valor)
      if (campo === 'precio' && prev.costo)  next.margen = calcMargen(prev.costo, valor)
      return next
    })
  }

  const ajustarMargen = (delta) => {
    const actual = parseFloat(form.margen) || 0
    const nuevo  = Math.max(0, Math.min(99, actual + delta))
    set('margen', nuevo.toFixed(2))
  }

  const guardarPct = () => {
    const v = parseFloat(pctInput)
    const nuevo = isNaN(v) || v < 0 ? 0 : v
    localStorage.setItem('pdv_pct_ganancia', nuevo)
    setPctDefault(nuevo)
    setEditandoPct(false)
    setPctInput('')
    // Si el margen actual era el default anterior, actualizarlo
    setForm(prev => ({ ...prev, margen: nuevo > 0 ? String(nuevo) : '' }))
  }

  const cancelar = () => {
    setForm(getFormVacio())
    setError('')
    setMensaje('')
    codigoRef.current?.focus()
  }

  const guardar = async () => {
    if (!form.nombre.trim()) { setError('El nombre comercial es requerido'); return }
    if (parseFloat(form.precio) <= 0) { setError('El precio de venta debe ser mayor a 0'); return }

    setGuardando(true); setError('')
    try {
      const data = {
        codigo_barras:   form.codigo_barras || null,
        nombre:          form.nombre.trim(),
        precio:          parseFloat(form.precio),
        precio_mayoreo:  parseFloat(form.precio_mayoreo) || null,
        costo:           parseFloat(form.costo) || null,
        departamento_id: form.departamento_id ? parseInt(form.departamento_id) : null,
        unidad:          form.unidad,
        aplica_iva:      form.aplica_iva,
        controla_lote:   form.controla_lote,
      }

      const res = await api.crearProducto(data)

      if (form.usa_inventario) {
        await api.ajustarInventario({
          producto_id:   res.id,
          negocio_id:    usuario.negocio_id,
          cantidad:      parseFloat(form.hay) || 0,
          alerta_minima: parseFloat(form.minimo) || 0,
          maximo:        parseFloat(form.maximo) || 0,
          notas:         'Stock inicial al crear producto',
        })

        if (form.controla_lote && form.lote.trim()) {
          await api.crearLoteInicial({
            producto_id:    res.id,
            negocio_id:     usuario.negocio_id,
            lote:           form.lote.trim(),
            fecha_caducidad: form.fecha_caducidad || null,
            cantidad:       parseFloat(form.hay) || 0,
          })
        }
      }

      setMensaje(`Producto "${res.nombre}" guardado correctamente`)
      setCuenta(3)
    } catch(e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div style={e.shell}>
      <div style={e.contenido}>
        <div style={e.titulo}>NUEVO PRODUCTO</div>

        {/* Sub-tab Producto */}
        <div style={e.subTabBar}>
          <div style={e.subTab}>Producto</div>
        </div>

        {/* Formulario */}
        <div style={e.form}>
          {/* Codigo de barras */}
          <div style={e.fila}>
            <label style={e.label}>Codigo de Barras</label>
            <input
              ref={codigoRef}
              className="pos-input"
              style={e.input}
              placeholder=""
              value={form.codigo_barras}
              onChange={ev => set('codigo_barras', ev.target.value)}
            />
          </div>

          {/* Descripcion */}
          <div style={e.fila}>
            <label style={e.label}>Nombre comercial</label>
            <input
              className="pos-input"
              style={e.input}
              value={form.nombre}
              onChange={ev => set('nombre', ev.target.value)}
            />
          </div>

          {/* Se vende */}
          <div style={e.fila}>
            <label style={e.label}>Se vende</label>
            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              {UNIDADES.map(u => (
                <label key={u.value} style={e.radioLabel}>
                  <input type="radio" name="unidad" value={u.value}
                    checked={form.unidad === u.value}
                    onChange={() => set('unidad', u.value)} />
                  {u.label}
                </label>
              ))}
            </div>
          </div>

          {/* Precio Costo */}
          <div style={e.fila}>
            <label style={e.label}>Precio Costo</label>
            <input className="pos-input" style={{ ...e.input, width: 140 }}
              type="text" inputMode="decimal"
              placeholder="0.00"
              value={form.costo} onChange={ev => set('costo', ev.target.value)} />
          </div>

          {/* Ganancia % con spinner */}
          <div style={e.fila}>
            <label style={e.label}>Ganancia</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input className="pos-input" style={{ ...e.input, width: 100 }}
                type="text" inputMode="decimal"
                placeholder="0.00"
                value={form.margen} onChange={ev => set('margen', ev.target.value)} />
              <div style={e.spinner}>
                <button style={e.spinBtn} onClick={() => ajustarMargen(1)}>▲</button>
                <button style={e.spinBtn} onClick={() => ajustarMargen(-1)}>▼</button>
              </div>
              <span style={{ fontSize: 13, color: '#333' }}>%</span>
              {editandoPct ? (
                <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginLeft: 6 }}>
                  <input
                    style={{ ...e.input, width: 50, fontSize: 11, padding: '2px 4px' }}
                    type="text" inputMode="decimal" value={pctInput} autoFocus
                    onChange={ev => setPctInput(ev.target.value)}
                    onKeyDown={ev => { if (ev.key === 'Enter') guardarPct(); if (ev.key === 'Escape') setEditandoPct(false) }}
                  />
                  <button style={e.spinBtn2} onClick={guardarPct}>OK</button>
                  <button style={e.spinBtn2} onClick={() => setEditandoPct(false)}>✕</button>
                </div>
              ) : (
                <button style={e.btnPct}
                  onClick={() => { setPctInput(String(pctDefault)); setEditandoPct(true) }}>
                  {pctDefault > 0 ? `${pctDefault}% · Cambiar` : 'Sin % · Cambiar'}
                </button>
              )}
            </div>
          </div>

          {/* Precio Venta */}
          <div style={e.fila}>
            <label style={e.label}>Precio Venta</label>
            <input className="pos-input" style={{ ...e.input, width: 140 }}
              type="text" inputMode="decimal"
              placeholder="0.00"
              value={form.precio} onChange={ev => set('precio', ev.target.value)} />
          </div>

          {/* Precio Mayoreo */}
          <div style={e.fila}>
            <label style={e.label}>Precio Mayoreo</label>
            <input className="pos-input" style={{ ...e.input, width: 140 }}
              type="text" inputMode="decimal"
              placeholder="0.00"
              value={form.precio_mayoreo} onChange={ev => set('precio_mayoreo', ev.target.value)} />
          </div>

          {/* Departamento */}
          <div style={e.fila}>
            <label style={e.label}>Departamento</label>
            <select className="pos-input" style={{ ...e.input, width: 280 }}
              value={form.departamento_id} onChange={ev => set('departamento_id', ev.target.value)}>
              <option value="">Sin departamento</option>
              {departamentos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
            </select>
          </div>

          {/* Seccion Inventario con barra amarilla */}
          <div style={e.invSeccion}>
            <div style={e.invBarra}>
              <div style={e.invBarraLabel}>Inventario</div>
            </div>
            <div style={e.invContenido}>
              <div style={{ marginBottom: 10 }}>
                <label style={e.radioLabel}>
                  <input type="checkbox" checked={form.usa_inventario}
                    onChange={ev => set('usa_inventario', ev.target.checked)} />
                  <span style={{ marginLeft: 6, fontWeight: 600 }}>¿Este producto controla inventario?</span>
                </label>
              </div>
              {form.usa_inventario && (
                <>
                  <div style={{ ...e.fila, padding: '8px 8px', background: '#FFF8DC', borderRadius: 4, borderLeft: '3px solid #f0c040' }}>
                    <label style={{ ...e.label, width: 'auto' }}>Cantidad actual:</label>
                    <input className="pos-input" style={{ ...e.input, width: 100 }}
                      type="number" min="0" step="1" placeholder="0"
                      value={form.hay} onChange={ev => set('hay', ev.target.value)} />
                    <span style={{ fontSize: 12, color: '#555', marginLeft: 8 }}>unidades en este momento</span>
                  </div>
                  <div style={{ marginTop: 8, padding: '10px', background: '#F0F5FF', borderRadius: 4, borderLeft: '3px solid #2563a8', fontSize: 12, color: '#1e3a5f', lineHeight: 1.4 }}>
                    <strong>⚙️ Cuándo pedir más:</strong> Define el MÍNIMO para que el sistema te alerte cuando necesites reabastecer
                  </div>
                  <div style={e.fila}>
                    <label style={{ ...e.label, fontWeight: 700, color: '#c02020' }}>Mínimo para pedir</label>
                    <input className="pos-input" style={{ ...e.input, width: 100, borderColor: '#c02020', borderWidth: 2 }}
                      type="number" min="0" step="1" placeholder="0"
                      value={form.minimo} onChange={ev => set('minimo', ev.target.value)} />
                    <span style={{ fontSize: 12, color: '#c02020', marginLeft: 8, fontWeight: 600 }}>unidades</span>
                  </div>
                  <div style={e.fila}>
                    <label style={e.label}>Máximo (opcional)</label>
                    <input className="pos-input" style={{ ...e.input, width: 100 }}
                      type="number" min="0" step="1" placeholder="0"
                      value={form.maximo} onChange={ev => set('maximo', ev.target.value)} />
                  </div>
                </>
              )}
              <div style={{ marginTop: 14, marginBottom: 6, borderTop: '1px solid #e0e0e0', paddingTop: 12 }}>
                <label style={e.radioLabel}>
                  <input type="checkbox" checked={form.controla_lote}
                    onChange={ev => set('controla_lote', ev.target.checked)} />
                  <span style={{ marginLeft: 6, fontWeight: form.controla_lote ? 700 : 400, color: form.controla_lote ? '#c05000' : '#1a1a1a' }}>
                    Es medicamento (controla lote y caducidad)
                  </span>
                </label>
              </div>
              {form.controla_lote && (
                <div style={e.loteDiv}>
                  <div style={e.fila}>
                    <label style={e.label}>Lote</label>
                    <input className="pos-input" style={{ ...e.input, width: 180 }}
                      placeholder="Ej. ABC-2025"
                      value={form.lote} onChange={ev => set('lote', ev.target.value)} />
                  </div>
                  <div style={e.fila}>
                    <label style={e.label}>Caducidad</label>
                    <input className="pos-input" style={{ ...e.input, width: 140 }}
                      type="date"
                      value={form.fecha_caducidad} onChange={ev => set('fecha_caducidad', ev.target.value)} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {error && <div style={e.errorMsg}>{error}</div>}
          {mensaje && (
            <div style={e.okMsg}>
              <div style={{ fontWeight: 600 }}>{mensaje}</div>
              <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, color: '#065F46' }}>Limpiando en {cuenta}s...</span>
                <button
                  style={{ fontSize: 11, padding: '2px 8px', background: '#059669', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer', fontWeight: 600 }}
                  onClick={() => { setForm(getFormVacio()); setMensaje(''); setCuenta(0); setError(''); codigoRef.current?.focus() }}>
                  Crear otro ahora
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer fijo */}
      <div style={e.footer}>
        <button className="pos-btn pos-btn-success" style={e.btnGuardar} onClick={guardar} disabled={guardando || !!mensaje}>
          {guardando ? 'Guardando...' : 'Guardar Producto'}
        </button>
        <button className="pos-btn pos-btn-danger" style={e.btnCancelar} onClick={cancelar}>
          Cancelar
        </button>
      </div>
    </div>
  )
}

const e = {
  shell:        { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', background: '#fff' },
  contenido:    { flex: 1, overflow: 'auto', padding: '10px 16px' },
  titulo:       { fontSize: 14, fontWeight: 700, color: '#1e3a5f', marginBottom: 8 },
  subTabBar:    { display: 'flex', marginBottom: 10, borderBottom: '1px solid #bbb' },
  subTab:       { padding: '3px 14px', background: '#e8ecf4', border: '1px solid #bbb', borderBottom: 'none', fontSize: 12, fontWeight: 600, color: '#1e3a5f', borderRadius: '3px 3px 0 0' },
  form:         { display: 'flex', flexDirection: 'column', gap: 5, maxWidth: 520 },
  fila:         { display: 'flex', alignItems: 'center', gap: 8, minHeight: 26 },
  label:        { fontSize: 12, fontWeight: 600, color: '#333', width: 110, flexShrink: 0, textAlign: 'right' },
  input:        { fontSize: 12, color: '#1a1a1a', padding: '3px 6px' },
  radioLabel:   { display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#1a1a1a', cursor: 'pointer' },
  spinner:      { display: 'flex', flexDirection: 'column', gap: 0 },
  spinBtn:      { width: 16, height: 11, fontSize: 8, padding: 0, background: '#e8e8e8', border: '1px solid #bbb', cursor: 'pointer', lineHeight: 1, color: '#333' },
  spinBtn2:     { fontSize: 10, padding: '1px 5px', background: '#e8e8e8', border: '1px solid #bbb', borderRadius: 3, cursor: 'pointer', color: '#333' },
  btnPct:       { fontSize: 10, padding: '2px 7px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 3, cursor: 'pointer', color: '#1D4ED8', marginLeft: 4 },
  invSeccion:   { display: 'flex', marginTop: 8, border: '1px solid #ddd', borderRadius: 3, overflow: 'hidden' },
  invBarra:     { width: 18, background: '#f0c040', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  invBarraLabel:{ fontSize: 10, fontWeight: 700, color: '#7a5c00', writingMode: 'vertical-rl', transform: 'rotate(180deg)', letterSpacing: 1 },
  invContenido: { flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 5 },
  loteDiv:      { marginTop: 6, padding: '6px 0 0 0', borderTop: '1px dashed #e0a040', display: 'flex', flexDirection: 'column', gap: 5 },
  errorMsg:     { marginTop: 6, padding: '5px 10px', background: '#FEF2F2', color: '#c02020', fontSize: 12, borderRadius: 3 },
  okMsg:        { marginTop: 6, padding: '5px 10px', background: '#D1FAE5', color: '#065F46', fontSize: 12, borderRadius: 3 },
  footer:       { display: 'flex', justifyContent: 'space-between', padding: '8px 16px', borderTop: '1px solid #e0e0e0', background: '#f5f5f5' },
  btnGuardar:   { fontSize: 12, padding: '5px 16px' },
  btnCancelar:  { fontSize: 12, padding: '5px 16px' },
}
