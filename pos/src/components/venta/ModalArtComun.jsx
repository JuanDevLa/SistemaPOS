import { useState, useRef, useEffect } from 'react'
import { X, Check } from 'lucide-react'

export default function ModalArtComun({ onAgregar, onCerrar }) {
  const [descripcion, setDescripcion] = useState('')
  const [precio, setPrecio] = useState('')
  const [cantidad, setCantidad] = useState('1')
  const [error, setError] = useState('')
  const inputRef = useRef()

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const confirmar = () => {
    const desc = descripcion.trim()
    const prec = parseFloat(precio) || 0
    const cant = parseInt(cantidad) || 0

    if (!desc || prec <= 0 || cant <= 0) {
      setError('Complete todos los campos correctamente')
      return
    }

    const productoGeneral = {
      id: `custom_${Date.now()}`,
      nombre: desc,
      precio: prec,
      codigo_barras: ''
    }

    for (let i = 0; i < cant; i++) {
      onAgregar(productoGeneral)
    }
    onCerrar()
  }

  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal-dialog" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Artículo Común (CTRL+P)</h3>
          <button className="close-btn" onClick={onCerrar}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>Descripción del artículo</label>
            <input
              ref={inputRef}
              type="text"
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              placeholder="Ej: Servicio, empaque, etc."
            />
          </div>

          <div className="form-group">
            <label>Precio unitario</label>
            <input
              type="number"
              value={precio}
              onChange={e => setPrecio(e.target.value)}
              placeholder="0.00"
              step="0.01"
            />
          </div>

          <div className="form-group">
            <label>Cantidad</label>
            <input
              type="number"
              value={cantidad}
              onChange={e => setCantidad(e.target.value)}
              min="1"
              onKeyPress={e => e.key === 'Enter' && confirmar()}
            />
          </div>

          {error && <p className="error-msg">{error}</p>}
        </div>

        <div className="modal-footer">
          <button onClick={onCerrar} className="btn-cancel">Cancelar</button>
          <button onClick={confirmar} className="btn-confirm">Agregar</button>
        </div>
      </div>
    </div>
  )
}
