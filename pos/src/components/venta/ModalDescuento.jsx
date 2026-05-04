import { useState, useRef, useEffect } from 'react'
import { X, Check } from 'lucide-react'

export default function ModalDescuento({ subtotal, descuentoActual, onAplicar, onCancelar }) {
  const [tipo, setTipo] = useState(descuentoActual?.tipo || '%')
  const [valor, setValor] = useState(descuentoActual?.valor > 0 ? String(descuentoActual.valor) : '')
  const inputRef = useRef()

  useEffect(() => { inputRef.current?.focus() }, [])

  const montoDescuento = () => {
    const v = parseFloat(valor) || 0
    if (tipo === '%') return subtotal * (v / 100)
    return Math.min(v, subtotal)
  }

  const totalConDescuento = subtotal - montoDescuento()

  const handleAplicar = () => {
    const v = parseFloat(valor) || 0
    if (v <= 0) { onAplicar(tipo, 0); return }
    if (tipo === '%' && v > 100) return
    if (tipo === '$' && v > subtotal) return
    onAplicar(tipo, v)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleAplicar() }
  }

  return (
    <div className="modal-overlay" onClick={onCancelar}>
      <div className="modal-dialog" onClick={e => e.stopPropagation()} style={{ width: 340 }}>
        <div className="modal-header">
          <h3>Descuento al ticket</h3>
          <button className="close-btn" onClick={onCancelar}><X size={16} /></button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button
              className={`pos-btn${tipo === '%' ? ' active' : ''}`}
              style={{ flex: 1, fontWeight: tipo === '%' ? 700 : 400 }}
              onClick={() => setTipo('%')}
            >
              % Porcentaje
            </button>
            <button
              className={`pos-btn${tipo === '$' ? ' active' : ''}`}
              style={{ flex: 1, fontWeight: tipo === '$' ? 700 : 400 }}
              onClick={() => setTipo('$')}
            >
              $ Monto fijo
            </button>
          </div>

          <div className="form-group">
            <label>{tipo === '%' ? 'Porcentaje de descuento' : 'Monto a descontar'}</label>
            <input
              ref={inputRef}
              type="number"
              value={valor}
              onChange={e => setValor(e.target.value)}
              onKeyDown={handleKeyDown}
              min="0"
              max={tipo === '%' ? 100 : subtotal}
              step="0.01"
              placeholder={tipo === '%' ? 'Ej: 10' : 'Ej: 50.00'}
              autoComplete="off"
            />
          </div>

          <div style={{ fontSize: 12, color: '#555', marginTop: 8, lineHeight: 1.6 }}>
            <div>Subtotal: <strong>${subtotal.toFixed(2)}</strong></div>
            <div>Descuento: <strong style={{ color: '#c02020' }}>-${montoDescuento().toFixed(2)}</strong></div>
            <div style={{ fontSize: 14, marginTop: 4 }}>Total: <strong style={{ color: '#1a7a3a' }}>${totalConDescuento.toFixed(2)}</strong></div>
          </div>
        </div>

        <div className="modal-footer">
          {descuentoActual?.valor > 0 && (
            <button className="btn-neutral" onClick={() => { onAplicar('%', 0) }}>Quitar descuento</button>
          )}
          <button onClick={onCancelar} className="btn-cancel">Cancelar</button>
          <button onClick={handleAplicar} className="btn-confirm">Aplicar</button>
        </div>
      </div>
    </div>
  )
}
