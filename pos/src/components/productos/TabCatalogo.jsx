import { useState, useEffect, useCallback } from 'react'
import { api } from '../../api'

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

const exportarCSV = (productos) => {
  const cab = ['Codigo','Descripcion','Departamento','Costo','P.Venta','P.Mayoreo','Existencia','Inv.Minimo','Inv.Maximo','Tipo','Proveedor']
  const filas = productos.map(p => [
    p.codigo_barras || '',
    `"${p.nombre}"`,
    `"${p.departamento}"`,
    p.costo.toFixed(2), p.precio.toFixed(2), p.precio_mayoreo.toFixed(2),
    p.existencia, p.inv_minimo, p.inv_maximo,
    p.unidad.toUpperCase(),
    `"${p.proveedor}"`,
  ])
  const csv = [cab, ...filas].map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'catalogo.csv'; a.click()
  URL.revokeObjectURL(url)
}

export default function TabCatalogo({ usuario }) {
  const [productos, setProductos]         = useState([])
  const [departamentos, setDepartamentos] = useState([])
  const [busqueda, setBusqueda]           = useState('')
  const [filtroDept, setFiltroDept]       = useState('')
  const [seleccionados, setSelec]         = useState(new Set())
  const [cargando, setCargando]           = useState(false)
  const [modalEditar, setModalEditar]     = useState(null)
  const [form, setForm]                   = useState(null)
  const [guardando, setGuardando]         = useState(false)
  const [errorModal, setErrorModal]       = useState('')

  const cargar = useCallback(async (deptId) => {
    setCargando(true)
    try {
      const [prods, deps] = await Promise.all([
        api.catalogoProductos(usuario.negocio_id, deptId || undefined),
        api.listarDepartamentos(usuario.negocio_id),
      ])
      setProductos(Array.isArray(prods) ? prods : [])
      setDepartamentos(Array.isArray(deps) ? deps : [])
    } catch { setProductos([]) }
    finally { setCargando(false) }
  }, [usuario.negocio_id])

  useEffect(() => { cargar('') }, [])

  const onFiltroDept = (val) => {
    setFiltroDept(val); setSelec(new Set()); cargar(val)
  }

  const productosFiltrados = busqueda
    ? productos.filter(p => {
        const q = busqueda.toLowerCase()
        return p.nombre.toLowerCase().includes(q) || (p.codigo_barras || '').includes(q)
      })
    : productos

  const toggleTodos = () =>
    setSelec(seleccionados.size === productosFiltrados.length
      ? new Set()
      : new Set(productosFiltrados.map(p => p.id)))

  const toggleUno = (id) =>
    setSelec(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const abrirModificar = () => {
    if (seleccionados.size !== 1) return
    const p = productos.find(x => x.id === [...seleccionados][0])
    if (!p) return
    setForm({
      codigo_barras:   p.codigo_barras || '',
      nombre:          p.nombre,
      costo:           p.costo ? String(p.costo) : '',
      margen:          p.costo && p.precio ? calcMargen(p.costo, p.precio) : '',
      precio:          String(p.precio),
      precio_mayoreo:  p.precio_mayoreo ? String(p.precio_mayoreo) : '',
      departamento_id: p.departamento_id ? String(p.departamento_id) : '',
      unidad:          p.unidad || 'pieza',
      aplica_iva:      p.aplica_iva || false,
    })
    setErrorModal('')
    setModalEditar(p)
  }

  const setCampo = (campo, valor) => {
    setErrorModal('')
    setForm(prev => {
      const next = { ...prev, [campo]: valor }
      if (campo === 'costo'  && prev.margen) next.precio = calcPrecio(valor, prev.margen)
      if (campo === 'margen' && prev.costo)  next.precio = calcPrecio(prev.costo, valor)
      if (campo === 'precio' && prev.costo)  next.margen = calcMargen(prev.costo, valor)
      return next
    })
  }

  const guardar = async () => {
    if (!form.nombre.trim())                          { setErrorModal('El nombre es requerido'); return }
    if (!form.precio || parseFloat(form.precio) <= 0) { setErrorModal('El precio de venta es requerido'); return }
    setGuardando(true)
    try {
      const res = await api.editarProducto(modalEditar.id, {
        codigo_barras:   form.codigo_barras || null,
        nombre:          form.nombre.trim(),
        precio:          parseFloat(form.precio),
        precio_mayoreo:  form.precio_mayoreo ? parseFloat(form.precio_mayoreo) : null,
        costo:           form.costo ? parseFloat(form.costo) : null,
        departamento_id: form.departamento_id ? parseInt(form.departamento_id) : null,
        unidad:          form.unidad,
        aplica_iva:      form.aplica_iva,
      })
      setModalEditar(null); setSelec(new Set()); cargar(filtroDept)
    } catch(e) { setErrorModal(e.message) }
    finally { setGuardando(false) }
  }

  const todosMarcados  = productosFiltrados.length > 0 && seleccionados.size === productosFiltrados.length
  const unoSeleccionado = seleccionados.size === 1

  return (
    <div style={e.shell}>

      {/* ── Barra de filtros (2 filas: búsqueda izq / Departamento+botones der) ── */}
      <div style={e.filtrosBar}>
        {/* Izquierda: buscador */}
        <div style={e.filtrosIzq}>
          <input
            className="pos-input"
            style={e.buscador}
            placeholder="&#128269; Buscar..."
            value={busqueda}
            onChange={ev => setBusqueda(ev.target.value)}
          />
        </div>

        {/* Derecha: label arriba, controles abajo */}
        <div style={e.filtrosDer}>
          <span style={e.deptLabel}>Departamento</span>
          <div style={e.filtrosDerBtns}>
            <select
              className="pos-input"
              style={e.selectDept}
              value={filtroDept}
              onChange={ev => onFiltroDept(ev.target.value)}
            >
              <option value="">Todos</option>
              {departamentos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
            </select>
            <button className="pos-btn" style={e.btnAccion} disabled title="Proximamente">
              Actualizar varios...
            </button>
            <button className="pos-btn" style={e.btnAccion} disabled={!unoSeleccionado} onClick={abrirModificar}>
              Modificar...
            </button>
            <button className="pos-btn" style={e.btnAccion} disabled={productosFiltrados.length === 0} onClick={() => exportarCSV(productosFiltrados)}>
              Exportar
            </button>
          </div>
        </div>
      </div>

      {/* ── Tabla ── */}
      <div style={e.tablaWrap}>
        {cargando ? (
          <div style={e.centro}>Cargando...</div>
        ) : (
          <table style={e.tabla}>
            <thead>
              <tr>
                <th style={{ ...e.th, width: 28 }}>
                  <input type="checkbox" checked={todosMarcados} onChange={toggleTodos} />
                </th>
                <th style={{ ...e.th, width: 90 }}>Codigo</th>
                <th style={{ ...e.th, minWidth: 160, textAlign: 'left' }}>Descripcion del Producto</th>
                <th style={{ ...e.th, width: 120 }}>Departamento</th>
                <th style={{ ...e.th, width: 72 }}>Costo</th>
                <th style={{ ...e.th, width: 72 }}>P. Venta</th>
                <th style={{ ...e.th, width: 72 }}>P. Mayoreo</th>
                <th style={{ ...e.th, width: 68 }}>Existencia</th>
                <th style={{ ...e.th, width: 68 }}>Inv. Minimo</th>
                <th style={{ ...e.th, width: 68 }}>Inv. Maximo</th>
                <th style={{ ...e.th, width: 68 }}>Tipo Venta</th>
                <th style={{ ...e.th, width: 110, textAlign: 'left' }}>Proveedor</th>
              </tr>
            </thead>
            <tbody>
              {productosFiltrados.length === 0 && (
                <tr><td colSpan={12} style={e.centro}>Sin productos</td></tr>
              )}
              {productosFiltrados.map((p, i) => {
                const sel = seleccionados.has(p.id)
                const bajoMinimo = p.inv_minimo > 0 && p.existencia <= p.inv_minimo
                return (
                  <tr key={p.id} style={sel ? e.trSel : i % 2 === 1 ? e.trImpar : undefined}
                    onClick={() => toggleUno(p.id)}>
                    <td style={{ ...e.td, textAlign: 'center' }} onClick={ev => ev.stopPropagation()}>
                      <input type="checkbox" checked={sel} onChange={() => toggleUno(p.id)} />
                    </td>
                    <td style={{ ...e.td, fontFamily: 'monospace', fontSize: 11 }}>{p.codigo_barras || ''}</td>
                    <td style={{ ...e.td, textAlign: 'left' }}>{p.nombre}</td>
                    <td style={e.td}>{p.departamento}</td>
                    <td style={{ ...e.td, textAlign: 'right' }}>${p.costo.toFixed(2)}</td>
                    <td style={{ ...e.td, textAlign: 'right', fontWeight: 600 }}>${p.precio.toFixed(2)}</td>
                    <td style={{ ...e.td, textAlign: 'right' }}>${p.precio_mayoreo.toFixed(2)}</td>
                    <td style={{ ...e.td, textAlign: 'center', color: bajoMinimo ? '#c00' : 'inherit' }}>
                      {p.existencia}
                    </td>
                    <td style={{ ...e.td, textAlign: 'center' }}>{p.inv_minimo}</td>
                    <td style={{ ...e.td, textAlign: 'center' }}>{p.inv_maximo}</td>
                    <td style={{ ...e.td, textAlign: 'center' }}>{p.unidad.toUpperCase()}</td>
                    <td style={{ ...e.td, textAlign: 'left', color: '#555' }}>{p.proveedor || ''}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Footer ── */}
      <div style={e.footer}>
        <span style={e.footerTxt}>{productosFiltrados.length} producto(s)</span>
        {seleccionados.size > 0 && <span style={e.footerSel}>{seleccionados.size} seleccionado(s)</span>}
      </div>

      {/* ── Modal Modificar ── */}
      {modalEditar && form && (
        <div style={e.overlay}>
          <div style={e.modal}>
            <div style={e.modalTitulo}>MODIFICAR: {modalEditar.nombre}</div>
            <div style={e.mForm}>
              <div style={e.mFila}>
                <label style={e.mLabel}>Codigo de Barras</label>
                <input className="pos-input" style={e.mInput}
                  value={form.codigo_barras} onChange={ev => setCampo('codigo_barras', ev.target.value)} />
              </div>
              <div style={e.mFila}>
                <label style={e.mLabel}>Nombre *</label>
                <input className="pos-input" style={e.mInput}
                  value={form.nombre} onChange={ev => setCampo('nombre', ev.target.value)} />
              </div>
              <div style={e.mFilaGrid}>
                <div style={e.mFila}>
                  <label style={e.mLabel}>Costo</label>
                  <input className="pos-input" style={e.mInput} type="number" step="0.01" min="0"
                    value={form.costo} onChange={ev => setCampo('costo', ev.target.value)} />
                </div>
                <div style={e.mFila}>
                  <label style={e.mLabel}>Ganancia %</label>
                  <input className="pos-input" style={e.mInput} type="number" step="0.1" min="0"
                    value={form.margen} onChange={ev => setCampo('margen', ev.target.value)} />
                </div>
              </div>
              <div style={e.mFilaGrid}>
                <div style={e.mFila}>
                  <label style={e.mLabel}>Precio Venta *</label>
                  <input className="pos-input" style={{ ...e.mInput, fontWeight: 700 }} type="number" step="0.01" min="0"
                    value={form.precio} onChange={ev => setCampo('precio', ev.target.value)} />
                </div>
                <div style={e.mFila}>
                  <label style={e.mLabel}>Precio Mayoreo</label>
                  <input className="pos-input" style={e.mInput} type="number" step="0.01" min="0"
                    value={form.precio_mayoreo} onChange={ev => setCampo('precio_mayoreo', ev.target.value)} />
                </div>
              </div>
              <div style={e.mFila}>
                <label style={e.mLabel}>Departamento</label>
                <select className="pos-input" style={e.mInput}
                  value={form.departamento_id} onChange={ev => setCampo('departamento_id', ev.target.value)}>
                  <option value="">Sin departamento</option>
                  {departamentos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                </select>
              </div>
              <div style={e.mFila}>
                <label style={e.mLabel}>Tipo de Venta</label>
                <div style={{ display: 'flex', gap: 14 }}>
                  {[['pieza','Unidad/Pieza'],['granel','A Granel'],['caja','Paquete']].map(([v, l]) => (
                    <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, cursor: 'pointer', color: '#1a1a1a' }}>
                      <input type="radio" name="mUnidad" value={v} checked={form.unidad === v} onChange={() => setCampo('unidad', v)} />
                      {l}
                    </label>
                  ))}
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', color: '#1a1a1a' }}>
                <input type="checkbox" checked={form.aplica_iva} onChange={ev => setCampo('aplica_iva', ev.target.checked)} />
                Aplica IVA (16%)
              </label>
              {errorModal && <div style={e.mError}>{errorModal}</div>}
            </div>
            <div style={e.modalBtns}>
              <button className="pos-btn" onClick={() => setModalEditar(null)} disabled={guardando}>Cancelar</button>
              <button className="pos-btn pos-btn-success" onClick={guardar} disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const e = {
  shell: {
    display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden',
    background: '#fff', color: '#1a1a1a',
  },
  // Barra de filtros: izquierda + derecha (2 filas en la derecha)
  filtrosBar: {
    display: 'flex', alignItems: 'stretch',
    padding: '6px 12px', gap: 12,
    borderBottom: '1px solid #e0e0e0', background: '#fafaf8',
  },
  filtrosIzq: {
    display: 'flex', alignItems: 'center',
  },
  buscador: {
    fontSize: 12, padding: '3px 8px', height: 26, width: 210,
  },
  filtrosDer: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3,
  },
  deptLabel: {
    fontSize: 11, color: '#666',
  },
  filtrosDerBtns: {
    display: 'flex', alignItems: 'center', gap: 6,
  },
  selectDept: {
    fontSize: 12, padding: '3px 6px', height: 24, minWidth: 130,
  },
  btnAccion: {
    fontSize: 11, padding: '2px 10px', height: 24,
  },
  // Tabla
  tablaWrap: {
    flex: 1, overflowY: 'auto', overflowX: 'auto',
  },
  tabla: {
    width: '100%', borderCollapse: 'collapse', fontSize: 11, minWidth: 1000,
  },
  th: {
    padding: '4px 6px', background: '#f0ede5', color: '#333',
    fontWeight: 600, textAlign: 'center',
    borderBottom: '2px solid #d8d0c0', position: 'sticky', top: 0, zIndex: 1,
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '3px 6px', color: '#1a1a1a',
    borderBottom: '1px solid #eee', textAlign: 'center',
    whiteSpace: 'nowrap', overflow: 'hidden', maxWidth: 200, textOverflow: 'ellipsis',
  },
  trImpar: { background: '#fffff0' },
  trSel:   { background: '#cce5ff' },
  centro: {
    padding: 24, textAlign: 'center', color: '#999', fontSize: 13,
  },
  footer: {
    display: 'flex', alignItems: 'center', gap: 16,
    padding: '4px 12px', borderTop: '1px solid #ddd', background: '#fafaf8',
  },
  footerTxt: { fontSize: 11, color: '#666' },
  footerSel: { fontSize: 11, color: '#1E3A5F', fontWeight: 600 },
  // Modal
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
  },
  modal: {
    background: '#fff', borderRadius: 6, width: 500,
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column',
    maxHeight: '90vh', overflow: 'hidden',
  },
  modalTitulo: {
    fontSize: 13, fontWeight: 700, color: '#c8860a',
    padding: '9px 14px', borderBottom: '1px solid #e0e0e0',
  },
  mForm: {
    flex: 1, overflowY: 'auto', padding: '10px 14px',
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  mFila:     { display: 'flex', flexDirection: 'column', gap: 3 },
  mFilaGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  mLabel:    { fontSize: 11, fontWeight: 700, color: '#555' },
  mInput:    { fontSize: 12, padding: '3px 6px', width: '100%' },
  mError:    { fontSize: 12, color: '#c00', padding: '4px 8px', background: '#FEF2F2', borderRadius: 4 },
  modalBtns: {
    display: 'flex', justifyContent: 'flex-end', gap: 8,
    padding: '9px 14px', borderTop: '1px solid #e0e0e0',
  },
}
