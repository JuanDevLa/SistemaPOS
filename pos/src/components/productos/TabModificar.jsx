import { useState, useRef, useEffect } from 'react'
import { api } from '../../api'

const UNIDADES = [
  { value: 'pieza',  label: 'Por Unidad/Pza' },
  { value: 'granel', label: 'A Granel (Usa Decimales)' },
  { value: 'caja',   label: 'Como paquete (kit)' },
]

const calcPrecio = (costo, margen) => {
  const c = parseFloat(costo), m = parseFloat(margen)
  if (!c || !m || m >= 100) return '0.00'
  return (c / (1 - m / 100)).toFixed(2)
}
const calcMargen = (costo, precio) => {
  const c = parseFloat(costo), p = parseFloat(precio)
  if (!c || !p || p <= c) return '0.00'
  return (((p - c) / p) * 100).toFixed(2)
}

export default function TabModificar({ usuario }) {
  const [fase, setFase]               = useState('buscar') // 'buscar' | 'editar'
  const [codigo, setCodigo]           = useState('')
  const [buscando, setBuscando]       = useState(false)
  const [errorBusq, setErrorBusq]     = useState('')
  const [sugerencias, setSugerencias] = useState([])
  const [timeoutId, setTimeoutId]     = useState(null)
  const [hoverIdx, setHoverIdx]       = useState(-1)

  const [producto, setProducto]       = useState(null)
  const [departamentos, setDepts]     = useState([])
  const [form, setForm]               = useState({})
  const [guardando, setGuardando]     = useState(false)
  const [error, setError]             = useState('')
  const [mensaje, setMensaje]         = useState('')

  const inputRef  = useRef()
  const descRef   = useRef()

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => {
    if (fase === 'editar') {
      api.listarDepartamentos(usuario.negocio_id)
        .then(d => setDepts(Array.isArray(d) ? d : []))
        .catch(() => {})
      setTimeout(() => descRef.current?.select(), 80)
    }
  }, [fase])

  const buscarSugerencias = async (q) => {
    if (!q.trim()) {
      setSugerencias([])
      return
    }
    try {
      const res = await api.buscarProducto(q, usuario.negocio_id)
      setSugerencias(Array.isArray(res) ? res.slice(0, 8) : [])
    } catch(e) {
      setSugerencias([])
    }
  }

  const handleChangeCodig = (valor) => {
    setCodigo(valor)
    setErrorBusq('')
    if (timeoutId) clearTimeout(timeoutId)
    const id = setTimeout(() => buscarSugerencias(valor), 300)
    setTimeoutId(id)
  }

  const seleccionarProducto = (p) => {
    setProducto(p)
    setForm({
      codigo_barras:   p.codigo_barras || '',
      nombre:          p.nombre || '',
      unidad:          p.unidad || 'pieza',
      costo:           p.costo ? String(parseFloat(p.costo).toFixed(2)) : '0.00',
      margen:          p.costo && p.precio ? calcMargen(p.costo, p.precio) : '0.00',
      precio:          p.precio ? String(parseFloat(p.precio).toFixed(2)) : '0.00',
      precio_mayoreo:  p.precio_mayoreo ? String(parseFloat(p.precio_mayoreo).toFixed(2)) : '0.00',
      departamento_id: p.departamento_id ? String(p.departamento_id) : '',
      aplica_iva:      p.aplica_iva || false,
      usa_inventario:  parseFloat(p.stock_actual) > 0 || parseFloat(p.alerta_minima) > 0,
      hay:             String(p.stock_actual ?? 0),
      minimo:          String(p.alerta_minima ?? 0),
      maximo:          String(p.maximo ?? 0),
    })
    setSugerencias([])
    setFase('editar')
  }

  const buscar = async () => {
    const q = codigo.trim()
    if (!q) return
    if (sugerencias.length === 1) {
      seleccionarProducto(sugerencias[0])
      return
    }
    if (!sugerencias.length) {
      setErrorBusq('No se encontro ningun producto con ese codigo o nombre')
      return
    }
    seleccionarProducto(sugerencias[0])
  }

  const set = (campo, valor) => {
    setError(''); setMensaje('')
    setForm(prev => {
      const next = { ...prev, [campo]: valor }
      if (campo === 'costo'  && prev.margen) next.precio = calcPrecio(valor, prev.margen)
      if (campo === 'margen' && prev.costo)  next.precio = calcPrecio(prev.costo, valor)
      if (campo === 'precio' && prev.costo)  next.margen = calcMargen(prev.costo, valor)
      return next
    })
  }

  const ajustarMargen = (delta) => {
    const nuevo = Math.max(0, Math.min(99, (parseFloat(form.margen) || 0) + delta))
    set('margen', nuevo.toFixed(2))
  }

  const cancelar = () => {
    setFase('buscar')
    setCodigo('')
    setProducto(null)
    setError(''); setMensaje('')
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const guardar = async () => {
    if (!form.nombre.trim())          { setError('El nombre comercial es requerido'); return }
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
      }
      await api.editarProducto(producto.id, data)

      if (form.usa_inventario) {
        await api.ajustarInventario({
          producto_id:   producto.id,
          negocio_id:    usuario.negocio_id,
          cantidad:      parseFloat(form.hay) || 0,
          alerta_minima: parseFloat(form.minimo) || 0,
          maximo:        parseFloat(form.maximo) || 0,
          notas:         'Modificacion desde Productos',
        })
      }

      setMensaje('Producto actualizado correctamente')
    } catch(e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  // ── FASE BUSCAR ────────────────────────────────────────────
  if (fase === 'buscar') return (
    <div style={e.shell}>
      <div style={e.card}>
        <div style={e.cardTitulo}>Modificar Producto</div>
        <div style={e.inputWrap}>
          <span style={e.icono}>▤</span>
          <input
            ref={inputRef}
            className="pos-input"
            style={e.cardInput}
            placeholder="Escribe nombre o código..."
            value={codigo}
            onChange={ev => handleChangeCodig(ev.target.value)}
            onKeyDown={ev => ev.key === 'Enter' && buscar()}
          />
        </div>
        {sugerencias.length > 0 && (
          <div style={e.dropdownWrap}>
            {sugerencias.map((p, idx) => (
              <div
                key={p.id}
                style={{ ...e.dropdownItem, background: hoverIdx === idx ? '#e8ecf4' : '#fff' }}
                onClick={() => seleccionarProducto(p)}
                onMouseEnter={() => setHoverIdx(idx)}
                onMouseLeave={() => setHoverIdx(-1)}
              >
                <div style={e.dropdownNombre}>{p.nombre}</div>
                <div style={e.dropdownCodigo}>{p.codigo_barras || '—'}</div>
              </div>
            ))}
          </div>
        )}
        {errorBusq && <div style={e.errorBusq}>{errorBusq}</div>}
        <button className="pos-btn pos-btn-success" style={e.btnAceptar} onClick={buscar} disabled={buscando}>
          {buscando ? 'Buscando...' : 'Aceptar'}
        </button>
      </div>
    </div>
  )

  // ── FASE EDITAR ────────────────────────────────────────────
  return (
    <div style={e.shell2}>
      <div style={e.contenido}>
        <div style={e.titulo}>MODIFICAR PRODUCTO</div>
        <div style={e.subTabBar}><div style={e.subTab}>Producto</div></div>

        <div style={e.form}>
          <div style={e.fila}>
            <label style={e.label}>Nuevo Codigo</label>
            <div style={e.inputWrap2}>
              <span style={e.icono2}>▤</span>
              <input className="pos-input" style={e.inputInline}
                value={form.codigo_barras}
                onChange={ev => set('codigo_barras', ev.target.value)} />
            </div>
          </div>

          <div style={e.fila}>
            <label style={e.label}>Nombre comercial</label>
            <input ref={descRef} className="pos-input" style={{ ...e.input, width: 380 }}
              value={form.nombre} onChange={ev => set('nombre', ev.target.value)} />
          </div>

          <div style={e.fila}>
            <label style={e.label}>Se vende</label>
            <div style={{ display: 'flex', gap: 16 }}>
              {UNIDADES.map(u => (
                <label key={u.value} style={e.radioLabel}>
                  <input type="radio" name="unidad_mod" value={u.value}
                    checked={form.unidad === u.value}
                    onChange={() => set('unidad', u.value)} />
                  {u.label}
                </label>
              ))}
            </div>
          </div>

          <div style={e.fila}>
            <label style={e.label}>Precio Costo</label>
            <input className="pos-input" style={{ ...e.input, width: 140 }}
              type="number" step="0.01" min="0"
              value={form.costo} onChange={ev => set('costo', ev.target.value)} />
          </div>

          <div style={e.fila}>
            <label style={e.label}>Ganancia</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input className="pos-input" style={{ ...e.input, width: 100 }}
                type="number" step="0.01" min="0" max="99"
                value={form.margen} onChange={ev => set('margen', ev.target.value)} />
              <div style={e.spinner}>
                <button style={e.spinBtn} onClick={() => ajustarMargen(1)}>▲</button>
                <button style={e.spinBtn} onClick={() => ajustarMargen(-1)}>▼</button>
              </div>
              <span style={{ fontSize: 12, color: '#333' }}>%</span>
            </div>
          </div>

          <div style={e.fila}>
            <label style={e.label}>Precio Venta</label>
            <input className="pos-input" style={{ ...e.input, width: 140 }}
              type="number" step="0.01" min="0"
              value={form.precio} onChange={ev => set('precio', ev.target.value)} />
          </div>

          <div style={e.fila}>
            <label style={e.label}>Precio Mayoreo</label>
            <input className="pos-input" style={{ ...e.input, width: 140 }}
              type="number" step="0.01" min="0"
              value={form.precio_mayoreo} onChange={ev => set('precio_mayoreo', ev.target.value)} />
          </div>

          <div style={e.fila}>
            <label style={e.label}>Departamento</label>
            <select className="pos-input" style={{ ...e.input, width: 280 }}
              value={form.departamento_id} onChange={ev => set('departamento_id', ev.target.value)}>
              <option value="">Sin departamento</option>
              {departamentos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
            </select>
          </div>

          <div style={e.invSeccion}>
            <div style={e.invBarra}><div style={e.invBarraLabel}>Inventario</div></div>
            <div style={e.invContenido}>
              <label style={e.radioLabel}>
                <input type="checkbox" checked={form.usa_inventario}
                  onChange={ev => set('usa_inventario', ev.target.checked)} />
                <span style={{ marginLeft: 6 }}>Este producto SI utiliza inventario.</span>
              </label>
              {form.usa_inventario && (
                <>
                  <div style={e.fila}>
                    <label style={e.label}>Hay</label>
                    <input className="pos-input" style={{ ...e.input, width: 100 }}
                      type="number" min="0" step="1"
                      value={form.hay} onChange={ev => set('hay', ev.target.value)} />
                    <span style={{ fontSize: 12, color: '#555', marginLeft: 6 }}>en este momento.</span>
                  </div>
                  <div style={e.fila}>
                    <label style={e.label}>Minimo</label>
                    <input className="pos-input" style={{ ...e.input, width: 100 }}
                      type="number" min="0" step="1"
                      value={form.minimo} onChange={ev => set('minimo', ev.target.value)} />
                  </div>
                  <div style={e.fila}>
                    <label style={e.label}>Maximo</label>
                    <input className="pos-input" style={{ ...e.input, width: 100 }}
                      type="number" min="0" step="1"
                      value={form.maximo} onChange={ev => set('maximo', ev.target.value)} />
                  </div>
                </>
              )}
            </div>
          </div>

          {error   && <div style={e.errorMsg}>{error}</div>}
          {mensaje && <div style={e.okMsg}>{mensaje}</div>}
        </div>
      </div>

      <div style={e.footer}>
        <button className="pos-btn pos-btn-success" style={e.btnGuardar} onClick={guardar} disabled={guardando}>
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
  // ── buscar ──
  shell:        { display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', background: '#f0f0f0' },
  card:         { background: '#f7f7f7', border: '1px solid #ccc', borderRadius: 4, padding: '20px 24px', width: 360, display: 'flex', flexDirection: 'column', gap: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  cardTitulo:   { fontSize: 15, fontWeight: 600, color: '#1a1a1a', textAlign: 'center', marginBottom: 4 },
  inputWrap:    { display: 'flex', alignItems: 'center', border: '1px solid #aaa', borderRadius: 3, background: '#fff', overflow: 'hidden' },
  icono:        { padding: '4px 7px', fontSize: 13, color: '#888', borderRight: '1px solid #ddd', background: '#f5f5f5', userSelect: 'none' },
  cardInput:    { flex: 1, border: 'none', outline: 'none', fontSize: 13, padding: '5px 8px', background: 'transparent', color: '#1a1a1a', boxShadow: 'none' },
  dropdownWrap: { border: '1px solid #ddd', borderRadius: 3, background: '#fff', maxHeight: 200, overflow: 'auto', marginTop: -6 },
  dropdownItem: { padding: '8px 10px', borderBottom: '1px solid #f0f0f0', cursor: 'pointer', transition: 'background 0.1s', ':hover': { background: '#f0f0f0' } },
  dropdownNombre: { fontSize: 13, fontWeight: 500, color: '#1a1a1a' },
  dropdownCodigo: { fontSize: 11, color: '#888', marginTop: 2 },
  errorBusq:    { fontSize: 12, color: '#c02020', textAlign: 'center' },
  btnAceptar:   { fontSize: 13, padding: '6px 0', textAlign: 'center' },
  // ── editar ──
  shell2:      { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', background: '#fff' },
  contenido:   { flex: 1, overflow: 'auto', padding: '10px 16px' },
  titulo:      { fontSize: 14, fontWeight: 700, color: '#1e3a5f', marginBottom: 8 },
  subTabBar:   { display: 'flex', marginBottom: 10, borderBottom: '1px solid #bbb' },
  subTab:      { padding: '3px 14px', background: '#e8ecf4', border: '1px solid #bbb', borderBottom: 'none', fontSize: 12, fontWeight: 600, color: '#1e3a5f', borderRadius: '3px 3px 0 0' },
  form:        { display: 'flex', flexDirection: 'column', gap: 5, maxWidth: 520 },
  fila:        { display: 'flex', alignItems: 'center', gap: 8, minHeight: 26 },
  label:       { fontSize: 12, fontWeight: 600, color: '#333', width: 110, flexShrink: 0, textAlign: 'right' },
  input:       { fontSize: 12, color: '#1a1a1a', padding: '3px 6px' },
  inputWrap2:  { display: 'flex', alignItems: 'center', border: '1px solid #aaa', borderRadius: 3, background: '#fff', overflow: 'hidden', width: 220 },
  icono2:      { padding: '2px 6px', fontSize: 12, color: '#888', borderRight: '1px solid #ddd', background: '#f5f5f5', userSelect: 'none' },
  inputInline: { flex: 1, border: 'none', outline: 'none', fontSize: 12, padding: '3px 6px', background: 'transparent', color: '#1a1a1a', boxShadow: 'none' },
  radioLabel:  { display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#1a1a1a', cursor: 'pointer' },
  spinner:     { display: 'flex', flexDirection: 'column', gap: 0 },
  spinBtn:     { width: 16, height: 11, fontSize: 8, padding: 0, background: '#e8e8e8', border: '1px solid #bbb', cursor: 'pointer', lineHeight: 1, color: '#333' },
  invSeccion:  { display: 'flex', marginTop: 8, border: '1px solid #ddd', borderRadius: 3, overflow: 'hidden' },
  invBarra:    { width: 18, background: '#f0c040', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  invBarraLabel:{ fontSize: 10, fontWeight: 700, color: '#7a5c00', writingMode: 'vertical-rl', transform: 'rotate(180deg)', letterSpacing: 1 },
  invContenido:{ flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 5 },
  errorMsg:    { marginTop: 6, padding: '5px 10px', background: '#FEF2F2', color: '#c02020', fontSize: 12, borderRadius: 3 },
  okMsg:       { marginTop: 6, padding: '5px 10px', background: '#D1FAE5', color: '#065F46', fontSize: 12, borderRadius: 3 },
  footer:      { display: 'flex', justifyContent: 'space-between', padding: '8px 16px', borderTop: '1px solid #e0e0e0', background: '#f5f5f5' },
  btnGuardar:  { fontSize: 12, padding: '5px 16px' },
  btnCancelar: { fontSize: 12, padding: '5px 16px' },
}
