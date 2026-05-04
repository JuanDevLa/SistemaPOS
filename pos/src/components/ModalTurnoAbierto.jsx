import { useState, useRef, useEffect } from 'react'
import { api } from '../api'

export default function ModalTurnoAbierto({ turno, usuario, onContinuar, onNuevoTurno }) {
  const esOtroCajero = turno?.cajero_id && usuario?.id && turno.cajero_id !== usuario.id
  const [paso, setPaso] = useState('decision')   // 'decision' | 'cerrar'
  const [efectivo, setEfectivo] = useState('')
  const [motivo, setMotivo] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const motivoRef = useRef()

  useEffect(() => {
    if (paso === 'cerrar') setTimeout(() => motivoRef.current?.focus(), 50)
  }, [paso])

  const apertura = turno?.apertura
    ? new Date(turno.apertura).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
    : '—'

  const handleCerrarYAbrir = async () => {
    if (!motivo.trim()) { setError('El motivo es obligatorio'); return }
    const monto = parseFloat(efectivo) || 0

    setCargando(true); setError('')
    try {
      const res = await api.cerrarCorte(
        turno.id,
        monto,
        `[Cierre forzado] ${motivo.trim()}`
      )
      onNuevoTurno()
    } catch(e) {
      setError(e.message)
      setCargando(false)
    }
  }

  return (
    <div style={s.overlay}>
      <div style={s.modal}>

        <div style={s.header}>
          <span style={s.headerTitle}>Turno en curso detectado</span>
        </div>

        {paso === 'decision' && (
          <div style={s.body}>
            <p style={s.info}>
              Hay un turno abierto desde <strong>{apertura}</strong>
              {turno?.cajero ? ` por ${turno.cajero}` : ''}.
            </p>
            {esOtroCajero && (
              <p style={s.alerta}>
                ⚠ Ese turno lo abrió <strong>{turno.cajero}</strong>, no tú. Si lo continúas, las ventas seguirán a su nombre.
              </p>
            )}
            <p style={s.subInfo}>
              Puedes continuar ese turno o abrirlo de nuevo. Si abres uno nuevo deberás cerrar el anterior declarando el efectivo y el motivo.
            </p>
            <button style={s.btnPrimario} onClick={() => onContinuar(turno)}>
              Continuar turno
            </button>
            <button style={s.btnSecundario} onClick={() => setPaso('cerrar')}>
              Abrir nuevo turno
            </button>
          </div>
        )}

        {paso === 'cerrar' && (
          <div style={s.body}>
            <p style={s.info}>Para abrir un nuevo turno cierra el anterior.</p>

            <div style={s.campo}>
              <label style={s.label}>Efectivo real en caja ahora</label>
              <div style={s.inputWrapper}>
                <span style={s.prefijo}>$</span>
                <input
                  type="number"
                  value={efectivo}
                  onChange={e => setEfectivo(e.target.value)}
                  placeholder="0.00"
                  style={s.inputMonto}
                  step="0.01"
                  min="0"
                />
              </div>
            </div>

            <div style={s.campo}>
              <label style={s.label}>Motivo del cierre forzado <span style={{ color: '#DC2626' }}>*</span></label>
              <textarea
                ref={motivoRef}
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
                placeholder="Ej: Se fue la luz, cambio de turno sin corte previo..."
                style={s.textarea}
                rows={3}
              />
            </div>

            {error && <p style={s.error}>{error}</p>}

            <button
              style={{ ...s.btnPrimario, background: '#DC2626', opacity: cargando ? 0.6 : 1 }}
              onClick={handleCerrarYAbrir}
              disabled={cargando}
            >
              {cargando ? 'Cerrando turno...' : 'Cerrar turno anterior y continuar'}
            </button>
            <button style={s.btnSecundario} onClick={() => { setPaso('decision'); setError('') }}>
              Volver
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

const s = {
  overlay:      { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(3px)' },
  modal:        { background: '#FFF', borderRadius: 8, width: 400, boxShadow: '0 20px 40px rgba(0,0,0,0.25)', overflow: 'hidden', fontFamily: 'Segoe UI, system-ui, sans-serif' },
  header:       { background: '#92400E', color: '#FFF', padding: '14px 20px' },
  headerTitle:  { fontSize: 15, fontWeight: 600, letterSpacing: '0.3px' },
  body:         { padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 14 },
  info:         { fontSize: 14, color: '#1F2937', margin: 0, lineHeight: 1.5 },
  subInfo:      { fontSize: 13, color: '#6B7280', margin: 0, lineHeight: 1.5 },
  campo:        { display: 'flex', flexDirection: 'column', gap: 6, width: '100%' },
  label:        { fontSize: 12, fontWeight: 600, color: '#374151' },
  inputWrapper: { display: 'flex', alignItems: 'center', border: '2px solid #1e3a5f', borderRadius: 6, overflow: 'hidden' },
  prefijo:      { padding: '0 12px', fontSize: 18, fontWeight: 700, color: '#1e3a5f', background: '#EEF2FF', alignSelf: 'stretch', display: 'flex', alignItems: 'center' },
  inputMonto:   { flex: 1, padding: '10px 12px', fontSize: 20, fontWeight: 700, color: '#1F2937', border: 'none', outline: 'none', textAlign: 'center' },
  textarea:     { padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 13, color: '#1a1a1a', resize: 'vertical', fontFamily: 'inherit', outline: 'none' },
  btnPrimario:  { padding: '13px 0', background: '#1e3a5f', color: '#FFF', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: 'pointer', width: '100%' },
  btnSecundario:{ padding: '11px 0', background: '#F3F4F6', color: '#6B7280', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', width: '100%' },
  error:        { color: '#DC2626', fontSize: 13, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, padding: '8px 12px', margin: 0 },
  alerta:       { color: '#92400E', fontSize: 13, background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 6, padding: '10px 12px', margin: 0, lineHeight: 1.5 },
}
