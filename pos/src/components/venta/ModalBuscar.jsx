import { useState, useRef, useEffect } from 'react'
import { X, Check } from 'lucide-react'
import { api } from '../../api'

export default function ModalBuscar({ negocio_id, onAgregar, onCerrar }) {
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState([])
  const [indiceSeleccionado, setIndiceSeleccionado] = useState(-1)
  const [filtro, setFiltro] = useState('todo') // 'todo', 'codigo', 'nombre'
  const [error, setError] = useState('')
  const inputRef = useRef()

  useEffect(() => {
    inputRef.current?.focus()
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
      setError('Error al buscar')
    }
  }

  const agregarProducto = (producto) => {
    onAgregar(producto)
    setBusqueda('')
    setResultados([])
    setIndiceSeleccionado(-1)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
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
    if (e.key === 'Enter') {
      e.preventDefault()
      if (indiceSeleccionado >= 0 && resultados[indiceSeleccionado]) {
        agregarProducto(resultados[indiceSeleccionado])
      }
    }
  }

  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal-dialog" style={{ maxWidth: '700px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Buscador Avanzado (F10)</h3>
          <button className="close-btn" onClick={onCerrar}><X size={16} /></button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>Buscar producto</label>
            <input
              ref={inputRef}
              type="text"
              value={busqueda}
              onChange={e => buscar(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Código, nombre o descripción..."
              autoComplete="off"
            />
          </div>

          {resultados.length > 0 && (
            <div style={{ marginTop: '14px' }}>
              <p style={{ fontSize: '12px', fontWeight: '600', color: '#666', marginBottom: '8px' }}>
                {resultados.length} resultado(s) encontrado(s)
              </p>
              <div className="busqueda-tabla">
                <div className="busqueda-tabla-header">
                  <div className="col-codigo">Código</div>
                  <div className="col-nombre">Producto</div>
                  <div className="col-precio">Precio</div>
                  <div className="col-accion">Agregar</div>
                </div>
                {resultados.map((p, idx) => (
                  <div key={p.id} className={`busqueda-tabla-row ${idx === indiceSeleccionado ? 'busqueda-tabla-row-active' : ''}`}>
                    <div className="col-codigo">{p.codigo_barras || '—'}</div>
                    <div className="col-nombre">{p.nombre}</div>
                    <div className="col-precio">${parseFloat(p.precio).toFixed(2)}</div>
                    <div className="col-accion">
                      <button
                        onClick={() => agregarProducto(p)}
                        className="pos-btn"
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                      >
                        + Agregar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {busqueda && resultados.length === 0 && (
            <p className="error-msg">No se encontraron productos</p>
          )}

          {error && <p className="error-msg">{error}</p>}
        </div>

        <div className="modal-footer">
          <button onClick={onCerrar} className="btn-cancel">Cerrar (ESC)</button>
        </div>
      </div>
    </div>
  )
}
