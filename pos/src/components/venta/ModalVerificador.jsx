import { useState, useRef, useEffect } from 'react'
import { X, Check } from 'lucide-react'
import { api } from '../../api'

export default function ModalVerificador({ negocio_id, onAgregar, onCerrar }) {
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState([])
  const [indiceSeleccionado, setIndiceSeleccionado] = useState(-1)
  const [productoSeleccionado, setProductoSeleccionado] = useState(null)
  const inputRef = useRef()

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const buscar = async (q) => {
    setBusqueda(q)
    setIndiceSeleccionado(-1)
    setProductoSeleccionado(null)
    if (!q.trim()) {
      setResultados([])
      return
    }
    try {
      const res = await api.buscarProducto(q, negocio_id)
      setResultados(Array.isArray(res) ? res : [])
    } catch (e) {
      setResultados([])
    }
  }

  const seleccionar = (producto) => {
    setProductoSeleccionado(producto)
    setBusqueda('')
    setResultados([])
    setIndiceSeleccionado(-1)
  }

  const agregar = () => {
    if (productoSeleccionado) {
      onAgregar(productoSeleccionado)
      onCerrar()
    }
  }

  const cancelar = () => {
    setProductoSeleccionado(null)
    setBusqueda('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    // Navegación en dropdown
    if (e.key === 'ArrowDown' && !productoSeleccionado) {
      e.preventDefault()
      setIndiceSeleccionado(prev =>
        prev < resultados.length - 1 ? prev + 1 : prev
      )
      return
    }
    if (e.key === 'ArrowUp' && !productoSeleccionado) {
      e.preventDefault()
      setIndiceSeleccionado(prev => prev > 0 ? prev - 1 : -1)
      return
    }
    // Enter para seleccionar en dropdown
    if (e.key === 'Enter' && !productoSeleccionado) {
      e.preventDefault()
      if (indiceSeleccionado >= 0 && resultados[indiceSeleccionado]) {
        seleccionar(resultados[indiceSeleccionado])
      }
      return
    }
    // F1 para agregar al carrito
    if (e.key === 'F1' && productoSeleccionado) {
      e.preventDefault()
      agregar()
      return
    }
    // F2 para cancelar
    if (e.key === 'F2') {
      e.preventDefault()
      cancelar()
      return
    }
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [productoSeleccionado, indiceSeleccionado, resultados])

  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal-dialog" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Verificador de Precio (F9)</h3>
          <button className="close-btn" onClick={onCerrar}><X size={16} /></button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>Código o nombre del producto</label>
            <div style={{ position: 'relative' }}>
              <input
                ref={inputRef}
                type="text"
                value={busqueda}
                onChange={e => buscar(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escanee o escriba..."
                autoComplete="off"
                disabled={!!productoSeleccionado}
              />
              {resultados.length > 0 && (
                <div className="busqueda-dropdown">
                  {resultados.map((p, idx) => (
                    <div
                      key={p.id}
                      className={`busqueda-item ${idx === indiceSeleccionado ? 'busqueda-item-active' : ''}`}
                      onClick={() => seleccionar(p)}
                      style={{ cursor: 'pointer' }}
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

          {busqueda && resultados.length === 0 && (
            <p className="error-msg">Producto no encontrado</p>
          )}

          {productoSeleccionado && (
            <div className="producto-info">
              <p className="prod-nombre">{productoSeleccionado.nombre}</p>
              <p className="prod-stock">Código: {productoSeleccionado.codigo_barras || '—'}</p>
              <p className="prod-precio">Precio: <strong>${parseFloat(productoSeleccionado.precio).toFixed(2)}</strong></p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {productoSeleccionado && (
            <>
              <button onClick={cancelar} className="btn-cancel">Cancelar (F2)</button>
              <button onClick={agregar} className="btn-confirm">Agregar al carrito (F1)</button>
            </>
          )}
          {!productoSeleccionado && (
            <button onClick={onCerrar} className="btn-cancel">Cerrar (ESC)</button>
          )}
        </div>
      </div>
    </div>
  )
}
