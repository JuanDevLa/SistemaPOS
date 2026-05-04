import { useState, useRef } from 'react'
import { api } from '../../api'

export default function TabEntrada({ usuario }) {
  const [busqueda, setBusqueda]       = useState('')
  const [resultados, setResultados]   = useState([])
  const [producto, setProducto]       = useState(null)
  const [stockActual, setStockActual] = useState(0)
  const [cantidad, setCantidad]       = useState('')
  const [precioCosto, setPrecioCosto] = useState('')
  const [precioVenta, setPrecioVenta] = useState('')
  const [lote, setLote]               = useState('')
  const [fechaCaducidad, setFechaCaducidad] = useState('')
  const [mensaje, setMensaje]         = useState('')
  const [guardando, setGuardando]     = useState(false)
  const inputRef = useRef()

  const buscar = async (q) => {
    setBusqueda(q)
    setProducto(null)
    if (q.length < 2) { setResultados([]); return }
    try {
      const res = await api.buscarProducto(q, usuario.negocio_id)
      setResultados(Array.isArray(res) ? res : [])
    } catch { setResultados([]) }
  }

  const seleccionar = async (p) => {
    setResultados([])
    setBusqueda(p.codigo_barras || p.nombre)
    setPrecioCosto(parseFloat(p.costo || 0).toFixed(2))
    setPrecioVenta(parseFloat(p.precio || 0).toFixed(2))
    setCantidad('')
    setLote('')
    setFechaCaducidad('')
    setMensaje('')
    try {
      const inv = await api.listarInventario(usuario.negocio_id)
      const item = Array.isArray(inv) ? inv.find(i => i.producto_id === p.id) : null
      setStockActual(item ? parseFloat(item.cantidad) : 0)
    } catch {
      setStockActual(0)
    }
    setProducto(p)
  }

  const limpiar = () => {
    setProducto(null); setBusqueda(''); setResultados([])
    setCantidad(''); setPrecioCosto(''); setPrecioVenta('')
    setLote(''); setFechaCaducidad('')
    setMensaje(''); setStockActual(0)
    inputRef.current?.focus()
  }

  const guardar = async () => {
    if (!producto) return
    if (producto.controla_lote && !lote.trim()) {
      setMensaje('Este medicamento requiere número de lote.')
      return
    }
    setGuardando(true); setMensaje('')
    try {
      const item = {
        producto_id: producto.id,
        cantidad:     Math.round(parseFloat(cantidad) || 0),
        costo_unitario: parseFloat(precioCosto) || null,
        precio_nuevo:   parseFloat(precioVenta) || null,
      }
      if (producto.controla_lote) {
        item.lote = lote.trim()
        item.fecha_caducidad = fechaCaducidad || null
      }
      const res = await api.registrarEntrada({
        negocio_id: usuario.negocio_id,
        proveedor: 'Agregar directo',
        items: [item],
      })
      setMensaje('ok')
      setTimeout(limpiar, 900)
    } catch(e) {
      setMensaje(e.message)
    } finally {
      setGuardando(false)
    }
  }

  const cantNum    = Math.round(parseFloat(cantidad) || 0)
  const costoNum   = parseFloat(precioCosto) || 0
  const ventaNum   = parseFloat(precioVenta) || 0
  const costoOrig  = producto ? parseFloat(producto.costo || 0) : 0
  const ventaOrig  = producto ? parseFloat(producto.precio || 0) : 0
  const costoInfo  = costoNum !== costoOrig ? `cambiará a $${costoNum.toFixed(2)}` : `se queda igual en $${costoNum.toFixed(2)}`
  const ventaInfo  = `$${ventaNum.toFixed(2)}`

  return (
    <div style={e.wrap}>
      <h2 style={e.titulo}>AGREGAR INVENTARIO</h2>

      {/* Campo código */}
      <div style={e.fila}>
        <label style={e.lbl}>Código del Producto</label>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <input
            ref={inputRef}
            className="pos-input"
            style={{ width: '100%', paddingLeft: 32 }}
            placeholder="Escanear o escribir código..."
            value={busqueda}
            onChange={ev => buscar(ev.target.value)}
            autoFocus
          />
          <span style={e.iconoCodigo}>▦</span>
          {resultados.length > 0 && (
            <div style={e.dropdown}>
              {resultados.map(p => (
                <div key={p.id} style={e.dropRow} onClick={() => seleccionar(p)}>
                  <span style={e.dropCod}>{p.codigo_barras}</span>
                  <span style={e.dropNom}>{p.nombre}</span>
                  <span style={e.dropPrc}>${parseFloat(p.precio).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {producto && (
          <button className="pos-btn" style={{ marginLeft: 8, padding: '4px 10px', fontSize: 12 }} onClick={limpiar}>✕ Limpiar</button>
        )}
      </div>

      {/* Datos del producto — solo si hay producto seleccionado */}
      {producto && (
        <>
          <div style={e.fila}>
            <label style={e.lbl}>Descripción</label>
            <span style={e.valor}>{producto.nombre}</span>
          </div>

          <div style={e.fila}>
            <label style={e.lbl}>Hay</label>
            <span style={{ ...e.valor, fontWeight: 800, fontSize: 22, color: stockActual === 0 ? '#c02020' : '#1a1a1a' }}>
              {stockActual}
            </span>
          </div>

          <div style={e.fila}>
            <label style={e.lbl}>Agregar</label>
            <input
              className="pos-input"
              type="number"
              min="1"
              step="1"
              style={{ width: 180 }}
              placeholder="0"
              value={cantidad}
              onChange={ev => setCantidad(String(Math.round(parseFloat(ev.target.value) || 0) || ''))}
              autoFocus
            />
          </div>

          {producto.controla_lote && (
            <>
              <div style={e.filaMed}>
                <span style={e.badgeMed}>💊 Medicamento — requiere lote</span>
              </div>
              <div style={e.fila}>
                <label style={e.lbl}>Número de Lote</label>
                <input
                  className="pos-input"
                  style={{ width: 220 }}
                  placeholder="Ej: AB2025-001"
                  value={lote}
                  onChange={ev => setLote(ev.target.value)}
                />
              </div>
              <div style={e.fila}>
                <label style={e.lbl}>Fecha Caducidad</label>
                <input
                  className="pos-input"
                  type="date"
                  style={{ width: 220 }}
                  value={fechaCaducidad}
                  onChange={ev => setFechaCaducidad(ev.target.value)}
                />
              </div>
            </>
          )}

          <div style={e.fila}>
            <label style={e.lbl}>Precio Costo</label>
            <input
              className="pos-input"
              type="number"
              step="0.01"
              style={{ width: 180 }}
              value={precioCosto}
              onChange={ev => setPrecioCosto(ev.target.value)}
            />
          </div>

          <div style={e.fila}>
            <label style={e.lbl}>Precio Venta</label>
            <input
              className="pos-input"
              type="number"
              step="0.01"
              style={{ width: 180 }}
              value={precioVenta}
              onChange={ev => setPrecioVenta(ev.target.value)}
            />
          </div>

          <div style={e.fila}>
            <label style={e.lbl} />
            <button
              className="pos-btn pos-btn-primary"
              style={{ width: 220, justifyContent: 'center' }}
              onClick={guardar}
              disabled={guardando}
            >
              {guardando ? 'Guardando...' : '💾 Agregar cantidad a Inventario'}
            </button>
          </div>

          {/* Info / mensaje */}
          {mensaje === 'ok' ? (
            <div style={e.infoOk}>✓ Inventario actualizado correctamente</div>
          ) : mensaje ? (
            <div style={e.infoError}>{mensaje}</div>
          ) : (
            <div style={e.infoBox}>
              ℹ Se recibirán <strong>{cantNum}</strong> de inventario para el producto, el costo {costoInfo}, el precio de venta será de <strong>{ventaInfo}</strong>.
            </div>
          )}
        </>
      )}
    </div>
  )
}

const e = {
  wrap:       { padding: '20px 32px', display: 'flex', flexDirection: 'column', gap: 14, flex: 1, overflow: 'auto' },
  titulo:     { fontSize: 18, fontWeight: 700, color: '#1e3a5f', margin: 0, marginBottom: 6 },
  fila:       { display: 'flex', alignItems: 'center', gap: 12 },
  lbl:        { width: 140, fontSize: 13, fontWeight: 600, color: '#555', textAlign: 'right', flexShrink: 0 },
  valor:      { fontSize: 15, fontWeight: 600, color: '#1a1a1a' },
  iconoCodigo:{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#999', pointerEvents: 'none' },
  dropdown:   { position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #ccc', borderTop: 'none', borderRadius: '0 0 4px 4px', zIndex: 50, maxHeight: 200, overflowY: 'auto', boxShadow: '0 4px 8px rgba(0,0,0,.12)' },
  dropRow:    { display: 'flex', alignItems: 'center', padding: '7px 10px', cursor: 'pointer', gap: 8, borderBottom: '1px solid #f0f0f0' },
  dropCod:    { width: 90, fontSize: 11, fontFamily: 'monospace', color: '#888', flexShrink: 0 },
  dropNom:    { flex: 1, fontSize: 13, color: '#1a1a1a' },
  dropPrc:    { fontWeight: 700, color: '#1e3a5f', fontSize: 13 },
  filaMed:    { marginLeft: 152 },
  badgeMed:   { display: 'inline-block', background: '#EFF6FF', border: '1px solid #93C5FD', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 600, color: '#1E40AF' },
  infoBox:    { background: '#fffde7', border: '1px solid #f0e060', borderRadius: 4, padding: '10px 14px', fontSize: 13, color: '#555', maxWidth: 540, marginLeft: 152 },
  infoOk:     { background: '#edfaed', border: '1px solid #4caf50', borderRadius: 4, padding: '10px 14px', fontSize: 13, color: '#1a7a3a', maxWidth: 540, marginLeft: 152 },
  infoError:  { background: '#fff0f0', border: '1px solid #e57373', borderRadius: 4, padding: '10px 14px', fontSize: 13, color: '#c02020', maxWidth: 540, marginLeft: 152 },
}
