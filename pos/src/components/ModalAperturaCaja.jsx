import { useState, useEffect, useRef } from 'react'
import { api } from '../api'

export default function ModalAperturaCaja({ usuario, onAbrirCaja, onSaltarCaja }) {
  const [paso, setPaso] = useState('pregunta') // 'pregunta' | 'monto'
  const [efectivo, setEfectivo] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef()

  useEffect(() => {
    if (paso === 'monto') {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [paso])

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onSaltarCaja()
      if (e.key === 'Enter' && paso === 'monto') handleRegistrar()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [paso, efectivo])

  const handleRegistrar = async () => {
    const monto = parseFloat(efectivo) || 0
    setCargando(true)
    setError('')
    try {
      const res = await api.abrirCorte(usuario.negocio_id, monto)
      onAbrirCaja(res)
    } catch(e) {
      setError(e.message)
      setCargando(false)
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>

        {/* HEADER */}
        <div style={styles.header}>
          <span style={styles.headerTitle}>Dinero en caja</span>
          <button style={styles.btnClose} onClick={onSaltarCaja}>✕</button>
        </div>

        {/* PASO 1: ¿Abrir caja? */}
        {paso === 'pregunta' && (
          <div style={styles.body}>
            <p style={styles.preguntaTexto}>¿Deseas abrir caja?</p>
            <div style={styles.botonesDecision}>
              <button style={styles.btnSi} onClick={() => setPaso('monto')}>
                Sí, abrir caja
              </button>
              <button style={styles.btnNo} onClick={onSaltarCaja}>
                No por ahora
              </button>
            </div>
          </div>
        )}

        {/* PASO 2: Monto inicial */}
        {paso === 'monto' && (
          <div style={styles.body}>
            <p style={styles.montoLabel}>¿ Efectivo Inicial en Caja ?</p>
            <div style={styles.inputWrapper}>
              <span style={styles.prefijo}>$</span>
              <input
                ref={inputRef}
                type="number"
                value={efectivo}
                onChange={e => setEfectivo(e.target.value)}
                placeholder="0.00"
                style={styles.inputMonto}
                step="0.01"
                min="0"
              />
            </div>
            {error && <p style={styles.error}>{error}</p>}
            <button
              style={{ ...styles.btnRegistrar, opacity: cargando ? 0.6 : 1 }}
              onClick={handleRegistrar}
              disabled={cargando}
            >
              {cargando ? 'Registrando...' : 'Registrar dinero inicial en caja'}
            </button>
            <button style={styles.btnVolver} onClick={() => setPaso('pregunta')}>
              Volver
            </button>
          </div>
        )}

      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },

  modal: {
    background: '#FFFFFF',
    borderRadius: 8,
    width: 380,
    boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
    overflow: 'hidden',
    fontFamily: 'Segoe UI, system-ui, sans-serif'
  },

  header: {
    background: '#1e3a5f',
    color: '#FFF',
    padding: '14px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },

  headerTitle: {
    fontSize: 15,
    fontWeight: 600,
    letterSpacing: '0.3px'
  },

  btnClose: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.8)',
    fontSize: 18,
    cursor: 'pointer',
    padding: '0 4px',
    lineHeight: 1,
    fontWeight: 300
  },

  body: {
    padding: '32px 28px 28px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16
  },

  preguntaTexto: {
    fontSize: 20,
    fontWeight: 600,
    color: '#1F2937',
    margin: 0,
    textAlign: 'center'
  },

  botonesDecision: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    width: '100%',
    marginTop: 8
  },

  btnSi: {
    padding: '14px 0',
    background: '#1e3a5f',
    color: '#FFF',
    border: 'none',
    borderRadius: 6,
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    width: '100%',
    letterSpacing: '0.3px'
  },

  btnNo: {
    padding: '12px 0',
    background: '#F3F4F6',
    color: '#6B7280',
    border: '1px solid #E5E7EB',
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    width: '100%'
  },

  montoLabel: {
    fontSize: 16,
    fontWeight: 600,
    color: '#1F2937',
    margin: 0,
    textAlign: 'center'
  },

  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    border: '2px solid #1e3a5f',
    borderRadius: 8,
    overflow: 'hidden',
    width: '100%'
  },

  prefijo: {
    padding: '0 14px',
    fontSize: 24,
    fontWeight: 700,
    color: '#1e3a5f',
    background: '#EEF2FF',
    alignSelf: 'stretch',
    display: 'flex',
    alignItems: 'center'
  },

  inputMonto: {
    flex: 1,
    padding: '14px 16px',
    fontSize: 28,
    fontWeight: 700,
    color: '#1F2937',
    border: 'none',
    outline: 'none',
    textAlign: 'center',
    fontFamily: 'Segoe UI, system-ui, sans-serif'
  },

  btnRegistrar: {
    padding: '14px 0',
    background: '#4caf50',
    color: '#FFF',
    border: 'none',
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    width: '100%',
    letterSpacing: '0.3px',
    transition: 'background 0.2s'
  },

  btnVolver: {
    background: 'none',
    border: 'none',
    color: '#9CA3AF',
    fontSize: 13,
    cursor: 'pointer',
    padding: '4px 0'
  },

  error: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: 500,
    padding: '8px 12px',
    background: '#FEF2F2',
    borderRadius: 6,
    textAlign: 'center',
    margin: 0,
    width: '100%'
  }
}
