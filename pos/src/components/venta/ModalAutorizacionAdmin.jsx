import { useState, useRef, useEffect } from 'react'
import { X, Check } from 'lucide-react'
import { api } from '../../api'

export default function ModalAutorizacionAdmin({ permiso, negocio_id, onConfirmar, onCancelar }) {
  const [usuario, setUsuario] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef()

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleConfirmar = async () => {
    if (!usuario.trim() || !pin.trim()) {
      setError('Usuario y PIN requeridos')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await api.autorizacionTemporal({
        admin_usuario: usuario.trim(),
        admin_pin: pin,
        permiso,
        negocio_id,
      })
      if (res?.token) {
        onConfirmar(res.token)
      } else {
        setError('Respuesta inválida del servidor')
      }
    } catch (e) {
      setError(e.message || 'Error de autorización')
      setPin('')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleConfirmar() }
    if (e.key === 'Escape') { e.preventDefault(); onCancelar() }
  }

  return (
    <div className="modal-overlay" onClick={onCancelar}>
      <div className="modal-dialog" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Autorización de administrador</h3>
          <button className="close-btn" onClick={onCancelar}><X size={16} /></button>
        </div>

        <div className="modal-body">
          <p style={{ fontSize: 13, color: '#555', margin: '0 0 12px' }}>
            Permiso requerido: <strong style={{ color: '#1a1a1a' }}>{permiso}</strong>
          </p>
          <div className="form-group">
            <label>Usuario admin</label>
            <input
              ref={inputRef}
              type="text"
              value={usuario}
              onChange={e => setUsuario(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label>PIN</label>
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              maxLength="8"
              disabled={loading}
            />
          </div>
          {error && (
            <p style={{ color: '#dc2626', fontSize: 13, margin: '4px 0 0' }}>{error}</p>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onCancelar} className="btn-cancel" disabled={loading}>Cancelar (ESC)</button>
          <button
            onClick={handleConfirmar}
            className="btn-confirm"
            disabled={loading || !usuario.trim() || !pin.trim()}
            style={{ opacity: (loading || !usuario.trim() || !pin.trim()) ? 0.5 : 1 }}
          >
            {loading ? 'Autorizando...' : 'Autorizar'}
          </button>
        </div>
      </div>
    </div>
  )
}
