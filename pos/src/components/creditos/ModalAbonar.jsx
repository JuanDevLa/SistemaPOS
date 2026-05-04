import { useState, useEffect, useRef } from 'react'
import { X, Check } from 'lucide-react'
import { api } from '../../api'

export default function ModalAbonar({ cliente, creditoId, negocio_id, usuario_id, onConfirmar, onCerrar }) {
  const [monto, setMonto]             = useState('')
  const [destino, setDestino]         = useState('seleccionado')
  const [comentarios, setComentarios] = useState('')
  const [error, setError]             = useState('')
  const [guardando, setGuardando]     = useState(false)
  const inputRef = useRef()

  useEffect(() => { inputRef.current?.focus() }, [])

  const aplicar = async () => {
    const m = parseFloat(monto)
    if (!m || m <= 0) { setError('Ingresa un monto válido'); return }
    setGuardando(true); setError('')
    try {
      await api.registrarAbono({ cliente_id: cliente.id, credito_id: creditoId, negocio_id, usuario_id, monto: m, comentarios, destino })
      onConfirmar()
    } catch (e) { setError(e.message) }
    setGuardando(false)
  }

  return (
    <div style={s.overlay} onClick={onCerrar}>
      <div style={s.card} onClick={e => e.stopPropagation()}>
        <div style={s.header}>
          <span>Créditos - Abonar</span>
          <button style={s.closeBtn} onClick={onCerrar}><X size={16} /></button>
        </div>
        <div style={s.body}>
          <div style={s.row}>
            <label style={s.label}>Abonar</label>
            <input ref={inputRef} style={s.inputGrande} type="number" step="0.01" min="0"
              value={monto} onChange={e => setMonto(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && aplicar()} placeholder="$0.00" />
          </div>
          <div style={s.row}>
            <label style={s.label}>Destino</label>
            <select style={s.select} value={destino} onChange={e => setDestino(e.target.value)}>
              <option value="seleccionado">solamente a la venta seleccionada</option>
              <option value="todos">a todas las ventas no liquidadas por igual</option>
            </select>
          </div>
          <div style={s.row}>
            <label style={s.label}>Comentarios</label>
            <textarea style={s.textarea} value={comentarios} onChange={e => setComentarios(e.target.value)}
              placeholder="Opcional..." rows={3} />
          </div>
          {error && <p style={{ color: '#c02020', fontSize: 12, margin: '4px 0 0' }}>{error}</p>}
        </div>
        <div style={s.footer}>
          <button style={s.btnCancelar} onClick={onCerrar}>Cancelar</button>
          <button style={s.btnAceptar} onClick={aplicar} disabled={guardando}>
            {guardando ? 'Guardando...' : <><Check size={14} style={{ marginRight: 4 }} />Aceptar</>}
          </button>
        </div>
      </div>
    </div>
  )
}

const s = {
  overlay:    { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  card:       { background: '#fff', borderRadius: 8, width: 380, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' },
  header:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #eee', fontWeight: 600, fontSize: 14, color: '#1a1a1a' },
  closeBtn:   { background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#888' },
  body:       { padding: 16 },
  footer:     { display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 16px', borderTop: '1px solid #eee' },
  row:        { marginBottom: 12 },
  label:      { display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 },
  inputGrande:{ width: '100%', padding: '10px 12px', fontSize: 20, fontWeight: 700, border: '1px solid #ccc', borderRadius: 6, textAlign: 'center', boxSizing: 'border-box', color: '#1a1a1a' },
  select:     { width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid #ccc', borderRadius: 6, color: '#1a1a1a' },
  textarea:   { width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid #ccc', borderRadius: 6, resize: 'vertical', boxSizing: 'border-box', color: '#1a1a1a' },
  btnAceptar: { padding: '8px 20px', background: '#1e8040', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center' },
  btnCancelar:{ padding: '8px 20px', background: '#fff', color: '#333', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer', fontSize: 13 },
}
