import { useState, useRef, useEffect } from 'react'
import { X, Check } from 'lucide-react'

export default function ModalTicketPendiente({ onGuardarYNuevo, onLimpiarSinGuardar, onCancelar }) {
  const [nombre, setNombre] = useState('')
  const inputRef = useRef()

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleGuardar = () => {
    if (nombre.trim()) {
      onGuardarYNuevo(nombre.trim())
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleGuardar()
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
          <h3>Guardar Ticket Pendiente (F6)</h3>
          <button className="close-btn" onClick={onCancelar}><X size={16} /></button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>Nombre del ticket (ej: Mesa 5, Cliente Pepe, etc.)</label>
            <input
              ref={inputRef}
              type="text"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Mesa 5"
              autoComplete="off"
              maxLength="30"
            />
            <p style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
              Deja vacío para no guardar con nombre
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onCancelar} className="btn-cancel">Cancelar</button>
          <button onClick={onLimpiarSinGuardar} className="btn-neutral">Limpiar (Sin guardar)</button>
          <button
            onClick={handleGuardar}
            className="btn-confirm"
            disabled={!nombre.trim()}
            style={{ opacity: !nombre.trim() ? 0.5 : 1 }}
          >
            Guardar y nuevo
          </button>
        </div>
      </div>
    </div>
  )
}
