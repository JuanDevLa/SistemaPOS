import { useState, useMemo } from 'react'
import { X } from 'lucide-react'

// Modal estilo eleventa "CIERRE DE TURNO".
// snapshot: snapshot vivo del turno (para calcular efectivo esperado).
// onConfirmar: ({ efectivoContado, diferencia, restablecer }) => Promise
export default function ModalCerrarTurno({ snapshot, onClose, onConfirmar }) {
  const esperado = useMemo(
    () => parseFloat(snapshot?.efectivo_inicial || 0) + parseFloat(snapshot?.ventas_efectivo || 0),
    [snapshot]
  )
  const [contado, setContado] = useState('')
  const [restablecer, setRestablecer] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const diferencia = contado === '' ? 0 : parseFloat(contado) - esperado

  const confirmar = async () => {
    if (contado === '' || isNaN(parseFloat(contado))) {
      setError('Ingresa el efectivo contado')
      return
    }
    setEnviando(true)
    setError('')
    try {
      await onConfirmar({
        efectivoContado: parseFloat(contado),
        diferencia,
        restablecer,
      })
    } catch (e) {
      setError(e.message || 'Error al cerrar turno')
      setEnviando(false)
    }
  }

  const colorDif = diferencia === 0 ? '#1E3A5F' : diferencia > 0 ? '#15803D' : '#DC2626'

  return (
    <div style={s.overlay}>
      <div style={s.card}>
        <div style={s.header}>
          <span>CIERRE DE TURNO</span>
          <button onClick={onClose} style={s.btnX}><X size={18} /></button>
        </div>
        <div style={s.body}>
          <p style={s.intro}>
            Por favor cuenta el dinero en la caja para proceder con el cierre de turno.
          </p>

          <div style={s.fila}>
            <span style={s.label}>Efectivo esperado en caja:</span>
            <span style={{ ...s.valor, fontWeight: 700 }}>${esperado.toFixed(2)}</span>
          </div>

          <div style={s.fila}>
            <span style={s.label}>¿Cuánto efectivo hay en caja?</span>
            <input
              autoFocus
              type="number"
              step="0.01"
              value={contado}
              onChange={e => setContado(e.target.value)}
              style={s.input}
              placeholder="0.00"
            />
          </div>

          <div style={s.fila}>
            <span style={s.label}>Diferencia:</span>
            <span style={{ ...s.valor, fontWeight: 800, color: colorDif }}>
              ${diferencia.toFixed(2)}
            </span>
          </div>

          <label style={s.checkRow}>
            <input
              type="checkbox"
              checked={restablecer}
              onChange={e => setRestablecer(e.target.checked)}
            />
            <span>Restablecer Todo a su origen (abrir nuevo turno con efectivo inicial $0)</span>
          </label>

          {error && <div style={s.error}>{error}</div>}
        </div>

        <div style={s.footer}>
          <button style={s.btnPrim} onClick={confirmar} disabled={enviando}>
            {enviando ? 'Cerrando...' : 'Cerrar Turno'}
          </button>
          <button style={s.btnSec} onClick={onClose} disabled={enviando}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}

const s = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  card:    { width: 480, background: '#FFF', borderRadius: 8, boxShadow: '0 12px 32px rgba(0,0,0,0.2)', overflow: 'hidden', color: '#1a1a1a' },
  header:  { background: '#1E3A5F', color: '#FFF', padding: '12px 16px', fontWeight: 700, fontSize: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  btnX:    { background: 'transparent', border: 'none', color: '#FFF', cursor: 'pointer', padding: 0 },
  body:    { padding: 20 },
  intro:   { fontSize: 13, color: '#374151', margin: '0 0 16px' },
  fila:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #F3F4F6' },
  label:   { fontSize: 13, color: '#374151' },
  valor:   { fontSize: 14, color: '#1a1a1a' },
  input:   { width: 130, padding: '6px 10px', border: '1px solid #BFDBFE', borderRadius: 4, fontSize: 15, fontWeight: 700, textAlign: 'right', color: '#1a1a1a', background: '#F0F7FF' },
  checkRow:{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: '#374151', marginTop: 12 },
  error:   { fontSize: 12, color: '#DC2626', marginTop: 8 },
  footer:  { padding: '12px 20px', display: 'flex', justifyContent: 'flex-end', gap: 8, background: '#F9FAFB', borderTop: '1px solid #E5E7EB' },
  btnPrim: { padding: '8px 18px', background: '#1E3A5F', color: '#FFF', border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnSec:  { padding: '8px 18px', background: '#FFF', color: '#374151', border: '1px solid #D1D5DB', borderRadius: 4, fontSize: 13, cursor: 'pointer' },
}
