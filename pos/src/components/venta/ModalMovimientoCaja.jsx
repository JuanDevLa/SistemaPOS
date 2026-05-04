import { useState, useRef, useEffect } from 'react'
import { X, Check } from 'lucide-react'

export default function ModalMovimientoCaja({ tipo, motivoInicial = '', onConfirmar, onCerrar }) {
  const [monto, setMonto]   = useState('')
  const [motivo, setMotivo] = useState(motivoInicial)
  const [error, setError]   = useState('')
  const montoRef = useRef()

  useEffect(() => { montoRef.current?.focus() }, [])

  const titulo = tipo === 'entrada' ? 'Entrada de Efectivo' : 'Salida de Efectivo'

  const handleConfirmar = () => {
    const val = parseFloat(monto)
    if (!monto || isNaN(val) || val <= 0) { setError('Ingrese un monto válido'); return }
    onConfirmar({ tipo, monto: val, motivo: motivo.trim() })
  }

  const handleKey = (e) => {
    if (e.key === 'Enter') handleConfirmar()
    if (e.key === 'Escape') onCerrar()
  }

  return (
    <div style={s.overlay} onKeyDown={handleKey}>
      <div style={s.modal}>
        <div style={s.header}>
          <span>{titulo}</span>
          <button style={s.btnX} onClick={onCerrar}><X size={16} /></button>
        </div>
        <div style={s.body}>
          <label style={s.label}>Monto:</label>
          <input
            ref={montoRef}
            className="pos-input"
            style={s.input}
            type="number"
            placeholder="$0.00"
            value={monto}
            onChange={e => { setMonto(e.target.value); setError('') }}
          />
          <label style={s.label}>Motivo/Descripción:</label>
          <input
            className="pos-input"
            style={s.input}
            type="text"
            placeholder={tipo === 'entrada' ? 'Ej: Fondo adicional' : 'Ej: Pago a proveedor'}
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
          />
          {error && <span style={s.error}>{error}</span>}
        </div>
        <div style={s.footer}>
          <button className="pos-btn" style={s.btnConfirmar} onClick={handleConfirmar}>Registrar</button>
          <button className="pos-btn" onClick={onCerrar}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}

const s = {
  overlay:      { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  modal:        { background: '#fff', borderRadius: 5, width: 340, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', overflow: 'hidden' },
  header:       { background: '#2c3e50', color: '#fff', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14, fontWeight: 700 },
  btnX:         { background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16 },
  body:         { padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8 },
  label:        { fontSize: 12, fontWeight: 600, color: '#444' },
  input:        { width: '100%' },
  error:        { fontSize: 11, color: '#c02020' },
  footer:       { padding: '10px 20px 16px', display: 'flex', gap: 8, justifyContent: 'flex-end' },
  btnConfirmar: { background: '#2c6bc9', color: '#fff', border: '1px solid #1e4fa0', fontWeight: 700 },
}
