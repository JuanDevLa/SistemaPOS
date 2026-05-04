import { useState, useRef, useEffect } from 'react'
import { api } from '../../api'

export default function TabEliminar({ usuario }) {
  const [codigo, setCodigo]         = useState('')
  const [producto, setProducto]     = useState(null)
  const [buscando, setBuscando]     = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [error, setError]           = useState('')
  const [exito, setExito]           = useState('')
  const [confirmar, setConfirmar]   = useState(false)
  const inputRef = useRef()

  useEffect(() => { inputRef.current?.focus() }, [])

  const buscar = async () => {
    const q = codigo.trim()
    if (!q) return
    setBuscando(true); setError(''); setProducto(null); setExito('')
    try {
      const res = await api.buscarProducto(q, usuario.negocio_id)
      const p = Array.isArray(res) ? res[0] : res
      if (!p || !p.id) { setError('Producto no encontrado'); return }
      setProducto(p)
    } catch(e) {
      setError(e.message)
    } finally {
      setBuscando(false)
    }
  }

  const eliminar = async () => {
    if (!producto) return
    setEliminando(true); setError('')
    try {
      await api.desactivarProducto(producto.id)
      setExito(`Producto "${producto.nombre}" eliminado correctamente`)
      setProducto(null); setCodigo(''); setConfirmar(false)
      inputRef.current?.focus()
    } catch(e) {
      setError(e.message)
      setConfirmar(false)
    } finally {
      setEliminando(false)
    }
  }

  const cancelar = () => {
    setProducto(null); setCodigo('')
    setError(''); setExito(''); setConfirmar(false)
    inputRef.current?.focus()
  }

  // ── Fase 1: búsqueda ──
  if (!producto) {
    return (
      <div style={e.shell}>
        <div style={e.card}>
          <div style={e.cardTitulo}>Eliminar Producto</div>
          <div style={e.inputRow}>
            <span style={e.icono}>&#9638;</span>
            <input
              ref={inputRef}
              className="pos-input"
              style={e.input}
              placeholder="Codigo de barras o nombre..."
              value={codigo}
              onChange={ev => { setCodigo(ev.target.value); setError(''); setExito('') }}
              onKeyDown={ev => ev.key === 'Enter' && buscar()}
            />
          </div>
          {error && <div style={e.errorMsg}>{error}</div>}
          {exito && <div style={e.exitoMsg}>{exito}</div>}
          <button
            className="pos-btn pos-btn-success"
            style={e.btnAceptar}
            onClick={buscar}
            disabled={buscando || !codigo.trim()}
          >
            {buscando ? 'Buscando...' : '\u2714 Aceptar'}
          </button>
        </div>
      </div>
    )
  }

  // ── Fase 2: producto encontrado ──
  return (
    <div style={e.fase2Shell}>
      <div style={e.titulo}>ELIMINAR PRODUCTO</div>

      <div style={e.filas}>
        <div style={e.fila}>
          <label style={e.label}>Codigo:</label>
          <input className="pos-input" style={e.inputRO} value={producto.codigo_barras || codigo} readOnly />
        </div>
        <div style={e.fila}>
          <label style={e.label}>Descripcion:</label>
          <input className="pos-input" style={e.inputRO} value={producto.nombre} readOnly />
        </div>
        <div style={e.fila}>
          <label style={e.label}>Se vende:</label>
          <input className="pos-input" style={{ ...e.inputRO, width: 120 }}
            value={producto.unidad === 'pieza' ? 'Por Unidad' : producto.unidad === 'granel' ? 'A Granel' : 'Paquete'}
            readOnly />
        </div>
        <div style={e.fila}>
          <label style={e.label}>Precio Costo:</label>
          <input className="pos-input" style={{ ...e.inputRO, width: 100 }}
            value={`$${parseFloat(producto.costo || 0).toFixed(2)}`} readOnly />
        </div>
        <div style={e.fila}>
          <label style={e.label}>Precio Venta:</label>
          <input className="pos-input" style={{ ...e.inputRO, width: 100 }}
            value={`$${parseFloat(producto.precio).toFixed(2)}`} readOnly />
        </div>
        <div style={e.fila}>
          <label style={e.label}>Departamento:</label>
          <input className="pos-input" style={{ ...e.inputRO, width: 180 }}
            value={producto.departamento_nombre || '- Sin Departamento -'} readOnly />
        </div>
      </div>

      {error && <div style={{ ...e.errorMsg, marginLeft: 116 }}>{error}</div>}

      <div style={{ marginLeft: 116, marginTop: 6 }}>
        <button
          className="pos-btn"
          style={e.btnEliminar}
          onClick={() => setConfirmar(true)}
          disabled={eliminando}
        >
          &#128465; Eliminar este Producto
        </button>
      </div>

      {/* Confirmación */}
      {confirmar && (
        <div style={e.overlay}>
          <div style={e.modal}>
            <div style={e.modalTitulo}>Confirmar eliminacion</div>
            <div style={e.modalCuerpo}>
              Deseas eliminar <strong>{producto.nombre}</strong>?<br />
              <span style={{ fontSize: 11, color: '#888' }}>
                El historial de ventas se conserva. Esta accion no se puede deshacer.
              </span>
            </div>
            <div style={e.modalBtns}>
              <button className="pos-btn" onClick={() => setConfirmar(false)} disabled={eliminando}>
                No
              </button>
              <button className="pos-btn pos-btn-danger" onClick={eliminar} disabled={eliminando}>
                {eliminando ? 'Eliminando...' : 'Si, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const e = {
  // Fase 1
  shell: {
    display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center',
    background: '#f5f5f3',
  },
  card: {
    background: '#fff', border: '1px solid #ccc', borderRadius: 4,
    padding: '20px 24px', width: 340,
    display: 'flex', flexDirection: 'column', gap: 10,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  cardTitulo: {
    fontSize: 15, color: '#333', textAlign: 'center', marginBottom: 4,
  },
  inputRow: {
    display: 'flex', alignItems: 'center', border: '1px solid #bbb',
    borderRadius: 3, overflow: 'hidden',
  },
  icono: {
    padding: '0 8px', fontSize: 16, color: '#888', background: '#f0f0f0',
    borderRight: '1px solid #bbb', lineHeight: '28px', userSelect: 'none',
  },
  input: {
    flex: 1, border: 'none', outline: 'none',
    fontSize: 13, padding: '4px 8px', background: 'transparent',
  },
  btnAceptar: { width: '100%', fontSize: 13, padding: '6px 0' },
  errorMsg:   { fontSize: 12, color: '#c00', textAlign: 'center' },
  exitoMsg:   { fontSize: 12, color: '#2a7a2a', textAlign: 'center' },

  // Fase 2
  fase2Shell: {
    display: 'flex', flexDirection: 'column', flex: 1,
    background: '#fff', color: '#1a1a1a', padding: '10px 16px', gap: 4,
  },
  titulo: {
    fontSize: 14, fontWeight: 700, color: '#c8860a',
    marginBottom: 8,
  },
  filas: {
    display: 'flex', flexDirection: 'column', gap: 5,
  },
  fila: {
    display: 'flex', alignItems: 'center', gap: 6,
  },
  label: {
    fontSize: 12, color: '#444', width: 110, textAlign: 'right', flexShrink: 0,
  },
  inputRO: {
    fontSize: 12, padding: '3px 6px', background: '#ffffc0',
    border: '1px solid #ccc', width: 320,
  },
  btnEliminar: {
    fontSize: 12, padding: '4px 14px',
  },

  // Modal confirmación
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
  },
  modal: {
    background: '#fff', borderRadius: 6, width: 360,
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
  },
  modalTitulo: {
    fontSize: 14, fontWeight: 700, color: '#1a1a1a',
    padding: '12px 16px', borderBottom: '1px solid #e0e0e0',
  },
  modalCuerpo: {
    padding: '14px 16px', fontSize: 13, color: '#333', lineHeight: 1.6,
  },
  modalBtns: {
    display: 'flex', justifyContent: 'flex-end', gap: 8,
    padding: '10px 16px', borderTop: '1px solid #e0e0e0',
  },
}
