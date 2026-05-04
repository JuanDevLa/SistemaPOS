import { useState, useRef, useEffect } from 'react'
import { X, Check } from 'lucide-react'

export default function ModalFiado({ onConfirmar, onCancelar }) {
  const [nombre, setNombre] = useState('')
  const inputRef = useRef()

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleConfirmar = () => {
    if (nombre.trim()) {
      onConfirmar(nombre.trim())
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleConfirmar()
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      onCancelar()
    }
  }

  return (
    <div className="modal-overlay" onClick={onCancelar}>
      <div className="modal-dialog" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>A Fiar - Nombre del Cliente</h3>
          <button className="close-btn" onClick={onCancelar}><X size={16} /></button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>Nombre del cliente</label>
            <input
              ref={inputRef}
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ej: Juan García"
              autoComplete="off"
              maxLength="50"
            />
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onCancelar} className="btn-cancel">Cancelar</button>
          <button
            onClick={handleConfirmar}
            className="btn-confirm"
            disabled={!nombre.trim()}
            style={{ opacity: !nombre.trim() ? 0.5 : 1 }}
          >
            A Fiar
          </button>
        </div>
      </div>
    </div>
  )
}
