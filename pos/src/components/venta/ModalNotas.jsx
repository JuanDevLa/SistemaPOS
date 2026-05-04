import { useState, useRef, useEffect } from 'react'
import { X } from 'lucide-react'

// Modal reutilizable para acciones sensibles que requieren justificación.
// El padre decide si ejecutar la acción: onConfirmar(notas) se llama con el texto.
export default function ModalNotas({ titulo, descripcion, onConfirmar, onCerrar }) {
  const [notas, setNotas] = useState('')
  const [error, setError] = useState('')
  const ref = useRef()

  useEffect(() => { ref.current?.focus() }, [])

  const confirmar = () => {
    if (notas.trim().length < 5) {
      setError('Escribe el motivo (mínimo 5 caracteres)')
      return
    }
    onConfirmar(notas.trim())
  }

  return (
    <div style={s.overlay} onClick={onCerrar}>
      <div style={s.card} onClick={e => e.stopPropagation()}>
        <div style={s.header}>
          <span style={s.titulo}>{titulo}</span>
          <button style={s.closeBtn} onClick={onCerrar}><X size={16} /></button>
        </div>

        {descripcion && <p style={s.desc}>{descripcion}</p>}

        <label style={s.label}>Motivo / Notas <span style={s.req}>*</span></label>
        <textarea
          ref={ref}
          style={s.textarea}
          rows={3}
          placeholder="Escribe el motivo de esta acción..."
          value={notas}
          onChange={e => { setNotas(e.target.value); setError('') }}
          onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) confirmar() }}
        />
        {error && <p style={s.error}>{error}</p>}

        <div style={s.footer}>
          <button style={s.btnCancelar} onClick={onCerrar}>Cancelar</button>
          <button style={s.btnConfirmar} onClick={confirmar}>Confirmar</button>
        </div>
      </div>
    </div>
  )
}

const s = {
  overlay:     { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 },
  card:        { background: '#fff', borderRadius: 8, width: 420, padding: 24, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' },
  header:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  titulo:      { fontWeight: 700, fontSize: 15, color: '#1a1a1a' },
  closeBtn:    { background: 'none', border: 'none', cursor: 'pointer', color: '#666', padding: 4 },
  desc:        { fontSize: 13, color: '#555', marginBottom: 14, lineHeight: 1.5 },
  label:       { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 },
  req:         { color: '#dc2626' },
  textarea:    { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, color: '#1a1a1a', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' },
  error:       { color: '#dc2626', fontSize: 12, marginTop: 6 },
  footer:      { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 },
  btnCancelar: { padding: '8px 18px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 13, color: '#374151' },
  btnConfirmar:{ padding: '8px 20px', border: 'none', borderRadius: 6, background: '#1e3a5f', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
}
