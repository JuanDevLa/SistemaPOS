import { useState, useRef } from 'react'
import { api } from '../../api'

export default function TabCargaInicial({ usuario }) {
  const [cargaItems, setCargaItems]                       = useState([])
  const [busqueda, setBusqueda]                           = useState('')
  const [resultados, setResultados]                       = useState([])
  const [cantidad, setCantidad]                           = useState('')
  const [alertaMinima, setAlertaMinima]                   = useState('')
  const [productoSel, setProductoSel]                     = useState(null)
  const [mensaje, setMensaje]                             = useState('')
  const inputRef = useRef()

  const buscar = async (q) => {
    setBusqueda(q); setProductoSel(null)
    if (!q) { setResultados([]); return }
    try {
      const res = await api.buscarProducto(q, usuario.negocio_id)
      setResultados(Array.isArray(res) ? res : [])
    } catch { setResultados([]) }
  }

  const seleccionar = (p) => {
    setProductoSel(p); setBusqueda(''); setResultados([])
    setCantidad(''); setAlertaMinima(''); setMensaje('')
  }

  const agregar = () => {
    if (!productoSel) { setMensaje('Seleccione un producto'); return }
    if (!cantidad || parseFloat(cantidad) <= 0) { setMensaje('Cantidad inválida'); return }
    if (cargaItems.find(i => i.id === productoSel.id)) { setMensaje('Ya en la carga'); return }
    setCargaItems(prev => [...prev, {
      id: productoSel.id, producto_id: productoSel.id,
      nombre: productoSel.nombre, codigo_barras: productoSel.codigo_barras,
      cantidad: parseFloat(cantidad),
      alerta_minima: alertaMinima ? parseFloat(alertaMinima) : 10
    }])
    setProductoSel(null); setCantidad(''); setAlertaMinima(''); setMensaje('')
    inputRef.current?.focus()
  }

  const guardar = async () => {
    if (cargaItems.length === 0) { setMensaje('Agregue productos'); return }
    try {
      const res = await api.registrarCargaInicial({
        negocio_id: usuario.negocio_id,
        productos: cargaItems.map(i => ({ producto_id: i.producto_id, cantidad: i.cantidad, alerta_minima: i.alerta_minima }))
      })
      setMensaje(`Carga completada (${res.total} productos)`)
      setCargaItems([])
    } catch(e) {
      setMensaje(e.message)
    }
  }

  return (
    <div style={e.mainContent}>
      <div style={e.leftPanel}>
        <div className="panel-header">CARGA INICIAL DE INVENTARIO</div>
        <div style={{ padding: 14, flex: 1, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'auto' }}>
          <p style={{ fontSize: 12, color: '#777' }}>Registra el stock inicial de cada producto.</p>
          <input ref={inputRef} className="pos-input" style={{ width: '100%' }} placeholder="Escanear o buscar producto..." value={busqueda} onChange={ev => buscar(ev.target.value)} autoFocus />
          {productoSel && (
            <div style={e.productoSel}>
              <div style={{ fontWeight: 700, color: '#1a1a1a' }}>{productoSel.nombre}</div>
              <div style={{ fontSize: 12, color: '#666' }}>{productoSel.codigo_barras}</div>
            </div>
          )}
          {resultados.map(p => (
            <div key={p.id} style={e.productoRow} onClick={() => seleccionar(p)}>
              <span style={e.productoCod}>{p.codigo_barras}</span>
              <span style={e.productoNom}>{p.nombre}</span>
              <span style={e.productoPrc}>${parseFloat(p.precio).toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={e.rightPanel}>
        <div className="panel-header">INVENTARIO INICIAL</div>
        <div style={{ padding: 14, flex: 1, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'auto' }}>
          {productoSel && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, background: '#f8f8f8', border: '1px solid #ddd', borderRadius: 4 }}>
              <label style={e.label}>Stock Actual:</label>
              <input className="pos-input" type="number" placeholder="0" value={cantidad} onChange={ev => setCantidad(ev.target.value)} min="1" autoFocus />
              <label style={e.label}>Alerta Mínima:</label>
              <input className="pos-input" type="number" placeholder="10" value={alertaMinima} onChange={ev => setAlertaMinima(ev.target.value)} />
              <button className="pos-btn pos-btn-success" style={{ width: '100%' }} onClick={agregar}>✓ Agregar a carga</button>
            </div>
          )}
          {cargaItems.length === 0
            ? <p style={{ color: '#bbb', textAlign: 'center', marginTop: 20, fontSize: 13 }}>Escanee o busque productos</p>
            : cargaItems.map((item, idx) => (
                <div key={idx} style={e.carritoRow}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#1a1a1a' }}>{item.nombre}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>Stock: <strong>{item.cantidad}</strong> | Alerta: {item.alerta_minima}</div>
                  </div>
                  <button className="pos-btn pos-btn-danger" style={{ padding: '2px 8px' }} onClick={() => setCargaItems(prev => prev.filter(i => i.id !== item.id))}>✕</button>
                </div>
              ))
          }
        </div>
        <div style={{ padding: '10px 14px', borderTop: '2px solid #e0e0e0' }}>
          <p style={{ fontSize: 12, color: '#666', textAlign: 'center', marginBottom: 8 }}>{cargaItems.length} productos en la carga inicial</p>
          {mensaje && <p style={{ color: mensaje.includes('completada') ? '#1a7a3a' : '#c02020', fontSize: 12, textAlign: 'center', marginBottom: 8 }}>{mensaje}</p>}
          <button className="pos-btn pos-btn-primary pos-btn-lg" style={{ width: '100%' }} onClick={guardar} disabled={cargaItems.length === 0}>
            💾 Guardar Carga Inicial
          </button>
        </div>
      </div>
    </div>
  )
}

const e = {
  mainContent:  { display: 'flex', flex: 1, overflow: 'hidden' },
  leftPanel:    { flex: 1, display: 'flex', flexDirection: 'column', borderRight: '2px solid #d0d0d0', overflow: 'hidden' },
  rightPanel:   { width: 320, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  label:        { fontSize: 12, fontWeight: 700, color: '#555', display: 'block', marginBottom: 3 },
  productoSel:  { padding: 10, background: '#edfaed', border: '2px solid #4caf50', borderRadius: 4 },
  productoRow:  { display: 'flex', alignItems: 'center', padding: '8px 10px', background: '#fff', border: '1px solid #e4e4e4', borderRadius: 3, cursor: 'pointer', gap: 8 },
  productoCod:  { width: 90, fontSize: 11, fontFamily: 'monospace', color: '#888', flexShrink: 0 },
  productoNom:  { flex: 1, fontSize: 13, fontWeight: 500, color: '#1a1a1a' },
  productoPrc:  { fontWeight: 700, color: '#1e3a5f', fontSize: 13 },
  carritoRow:   { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: '#fff', border: '1px solid #e4e4e4', borderRadius: 3 },
}
