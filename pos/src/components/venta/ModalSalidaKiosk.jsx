import { useState, useEffect, useRef } from 'react'

export default function ModalSalidaKiosk({ onCancelar }) {
  const [pin, setPin]       = useState('')
  const [error, setError]   = useState('')
  const [cargando, setCargando] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleConfirmar = async () => {
    if (!pin) return
    setCargando(true)
    setError('')
    try {
      const res = await window.kioskAPI.verificarPin(pin)
      if (res.ok) {
        await window.kioskAPI.salir()
      } else {
        setError('PIN incorrecto')
        setPin('')
        inputRef.current?.focus()
      }
    } catch {
      setError('Error al verificar PIN')
    } finally {
      setCargando(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter') handleConfirmar()
    if (e.key === 'Escape') onCancelar()
  }

  return (
    <div style={s.overlay}>
      <div style={s.card}>
        <h3 style={s.titulo}>Salir del sistema</h3>
        <p style={s.desc}>Ingresa el PIN de administrador para cerrar la aplicación.</p>
        <input
          ref={inputRef}
          type="password"
          inputMode="numeric"
          maxLength={10}
          value={pin}
          onChange={e => { setPin(e.target.value); setError('') }}
          onKeyDown={handleKey}
          placeholder="PIN admin"
          style={s.input}
        />
        {error && <p style={s.error}>{error}</p>}
        <div style={s.botones}>
          <button style={s.btnCancelar} onClick={onCancelar} disabled={cargando}>
            Cancelar
          </button>
          <button style={s.btnConfirmar} onClick={handleConfirmar} disabled={cargando || !pin}>
            {cargando ? 'Verificando...' : 'Confirmar salida'}
          </button>
        </div>
      </div>
    </div>
  )
}

const s = {
  overlay: {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  card: {
    background: '#fff', borderRadius: 12, padding: 32, width: 340,
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    display: 'flex', flexDirection: 'column', gap: 12,
  },
  titulo: { margin: 0, fontSize: 18, fontWeight: 700, color: '#1a1a1a' },
  desc:   { margin: 0, fontSize: 13, color: '#6B7280' },
  input: {
    padding: '10px 14px', fontSize: 18, borderRadius: 8, textAlign: 'center',
    border: '2px solid #D1D5DB', outline: 'none', letterSpacing: 4,
    color: '#1a1a1a',
  },
  error:  { margin: 0, fontSize: 12, color: '#DC2626', textAlign: 'center' },
  botones: { display: 'flex', gap: 8, marginTop: 4 },
  btnCancelar: {
    flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid #D1D5DB',
    background: '#F9FAFB', cursor: 'pointer', fontSize: 14, color: '#374151', fontWeight: 600,
  },
  btnConfirmar: {
    flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
    background: '#DC2626', cursor: 'pointer', fontSize: 14, color: '#fff', fontWeight: 600,
  },
}
