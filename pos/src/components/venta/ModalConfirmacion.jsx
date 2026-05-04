import { X } from 'lucide-react'

export default function ModalConfirmacion({ titulo, mensaje, onConfirmar, onCancelar }) {
  return (
    <div className="modal-overlay" onClick={onCancelar}>
      <div className="modal-dialog" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{titulo}</h3>
          <button className="close-btn" onClick={onCancelar}><X size={16} /></button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: '14px', color: '#333', margin: '0' }}>{mensaje}</p>
        </div>

        <div className="modal-footer">
          <button onClick={onCancelar} className="btn-cancel">No (ESC)</button>
          <button onClick={onConfirmar} className="btn-confirm" style={{ background: '#dc2626' }}>Sí, borrar</button>
        </div>
      </div>
    </div>
  )
}
