import { useState, useRef, useEffect } from 'react'
import { X, Check } from 'lucide-react'
import { api } from '../../api'

export default function ModalVarios({ negocio_id, onAgregar, onCerrar }) {
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState([])
  const [indiceSeleccionado, setIndiceSeleccionado] = useState(-1)
  const [producto, setProducto] = useState(null)
  const [cantidad, setCantidad] = useState('')
  const [error, setError] = useState('')
  const inputBusquedaRef = useRef()
  const inputCantidadRef = useRef()

  useEffect(() => {
    inputBusquedaRef.current?.focus()
  }, [])

  const buscar = async (q) => {
    setBusqueda(q)
    setIndiceSeleccionado(-1)
    setError('')
    if (!q.trim()) {
      setResultados([])
      return
    }
    try {
      const res = await api.buscarProducto(q, negocio_id)
      setResultados(Array.isArray(res) ? res : [])
    } catch (e) {
      setError('Error al buscar producto')
    }
  }

  const seleccionarProducto = (prod) => {
    setProducto(prod)
    setBusqueda('')
    setResultados([])
    setIndiceSeleccionado(-1)
    setCantidad('')
    setError('')
    setTimeout(() => inputCantidadRef.current?.focus(), 100)
  }

  const confirmar = () => {
    const cant = parseFloat(cantidad) || 0
    if (!producto) {
      setError('Seleccione un producto')
      return
    }
    if (cant <= 0) {
      setError('Ingrese cantidad válida (mayor a 0)')
      return
    }
    onAgregar(producto, cant)
    onCerrar()
  }

  const handleBusquedaKeyDown = (e) => {
    // Navegación con flechas
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIndiceSeleccionado(prev =>
        prev < resultados.length - 1 ? prev + 1 : prev
      )
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIndiceSeleccionado(prev => prev > 0 ? prev - 1 : -1)
      return
    }

    // Enter solo si hay algo seleccionado
    if (e.key === 'Enter') {
      e.preventDefault()
      if (indiceSeleccionado >= 0 && resultados[indiceSeleccionado]) {
        seleccionarProducto(resultados[indiceSeleccionado])
      } else if (resultados.length === 1) {
        seleccionarProducto(resultados[0])
      } else if (resultados.length > 0) {
        const exacto = resultados.find(p =>
          p.codigo_barras === busqueda.trim() || String(p.id) === busqueda.trim()
        )
        if (exacto) seleccionarProducto(exacto)
      }
    }
  }

  const handleCantidadKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      confirmar()
    }
  }

  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal-dialog" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Agregar Varios (INS)</h3>
          <button className="close-btn" onClick={onCerrar}><X size={16} /></button>
        </div>

        <div className="modal-body">
          {/* Búsqueda de producto - se oculta cuando hay producto seleccionado */}
          {!producto && (
            <div className="form-group">
              <label>Código o nombre del producto</label>
              <div style={{ position: 'relative' }}>
                <input
                  ref={inputBusquedaRef}
                  type="text"
                  value={busqueda}
                  onChange={e => buscar(e.target.value)}
                  onKeyDown={handleBusquedaKeyDown}
                  placeholder="Escanee o escriba el código/nombre..."
                  autoComplete="off"
                />
                {resultados.length > 0 && (
                  <div className="busqueda-dropdown">
                    {resultados.map((p, idx) => (
                      <div
                        key={p.id}
                        className={`busqueda-item ${idx === indiceSeleccionado ? 'busqueda-item-active' : ''}`}
                        onClick={() => seleccionarProducto(p)}
                      >
                        <span className="busqueda-codigo">{p.codigo_barras || '—'}</span>
                        <span className="busqueda-nombre">{p.nombre}</span>
                        <span className="busqueda-precio">${parseFloat(p.precio).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Producto seleccionado */}
          {producto && (
            <div className="producto-info">
              <p style={{ margin: '0 0 8px 0' }}><strong>{producto.nombre}</strong></p>
              <p style={{ margin: '4px 0', fontSize: '12px', color: '#666' }}>Código: {producto.codigo_barras || '—'}</p>
              <p style={{ margin: '4px 0', fontSize: '12px', fontWeight: '600', color: '#2563a8' }}>Precio: ${parseFloat(producto.precio).toFixed(2)}</p>
            </div>
          )}

          {/* Campo de cantidad (siempre visible) */}
          <div className="form-group">
            <label>Cantidad</label>
            <input
              ref={inputCantidadRef}
              type="number"
              value={cantidad}
              onChange={e => setCantidad(e.target.value)}
              onKeyDown={handleCantidadKeyDown}
              placeholder="0.00"
              step="0.01"
              min="0"
              autoComplete="off"
            />
          </div>

          {/* Botón para cambiar producto */}
          {producto && (
            <button
              onClick={() => {
                setProducto(null)
                setBusqueda('')
                setResultados([])
                setCantidad('')
                inputBusquedaRef.current?.focus()
              }}
              style={{ marginTop: '10px', width: '100%', padding: '6px', fontSize: '12px' }}
              className="pos-btn"
            >
              Cambiar producto
            </button>
          )}

          {error && <p className="error-msg">{error}</p>}
        </div>

        <div className="modal-footer">
          <button onClick={onCerrar} className="btn-cancel">Cancelar</button>
          <button
            onClick={confirmar}
            className="btn-confirm"
            disabled={!producto || !cantidad}
            style={{ opacity: !producto || !cantidad ? 0.5 : 1 }}
          >
            Agregar {cantidad || '0'} unidades
          </button>
        </div>
      </div>
    </div>
  )
}
