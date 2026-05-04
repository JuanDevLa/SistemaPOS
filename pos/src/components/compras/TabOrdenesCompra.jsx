import { useState, useEffect } from 'react'
import { api } from '../../api'

const ESTADO_COLOR = {
  pendiente:  { bg: '#FFF7ED', border: '#F59E0B', badge: '#D97706', text: 'Pendiente' },
  recibida:   { bg: '#F0FDF4', border: '#86EFAC', badge: '#16A34A', text: 'Recibida'  },
  cancelada:  { bg: '#F9FAFB', border: '#D1D5DB', badge: '#6B7280', text: 'Cancelada' },
}

const fmt = (f) => new Date(f).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })

// ── Modal: Recibir mercancía ──────────────────────────────────────────────────
function ModalRecibir({ orden, onClose, onDone }) {
  const [items, setItems]     = useState(
    (orden.items || []).map(i => ({ ...i, cantidad_recibida: String(i.cantidad_pedida), costo_nuevo: String(i.costo_unitario || ''), precio_nuevo: '' }))
  )
  const [guardando, setGuardando] = useState(false)
  const [notas, setNotas]     = useState('')
  const [error, setError]     = useState('')

  const setItem = (idx, campo, val) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [campo]: val } : it))

  const guardar = async () => {
    for (const it of items) {
      if (!it.cantidad_recibida || parseFloat(it.cantidad_recibida) <= 0) {
        setError(`Ingresa la cantidad recibida para: ${it.nombre}`); return
      }
    }
    setGuardando(true); setError('')
    try {
      const res = await api.recibirOrdenCompra(orden.id, {
        notas,
        items: items.map(it => ({
          producto_id:      it.producto_id,
          cantidad_recibida: parseFloat(it.cantidad_recibida),
          costo_unitario:   it.costo_nuevo  ? parseFloat(it.costo_nuevo)  : it.costo_unitario || null,
          precio_nuevo:     it.precio_nuevo ? parseFloat(it.precio_nuevo) : null,
        })),
      })
      onDone()
    } catch(e) { setError(e.message) }
    finally { setGuardando(false) }
  }

  return (
    <div style={e.overlay}>
      <div style={e.recibirModal}>
        <div style={e.modalHeader}>
          <span style={e.modalTitulo}>Recibir mercancia — {orden.proveedor || orden.proveedor_nombre}</span>
          <button style={e.btnX} onClick={onClose}>&#10005;</button>
        </div>

        <div style={e.recibirTablaWrap}>
          <table style={e.tabla}>
            <thead>
              <tr>
                <th style={{ ...e.th, textAlign: 'left' }}>Producto</th>
                <th style={{ ...e.th, width: 90 }}>Pedido</th>
                <th style={{ ...e.th, width: 90 }}>Recibido</th>
                <th style={{ ...e.th, width: 100 }}>Nuevo Costo</th>
                <th style={{ ...e.th, width: 100 }}>Nuevo Precio</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={it.id} style={idx % 2 === 1 ? { background: '#fafaf8' } : undefined}>
                  <td style={{ ...e.td, textAlign: 'left', fontWeight: 600 }}>
                    {it.nombre}
                    {it.stock_actual !== null && (
                      <span style={{ fontSize: 10, color: '#888', marginLeft: 6 }}>
                        (hay {it.stock_actual})
                      </span>
                    )}
                  </td>
                  <td style={e.td}>{it.cantidad_pedida}</td>
                  <td style={e.td}>
                    <input className="pos-input" style={e.inputTabla} type="number" min="0" step="1"
                      value={it.cantidad_recibida}
                      onChange={ev => setItem(idx, 'cantidad_recibida', ev.target.value)} />
                  </td>
                  <td style={e.td}>
                    <input className="pos-input" style={e.inputTabla} type="number" min="0" step="0.01"
                      placeholder={it.costo_unitario ? `$${parseFloat(it.costo_unitario).toFixed(2)}` : '—'}
                      value={it.costo_nuevo}
                      onChange={ev => setItem(idx, 'costo_nuevo', ev.target.value)} />
                  </td>
                  <td style={e.td}>
                    <input className="pos-input" style={e.inputTabla} type="number" min="0" step="0.01"
                      placeholder="sin cambio"
                      value={it.precio_nuevo}
                      onChange={ev => setItem(idx, 'precio_nuevo', ev.target.value)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={e.recibirFooter}>
          <input className="pos-input" style={{ flex: 1, fontSize: 12 }}
            placeholder="Notas (factura, referencia...)"
            value={notas} onChange={ev => setNotas(ev.target.value)} />
          {error && <span style={{ fontSize: 12, color: '#c00', fontWeight: 600 }}>{error}</span>}
          <button className="pos-btn pos-btn-success" style={{ padding: '4px 18px', fontSize: 12 }}
            onClick={guardar} disabled={guardando}>
            {guardando ? 'Registrando...' : 'Registrar Entrada'}
          </button>
          <button className="pos-btn" style={{ padding: '4px 14px', fontSize: 12 }}
            onClick={onClose} disabled={guardando}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Vista: lista de órdenes ───────────────────────────────────────────────────
function VistaOrdenes({ usuario }) {
  const [ordenes, setOrdenes]         = useState([])
  const [cargando, setCargando]       = useState(false)
  const [filtroEstado, setFiltroEstado] = useState('pendiente')
  const [ordenRecibir, setOrdenRecibir] = useState(null)
  const [detalle, setDetalle]         = useState({})

  const cargar = async () => {
    setCargando(true)
    try {
      const res = await api.listarOrdenesCompra(usuario.negocio_id, filtroEstado || undefined)
      setOrdenes(Array.isArray(res) ? res : [])
    } catch { setOrdenes([]) }
    finally { setCargando(false) }
  }

  useEffect(() => { cargar() }, [filtroEstado])

  const cargarDetalle = async (orden) => {
    if (detalle[orden.id]) { setDetalle(prev => { const n = { ...prev }; delete n[orden.id]; return n }); return }
    try {
      const res = await api.detalleOrdenCompra(orden.id)
      if (res?.items) setDetalle(prev => ({ ...prev, [orden.id]: res }))
    } catch { /* silencioso */ }
  }

  const cancelarOrden = async (id) => {
    if (!confirm('¿Cancelar esta orden?')) return
    try {
      await api.cancelarOrdenCompra(id); await cargar()
    } catch { /* silencioso */ }
  }

  const abrirRecibir = async (orden) => {
    try {
      const res = await api.detalleOrdenCompra(orden.id)
      setOrdenRecibir(res)
    } catch { /* silencioso */ }
  }

  return (
    <div style={e.shell}>
      {/* Filtro */}
      <div style={e.topBar}>
        <span style={e.topLabel}>Mostrar:</span>
        {['pendiente', 'recibida', 'cancelada', ''].map(est => (
          <button key={est} className={`pos-btn${filtroEstado === est ? ' pos-btn-primary' : ''}`}
            style={e.filtroBtn} onClick={() => setFiltroEstado(est)}>
            {est === '' ? 'Todas' : est.charAt(0).toUpperCase() + est.slice(1) + 's'}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button className="pos-btn" style={e.filtroBtn} onClick={cargar}>Actualizar</button>
      </div>

      {/* Lista de órdenes */}
      <div style={e.listaWrap}>
        {cargando ? (
          <div style={e.centro}>Cargando ordenes...</div>
        ) : ordenes.length === 0 ? (
          <div style={e.centro}>
            {filtroEstado === 'pendiente'
              ? 'No hay ordenes pendientes. Genera una desde "Lista de Compras".'
              : 'Sin ordenes en este estado.'}
          </div>
        ) : ordenes.map(orden => {
          const est = ESTADO_COLOR[orden.estado] || ESTADO_COLOR.pendiente
          const abierto = !!detalle[orden.id]
          return (
            <div key={orden.id} style={{ ...e.card, border: `1px solid ${est.border}`, background: est.bg }}>
              {/* Cabecera de la card */}
              <div style={e.cardHeader}>
                <div style={e.cardLeft}>
                  <span style={{ ...e.badge, background: est.badge }}>{est.text}</span>
                  <span style={e.cardProv}>{orden.proveedor || orden.proveedor_nombre || 'Sin proveedor'}</span>
                  <span style={e.cardSub}>
                    Orden #{orden.id} · {fmt(orden.creada_en)} · {orden.total_items} producto(s) · ${parseFloat(orden.total_estimado).toFixed(2)}
                  </span>
                </div>
                <div style={e.cardBtns}>
                  <button className="pos-btn" style={e.cardBtn} onClick={() => cargarDetalle(orden)}>
                    {abierto ? 'Ocultar' : 'Ver detalle'}
                  </button>
                  {orden.estado === 'pendiente' && (
                    <>
                      <button className="pos-btn pos-btn-success" style={e.cardBtn}
                        onClick={() => abrirRecibir(orden)}>
                        Recibir Mercancia
                      </button>
                      <button className="pos-btn pos-btn-danger" style={e.cardBtn}
                        onClick={() => cancelarOrden(orden.id)}>
                        Cancelar
                      </button>
                    </>
                  )}
                  {orden.estado === 'recibida' && orden.entrada_id && (
                    <span style={e.entradaRef}>Entrada #{orden.entrada_id} · {fmt(orden.recibida_en)}</span>
                  )}
                </div>
              </div>

              {/* Detalle expandible */}
              {abierto && detalle[orden.id] && (
                <div style={e.cardDetalle}>
                  <table style={e.tabla}>
                    <thead>
                      <tr>
                        <th style={{ ...e.th, textAlign: 'left' }}>Producto</th>
                        <th style={{ ...e.th, width: 140 }}>Departamento</th>
                        <th style={{ ...e.th, width: 90 }}>Pedido</th>
                        <th style={{ ...e.th, width: 90 }}>Costo</th>
                        <th style={{ ...e.th, width: 80 }}>Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalle[orden.id].items.map((it, i) => (
                        <tr key={it.id} style={i % 2 === 1 ? { background: 'rgba(0,0,0,0.03)' } : undefined}>
                          <td style={{ ...e.td, textAlign: 'left', fontWeight: 600 }}>{it.nombre}</td>
                          <td style={e.td}>{it.departamento || '—'}</td>
                          <td style={{ ...e.td, fontWeight: 700 }}>{it.cantidad_pedida}</td>
                          <td style={e.td}>{it.costo_unitario ? `$${parseFloat(it.costo_unitario).toFixed(2)}` : '—'}</td>
                          <td style={{ ...e.td, color: parseFloat(it.stock_actual) <= 0 ? '#c02020' : '#1a7a3a', fontWeight: 600 }}>
                            {it.stock_actual ?? '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal recibir */}
      {ordenRecibir && (
        <ModalRecibir
          orden={ordenRecibir}
          onClose={() => setOrdenRecibir(null)}
          onDone={() => { setOrdenRecibir(null); cargar() }}
        />
      )}
    </div>
  )
}

// ── Sub-tabs: Órdenes | Nueva Entrada ─────────────────────────────────────────
export default function TabOrdenesCompra({ usuario, productoPreseleccionado, onProductoAgregado }) {
  const [subTab, setSubTab] = useState(productoPreseleccionado ? 'entrada' : 'ordenes')

  useEffect(() => {
    if (productoPreseleccionado) setSubTab('entrada')
  }, [productoPreseleccionado])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div style={e.subNav}>
        <button className={`sub-nav-btn${subTab === 'ordenes' ? ' active' : ''}`}
          onClick={() => setSubTab('ordenes')}>
          Ordenes de Compra
        </button>
        <button className={`sub-nav-btn${subTab === 'entrada' ? ' active' : ''}`}
          onClick={() => setSubTab('entrada')}>
          Nueva Entrada
        </button>
      </div>
      {subTab === 'ordenes' && <VistaOrdenes usuario={usuario} />}
      {subTab === 'entrada' && (
        <VistaNuevaEntrada usuario={usuario} onDone={() => setSubTab('ordenes')} productoPreseleccionado={productoPreseleccionado} onProductoAgregado={onProductoAgregado} />
      )}
    </div>
  )
}

// ── Vista: Nueva Entrada manual ───────────────────────────────────────────────
import { useRef } from 'react'

function VistaNuevaEntrada({ usuario, onDone, productoPreseleccionado, onProductoAgregado }) {
  const [proveedores, setProveedores] = useState([])
  const [proveedorId, setProveedorId] = useState('')
  const [notas, setNotas]             = useState('')
  const [items, setItems]             = useState([])
  const [busqueda, setBusqueda]       = useState('')
  const [resultados, setResultados]   = useState([])
  const [modalItem, setModalItem]     = useState(null)
  const [mensaje, setMensaje]         = useState('')
  const [guardando, setGuardando]     = useState(false)
  const inputRef = useRef()

  useEffect(() => {
    api.listarProveedores().then(res => setProveedores(Array.isArray(res) ? res : []))
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (productoPreseleccionado && productoPreseleccionado.id) {
      setModalItem({
        producto_id:      productoPreseleccionado.id,
        nombre:           productoPreseleccionado.nombre,
        codigo_barras:    productoPreseleccionado.codigo_barras,
        stock_actual:     productoPreseleccionado.cantidad,
        costo_orig:       productoPreseleccionado.costo  ? parseFloat(productoPreseleccionado.costo)  : 0,
        precio_orig:      productoPreseleccionado.precio ? parseFloat(productoPreseleccionado.precio) : 0,
        cantidad:         '',
        costo_nuevo:      productoPreseleccionado.costo  ? String(parseFloat(productoPreseleccionado.costo).toFixed(2))  : '',
        precio_nuevo:     productoPreseleccionado.precio ? String(parseFloat(productoPreseleccionado.precio).toFixed(2)) : '',
        esPreseleccionado: true,
        proveedor_id:     '',
      })
    }
  }, [productoPreseleccionado])

  const buscar = async (q) => {
    setBusqueda(q)
    if (!q.trim()) { setResultados([]); return }
    try {
      const res = await api.buscarProducto(q, usuario.negocio_id)
      setResultados(Array.isArray(res) ? res : [])
    } catch { setResultados([]) }
  }

  const seleccionar = (p) => {
    setBusqueda(''); setResultados([])
    setModalItem({
      producto_id:  p.id,
      nombre:       p.nombre,
      codigo_barras: p.codigo_barras,
      stock_actual: p.stock_actual,
      costo_orig:   p.costo   ? parseFloat(p.costo)   : 0,
      precio_orig:  p.precio  ? parseFloat(p.precio)  : 0,
      cantidad:     '',
      costo_nuevo:  p.costo   ? String(parseFloat(p.costo).toFixed(2))  : '',
      precio_nuevo: p.precio  ? String(parseFloat(p.precio).toFixed(2)) : '',
    })
  }

  const editarItem = (item) => {
    setModalItem({
      producto_id:   item.producto_id,
      nombre:        item.nombre,
      codigo_barras: item.codigo_barras,
      stock_actual:  null,
      costo_orig:    item.costo_display || 0,
      precio_orig:   item.precio_display || 0,
      cantidad:      String(item.cantidad),
      costo_nuevo:   String((item.costo_display || 0).toFixed(2)),
      precio_nuevo:  String((item.precio_display || 0).toFixed(2)),
    })
  }

  const handleCostoChange = (val) => {
    const n = parseFloat(val)
    let precioCalc = modalItem.precio_nuevo
    if (modalItem.costo_orig > 0 && modalItem.precio_orig > 0 && n > 0) {
      const margen = (modalItem.precio_orig - modalItem.costo_orig) / modalItem.precio_orig
      if (margen > 0) precioCalc = (n / (1 - margen)).toFixed(2)
    }
    setModalItem(prev => ({ ...prev, costo_nuevo: val, precio_nuevo: precioCalc }))
  }

  const confirmarModal = async () => {
    const cant = parseFloat(modalItem.cantidad)
    if (!cant || cant <= 0) return
    const costoNum  = parseFloat(modalItem.costo_nuevo)  || null
    const precioNum = parseFloat(modalItem.precio_nuevo) || null

    if (modalItem.esPreseleccionado) {
      if (!modalItem.proveedor_id) { setMensaje('Selecciona un proveedor'); return }
      setGuardando(true); setMensaje('')
      try {
        const provSel = proveedores.find(p => p.id === parseInt(modalItem.proveedor_id))
        const ordenRes = await api.crearOrdenCompra({
          negocio_id:       usuario.negocio_id,
          proveedor_id:     parseInt(modalItem.proveedor_id),
          proveedor_nombre: provSel?.nombre,
          items: [{ producto_id: modalItem.producto_id, cantidad: cant, costo_unitario: costoNum || null }],
        })
        if (ordenRes?.error) { setMensaje(ordenRes.error); return }
        setModalItem(null)
        onProductoAgregado?.()
        onDone?.()
      } catch(e) { setMensaje(e.message) }
      finally { setGuardando(false) }
      return
    }

    setItems(prev => {
      const idx = prev.findIndex(i => i.producto_id === modalItem.producto_id)
      const nuevo = {
        producto_id:    modalItem.producto_id,
        nombre:         modalItem.nombre,
        codigo_barras:  modalItem.codigo_barras,
        cantidad:       cant,
        costo_display:  costoNum,
        precio_display: precioNum,
        costo_unitario: costoNum !== modalItem.costo_orig ? costoNum : null,
        precio_nuevo:   precioNum !== modalItem.precio_orig ? precioNum : null,
        subtotal:       cant * (costoNum || 0),
      }
      if (idx >= 0) { const u = [...prev]; u[idx] = nuevo; return u }
      return [...prev, nuevo]
    })
    setModalItem(null); setMensaje(''); inputRef.current?.focus()
    onProductoAgregado?.()
  }

  const quitar = (producto_id) => setItems(prev => prev.filter(i => i.producto_id !== producto_id))
  const total = items.reduce((s, i) => s + (i.subtotal || 0), 0)

  const guardar = async () => {
    if (!proveedorId)        { setMensaje('Selecciona un proveedor'); return }
    if (items.length === 0)  { setMensaje('Agrega al menos un producto'); return }
    setGuardando(true); setMensaje('')
    try {
      const provSel = proveedores.find(p => p.id === parseInt(proveedorId))

      // 1. Crear la orden
      const ordenRes = await api.crearOrdenCompra({
        negocio_id:       usuario.negocio_id,
        proveedor_id:     parseInt(proveedorId),
        proveedor_nombre: provSel?.nombre,
        items: items.map(i => ({
          producto_id:    i.producto_id,
          cantidad:       i.cantidad,
          costo_unitario: i.costo_display || null,
        })),
      })
      if (ordenRes?.error) { setMensaje(ordenRes.error); return }

      // 2. Recibirla inmediatamente (crea entrada + actualiza inventario)
      const recibirRes = await api.recibirOrdenCompra(ordenRes.orden_id, {
        notas: notas || null,
        items: items.map(i => ({
          producto_id:       i.producto_id,
          cantidad_recibida: i.cantidad,
          costo_unitario:    i.costo_unitario || null,
          precio_nuevo:      i.precio_nuevo   || null,
        })),
      })
      onDone && onDone()
    } catch(e) { setMensaje(e.message) }
    finally { setGuardando(false) }
  }

  return (
    <div style={e.shell}>
      {/* Barra superior */}
      <div style={e2.topBar}>
        <span style={e2.topLabel}>Proveedor *</span>
        <select className="pos-input" style={e2.topSelect}
          value={proveedorId} onChange={ev => { setProveedorId(ev.target.value); setMensaje('') }}>
          <option value="">-- Selecciona un proveedor --</option>
          {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <span style={e2.topLabel}>Notas:</span>
        <input className="pos-input" style={e2.topInput} placeholder="Factura, referencia..."
          value={notas} onChange={ev => setNotas(ev.target.value)} />
        <div style={{ flex: 1 }} />
        <div style={{ position: 'relative' }}>
          <input ref={inputRef} className="pos-input" style={e2.topBusqueda}
            placeholder="Escanear o buscar producto..." value={busqueda}
            onChange={ev => buscar(ev.target.value)} />
          {resultados.length > 0 && (
            <div style={e2.dropdown}>
              {resultados.slice(0, 12).map(p => (
                <div key={p.id} style={e2.dropRow} onClick={() => seleccionar(p)}>
                  <span style={e2.dropCod}>{p.codigo_barras || '—'}</span>
                  <span style={e2.dropNom}>{p.nombre}</span>
                  <span style={e2.dropPrc}>${parseFloat(p.precio || 0).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div style={e.tablaWrap}>
        <table style={e.tabla}>
          <thead>
            <tr>
              <th style={{ ...e.th, width: 120 }}>Codigo</th>
              <th style={{ ...e.th, textAlign: 'left' }}>Producto</th>
              <th style={{ ...e.th, width: 80 }}>Cantidad</th>
              <th style={{ ...e.th, width: 90 }}>Costo Unit.</th>
              <th style={{ ...e.th, width: 90 }}>Precio Venta</th>
              <th style={{ ...e.th, width: 90 }}>Subtotal</th>
              <th style={{ ...e.th, width: 70 }}></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={7} style={{ ...e.td, color: '#bbb', textAlign: 'center', padding: '28px 0', fontSize: 12 }}>
                Escanea o busca un producto para agregar a la entrada
              </td></tr>
            ) : items.map((item, i) => (
              <tr key={item.producto_id} style={i % 2 === 1 ? { background: '#fffff0' } : undefined}>
                <td style={{ ...e.td, fontFamily: 'monospace', fontSize: 11 }}>{item.codigo_barras || '—'}</td>
                <td style={{ ...e.td, textAlign: 'left', fontWeight: 600 }}>{item.nombre}</td>
                <td style={{ ...e.td, fontWeight: 700 }}>{item.cantidad}</td>
                <td style={e.td}>${(item.costo_display || 0).toFixed(2)}</td>
                <td style={e.td}>{item.precio_display ? `$${item.precio_display.toFixed(2)}` : '—'}</td>
                <td style={{ ...e.td, fontWeight: 700 }}>${(item.subtotal || 0).toFixed(2)}</td>
                <td style={e.td}>
                  <button className="pos-btn" style={{ fontSize: 10, padding: '1px 6px' }}
                    onClick={() => editarItem(item)}>Editar</button>
                  <button className="pos-btn pos-btn-danger" style={{ fontSize: 10, padding: '1px 5px', marginLeft: 3 }}
                    onClick={() => quitar(item.producto_id)}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={e.footer}>
        {mensaje && (
          <span style={{ fontSize: 12, fontWeight: 600, color: mensaje.includes('Error') ? '#c00' : '#2a7a2a' }}>
            {mensaje}
          </span>
        )}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: '#555' }}>{items.length} producto(s)</span>
        <span style={{ fontSize: 16, fontWeight: 800, color: '#1e3a5f', marginLeft: 16 }}>
          ${total.toFixed(2)}
        </span>
        <button className="pos-btn pos-btn-primary" style={e.btnFooter}
          disabled={!proveedorId || items.length === 0 || guardando} onClick={guardar}>
          {guardando ? 'Guardando...' : 'Guardar Entrada'}
        </button>
      </div>

      {/* Modal Ordenar producto */}
      {modalItem && (
        <div style={e.overlay}>
          <div style={{ ...e.recibirModal, width: 360 }}>
            <div style={e.modalHeader}>
              <span style={e.modalTitulo}>Ordenar — {modalItem.nombre}</span>
              <button style={e.btnX} onClick={() => setModalItem(null)}>&#10005;</button>
            </div>
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={e.infoFila}>
                <span style={e.infoLabel}>Hay:</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: parseFloat(modalItem.stock_actual) <= 0 ? '#c02020' : '#1a7a3a' }}>
                  {modalItem.stock_actual !== null ? `${modalItem.stock_actual} piezas` : '— piezas'}
                </span>
              </div>
              <div style={e.infoFila}>
                <span style={e.infoLabel}>Costo Actual:</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#1a1a1a' }}>${(modalItem.costo_orig || 0).toFixed(2)}</span>
              </div>
              <div style={e.infoFila}>
                <span style={e.infoLabel}>Cantidad:</span>
                <input className="pos-input" style={e.inputOrdenar} type="number" min="1" step="1"
                  value={modalItem.cantidad} autoFocus
                  onChange={ev => setModalItem(prev => ({ ...prev, cantidad: ev.target.value }))} />
              </div>
              <div style={e.infoFila}>
                <span style={e.infoLabel}>Nuevo Costo:</span>
                <input className="pos-input" style={e.inputOrdenar} type="number" min="0" step="0.01"
                  value={modalItem.costo_nuevo}
                  onChange={ev => handleCostoChange(ev.target.value)} />
              </div>
              <div style={e.infoFila}>
                <span style={e.infoLabel}>Precio Venta:</span>
                <input className="pos-input" style={e.inputOrdenar} type="number" min="0" step="0.01"
                  value={modalItem.precio_nuevo}
                  onChange={ev => setModalItem(prev => ({ ...prev, precio_nuevo: ev.target.value }))} />
              </div>
              {modalItem.esPreseleccionado && (
                <div style={e.infoFila}>
                  <span style={e.infoLabel}>Proveedor:</span>
                  <select className="pos-input" style={{ ...e.inputOrdenar, width: 160, fontSize: 12 }}
                    value={modalItem.proveedor_id}
                    onChange={ev => setModalItem(prev => ({ ...prev, proveedor_id: ev.target.value }))}>
                    <option value="">-- Selecciona --</option>
                    {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
              )}
            </div>
            {mensaje && (
              <div style={{ padding: '0 14px 8px', fontSize: 12, color: '#c00', fontWeight: 600 }}>{mensaje}</div>
            )}
            <div style={e.recibirFooter}>
              <div style={{ flex: 1 }} />
              <button className="pos-btn pos-btn-success" style={{ padding: '4px 16px', fontSize: 12 }}
                onClick={confirmarModal}
                disabled={guardando || !modalItem.cantidad || parseFloat(modalItem.cantidad) <= 0}>
                {guardando ? 'Guardando...' : (modalItem.esPreseleccionado ? 'Guardar Entrada' : 'Aceptar')}
              </button>
              <button className="pos-btn" style={{ padding: '4px 14px', fontSize: 12 }}
                onClick={() => setModalItem(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const e2 = {
  topBar:      { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderBottom: '2px solid #d8d0c0', background: '#f5f3ee', flexShrink: 0 },
  topLabel:    { fontSize: 11, fontWeight: 700, color: '#555', whiteSpace: 'nowrap' },
  topSelect:   { fontSize: 12, padding: '3px 6px', width: 200 },
  topInput:    { fontSize: 12, padding: '3px 6px', width: 160 },
  topBusqueda: { fontSize: 12, padding: '3px 8px', width: 260 },
  dropdown:    { position: 'absolute', top: '100%', right: 0, zIndex: 50, background: '#fff', border: '1px solid #bbb', borderTop: 'none', borderRadius: '0 0 3px 3px', width: 400, boxShadow: '0 4px 12px rgba(0,0,0,.15)', maxHeight: 260, overflowY: 'auto' },
  dropRow:     { display: 'flex', alignItems: 'center', padding: '5px 10px', cursor: 'pointer', borderBottom: '1px solid #eee', gap: 8 },
  dropCod:     { width: 100, fontSize: 11, fontFamily: 'monospace', color: '#888', flexShrink: 0 },
  dropNom:     { flex: 1, fontSize: 12, color: '#1a1a1a' },
  dropPrc:     { fontSize: 12, fontWeight: 700, color: '#1e3a5f', flexShrink: 0 },
}

const e = {
  shell:         { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', background: '#fff', color: '#1a1a1a' },
  subNav:        { display: 'flex', borderBottom: '2px solid #d8d0c0', background: '#f0ede5' },
  topBar:        { display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderBottom: '1px solid #e0e0e0', background: '#fafaf8', flexShrink: 0 },
  topLabel:      { fontSize: 11, fontWeight: 700, color: '#555' },
  filtroBtn:     { fontSize: 12, padding: '3px 12px', height: 26 },
  listaWrap:     { flex: 1, overflowY: 'auto', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 10 },
  centro:        { padding: 30, textAlign: 'center', color: '#999', fontSize: 13 },
  card:          { border: '1px solid #e0d8c0', borderRadius: 5, overflow: 'hidden' },
  cardHeader:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', gap: 12, flexWrap: 'wrap' },
  cardLeft:      { display: 'flex', alignItems: 'center', gap: 10, flex: 1, flexWrap: 'wrap' },
  badge:         { fontSize: 10, fontWeight: 700, color: '#fff', padding: '2px 8px', borderRadius: 10, flexShrink: 0 },
  cardProv:      { fontSize: 13, fontWeight: 700, color: '#1a1a1a' },
  cardSub:       { fontSize: 11, color: '#666' },
  cardBtns:      { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  cardBtn:       { fontSize: 11, padding: '3px 10px' },
  entradaRef:    { fontSize: 11, color: '#16A34A', fontWeight: 600, padding: '0 6px' },
  cardDetalle:   { borderTop: '1px solid #e0d8c0', padding: '0 0 4px' },
  tablaWrap:     { flex: 1, overflowY: 'auto' },
  tabla:         { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th:            { padding: '4px 8px', background: '#f0ede5', color: '#333', fontWeight: 600, textAlign: 'center', borderBottom: '2px solid #d8d0c0', position: 'sticky', top: 0, zIndex: 1, whiteSpace: 'nowrap' },
  td:            { padding: '4px 8px', color: '#1a1a1a', borderBottom: '1px solid #eee', textAlign: 'center' },
  footer:        { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderTop: '1px solid #ddd', background: '#fafaf8', flexShrink: 0 },
  btnFooter:     { fontSize: 12, padding: '4px 16px' },
  overlay:       { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  recibirModal:  { background: '#fff', border: '1px solid #999', borderRadius: 4, width: 640, maxWidth: '95vw', boxShadow: '0 8px 30px rgba(0,0,0,.3)', display: 'flex', flexDirection: 'column', maxHeight: '85vh' },
  modalHeader:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: '#1E3A5F', borderRadius: '4px 4px 0 0', flexShrink: 0 },
  modalTitulo:   { fontSize: 13, fontWeight: 700, color: '#fff' },
  btnX:          { background: 'transparent', border: 'none', color: '#fff', fontSize: 15, cursor: 'pointer', padding: '0 4px', lineHeight: 1 },
  recibirTablaWrap: { flex: 1, overflowY: 'auto' },
  recibirFooter: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderTop: '1px solid #e0e0e0', background: '#f5f5f3', flexShrink: 0 },
  inputTabla:    { fontSize: 11, padding: '2px 5px', width: 75, textAlign: 'center' },
  infoFila:      { display: 'flex', alignItems: 'center', gap: 10 },
  infoLabel:     { fontSize: 12, color: '#555', width: 100, textAlign: 'right', flexShrink: 0 },
  inputOrdenar:  { fontSize: 13, padding: '3px 6px', width: 90, fontWeight: 700 },
}
