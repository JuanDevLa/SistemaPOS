import { useState, useRef } from 'react'
import { api } from '../../api'

export default function TabAjustes({ usuario }) {
  const [busqueda, setBusqueda]       = useState('')
  const [resultados, setResultados]   = useState([])
  const [producto, setProducto]       = useState(null)
  const [stockActual, setStockActual] = useState(0)
  const [delta, setDelta]             = useState('')
  const [precioCosto, setPrecioCosto] = useState('')
  const [precioVenta, setPrecioVenta] = useState('')
  const [motivo, setMotivo]           = useState('')
  const [mensaje, setMensaje]         = useState('')
  const [guardando, setGuardando]     = useState(false)
  const inputRef = useRef()

  const buscar = async (q) => {
    setBusqueda(q); setProducto(null)
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
    setDelta(''); setMotivo(''); setMensaje('')
    try {
      const inv = await api.listarInventario(usuario.negocio_id)
      const item = Array.isArray(inv) ? inv.find(i => i.producto_id === p.id) : null
      setStockActual(item ? parseFloat(item.cantidad) : 0)
    } catch { setStockActual(0) }
    setProducto(p)
  }

  const limpiar = () => {
    setProducto(null); setBusqueda(''); setResultados([])
    setDelta(''); setPrecioCosto(''); setPrecioVenta('')
    setMotivo(''); setMensaje(''); setStockActual(0)
    inputRef.current?.focus()
  }

  const guardar = async () => {
    if (!producto) return
    setGuardando(true); setMensaje('')
    const nuevaCantidad = Math.round(stockActual) + Math.round(parseFloat(delta) || 0)
    try {
      const resAdj = await api.ajustarInventario({
        producto_id: producto.id,
        negocio_id:  usuario.negocio_id,
        cantidad:    nuevaCantidad,
        notas:       motivo || 'Ajuste manual',
      })
      if (!resAdj.mensaje) {
        setMensaje(resAdj.error || 'Error al ajustar inventario')
        setGuardando(false); return
      }
      // Actualizar precios si cambiaron
      const costoOrig = parseFloat(producto.costo || 0)
      const ventaOrig = parseFloat(producto.precio || 0)
      const costoNuevo = parseFloat(precioCosto)
      const ventaNuevo = parseFloat(precioVenta)
      if (costoNuevo !== costoOrig || ventaNuevo !== ventaOrig) {
        await api.editarProducto(producto.id, {
          nombre: producto.nombre,
          precio: ventaNuevo,
          costo:  costoNuevo,
        })
      }
      setMensaje('ok')
      setTimeout(limpiar, 900)
    } catch(e) {
      setMensaje(e.message)
    } finally {
      setGuardando(false)
    }
  }

  const deltaNum      = Math.round(parseFloat(delta) || 0)
  const nuevaCantidad = Math.round(stockActual) + deltaNum
  const costoNum      = parseFloat(precioCosto) || 0
  const ventaNum      = parseFloat(precioVenta) || 0

  const infoTexto = producto
    ? `Se realizará un ajuste de ${deltaNum >= 0 ? '+' : ''}${deltaNum} para que el inventario quede en ${nuevaCantidad}, con costo de $${costoNum.toFixed(2)} y precio de venta de $${ventaNum.toFixed(2)}.`
    : ''

  return (
    <div style={e.wrap}>
      <h2 style={e.titulo}>AJUSTAR INVENTARIO</h2>

      {/* Código del producto */}
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
          <span style={e.icono}>▦</span>
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

      {producto && (
        <>
          <div style={e.fila}>
            <label style={e.lbl}>Descripción</label>
            <span style={e.valor}>{producto.nombre}</span>
          </div>

          <div style={e.fila}>
            <label style={e.lbl}>Cantidad Actual</label>
            <span style={{ ...e.valor, fontWeight: 800, fontSize: 22, color: stockActual === 0 ? '#c02020' : '#1a1a1a' }}>
              {stockActual}
            </span>
          </div>

          <div style={e.fila}>
            <label style={e.lbl}>+ / -</label>
            <input
              className="pos-input"
              type="number"
              step="1"
              style={{ width: 180 }}
              placeholder="0"
              value={delta}
              onChange={ev => setDelta(String(Math.round(parseFloat(ev.target.value) || 0) || ''))}
              autoFocus
            />
          </div>

          <div style={e.fila}>
            <label style={e.lbl}>Nueva Cantidad</label>
            <input
              className="pos-input"
              style={{ width: 180, background: '#f5f5f5', color: nuevaCantidad < 0 ? '#c02020' : '#1a1a1a', fontWeight: 700 }}
              value={nuevaCantidad}
              readOnly
            />
          </div>

          <div style={e.fila}>
            <label style={e.lbl}>Costo</label>
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
            <label style={e.lbl}>Motivo del ajuste</label>
            <input
              className="pos-input"
              style={{ width: 320 }}
              placeholder="Ej: merma, corrección, conteo físico..."
              value={motivo}
              onChange={ev => setMotivo(ev.target.value)}
            />
          </div>

          <div style={e.fila}>
            <label style={e.lbl} />
            {mensaje === 'ok' ? (
              <div style={e.infoOk}>✓ Inventario ajustado correctamente</div>
            ) : mensaje ? (
              <div style={e.infoError}>{mensaje}</div>
            ) : (
              <div style={e.infoBox}>⚠ {infoTexto}</div>
            )}
          </div>

          <div style={e.fila}>
            <label style={e.lbl} />
            <button
              className="pos-btn pos-btn-primary"
              style={{ width: 240, justifyContent: 'center' }}
              onClick={guardar}
              disabled={guardando || nuevaCantidad < 0}
            >
              {guardando ? 'Guardando...' : '🔧 Realizar ajuste de inventario'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

const e = {
  wrap:      { padding: '20px 32px', display: 'flex', flexDirection: 'column', gap: 14, flex: 1, overflow: 'auto' },
  titulo:    { fontSize: 18, fontWeight: 700, color: '#1e3a5f', margin: 0, marginBottom: 6 },
  fila:      { display: 'flex', alignItems: 'center', gap: 12 },
  lbl:       { width: 150, fontSize: 13, fontWeight: 600, color: '#555', textAlign: 'right', flexShrink: 0 },
  valor:     { fontSize: 15, fontWeight: 600, color: '#1a1a1a' },
  icono:     { position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#999', pointerEvents: 'none' },
  dropdown:  { position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #ccc', borderTop: 'none', borderRadius: '0 0 4px 4px', zIndex: 50, maxHeight: 200, overflowY: 'auto', boxShadow: '0 4px 8px rgba(0,0,0,.12)' },
  dropRow:   { display: 'flex', alignItems: 'center', padding: '7px 10px', cursor: 'pointer', gap: 8, borderBottom: '1px solid #f0f0f0' },
  dropCod:   { width: 90, fontSize: 11, fontFamily: 'monospace', color: '#888', flexShrink: 0 },
  dropNom:   { flex: 1, fontSize: 13, color: '#1a1a1a' },
  dropPrc:   { fontWeight: 700, color: '#1e3a5f', fontSize: 13 },
  infoBox:   { background: '#fffde7', border: '1px solid #f0e060', borderRadius: 4, padding: '9px 13px', fontSize: 13, color: '#666', maxWidth: 480 },
  infoOk:    { background: '#edfaed', border: '1px solid #4caf50', borderRadius: 4, padding: '9px 13px', fontSize: 13, color: '#1a7a3a', maxWidth: 480 },
  infoError: { background: '#fff0f0', border: '1px solid #e57373', borderRadius: 4, padding: '9px 13px', fontSize: 13, color: '#c02020', maxWidth: 480 },
}
