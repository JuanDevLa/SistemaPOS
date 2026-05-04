import { useState, useEffect } from 'react'
import { api } from '../api'

const NEGOCIOS = [
  { id: 1, nombre: 'Farmacia Noriega' },
  { id: 2, nombre: 'Crucero Independencia' },
]

export default function LoginScreen({ onLogin }) {
  const [negocio_id, setNegocioId] = useState(NEGOCIOS[0].id)
  const [usuario, setUsuario] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    const checkConn = async () => {
      const online = await api.checkConn()
      setIsOnline(online)
    }

    checkConn()
    const interval = setInterval(checkConn, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const enUsuarioInput = () => {
      const el = document.activeElement
      return el && el.tagName === 'INPUT' && el.dataset.campo === 'usuario'
    }

    const handleKeyDown = async (e) => {
      if (cargando) return

      // Dígitos físicos del teclado (top row + numpad) → llenan el PIN
      // (excepto cuando el cursor está en el campo "Usuario")
      if (/^[0-9]$/.test(e.key) && !enUsuarioInput()) {
        e.preventDefault()
        setPin(p => (p.length < 4 ? p + e.key : p))
        return
      }

      // Backspace fuera del input de usuario → borra último dígito del PIN
      if (e.key === 'Backspace' && !enUsuarioInput()) {
        e.preventDefault()
        setPin(p => p.slice(0, -1))
        return
      }

      if (e.key === 'Enter') {
        e.preventDefault()
        // Si está en el campo usuario y el PIN aún no está completo, sólo desenfoca
        // para que los dígitos del teclado físico empiecen a llenar el PIN.
        if (enUsuarioInput() && usuario && pin.length < 4) {
          document.activeElement?.blur()
          return
        }
        if (!usuario || !pin) {
          setError('Ingresa usuario y PIN')
          return
        }
        setCargando(true)
        setError('')
        try {
          const res = await api.loginCajero(usuario, pin, negocio_id)
          if (res.token || res.success) {
            onLogin(res)
          } else {
            setError('Credenciales incorrectas')
            setPin('')
            setCargando(false)
          }
        } catch(e) {
          setError(e.message)
          setPin('')
          setCargando(false)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [usuario, pin, negocio_id, cargando, onLogin])

  const handlePin = (num) => {
    if (pin.length < 4) setPin(p => p + num)
  }

  const handleBorrar = () => setPin(p => p.slice(0, -1))

  const handleLogin = async () => {
    if (!usuario || !pin) {
      setError('Ingresa usuario y PIN')
      return
    }
    setCargando(true)
    setError('')
    try {
      const res = await api.loginCajero(usuario, pin, negocio_id)
      if (res.token || res.success) {
        onLogin(res)
      } else {
        setError('Credenciales incorrectas')
        setPin('')
      }
    } catch(e) {
      setError(e.message)
      setPin('')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h1 style={styles.title}>Punto de Venta</h1>
          {!isOnline && <span style={{ padding: '6px 12px', background: '#DC2626', color: 'white', borderRadius: 4, fontSize: 12, fontWeight: 'bold' }}>SIN CONEXIÓN</span>}
        </div>

        <select
          value={negocio_id}
          onChange={e => setNegocioId(Number(e.target.value))}
          style={styles.select}
        >
          {NEGOCIOS.map(n => (
            <option key={n.id} value={n.id}>{n.nombre}</option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Usuario"
          value={usuario}
          onChange={e => setUsuario(e.target.value)}
          style={styles.input}
          autoComplete="off"
          data-campo="usuario"
          autoFocus
        />

        <div style={styles.pinDisplay}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ ...styles.pinDot, background: i < pin.length ? '#2563a8' : '#E5E7EB' }} />
          ))}
        </div>

        <div style={styles.numpad}>
          {[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((n, i) => (
            <button
              key={i}
              style={{ ...styles.btn, opacity: n === '' ? 0 : 1 }}
              onClick={() => n === '⌫' ? handleBorrar() : n !== '' && handlePin(String(n))}
              disabled={n === ''}
              onMouseEnter={e => n !== '' && (e.target.style.background = '#F3F4F6')}
              onMouseLeave={e => n !== '' && (e.target.style.background = '#FFFFFF')}
            >
              {n}
            </button>
          ))}
        </div>

        {error && <p style={styles.error}>{error}</p>}

        <button
          style={styles.btnLogin}
          onClick={handleLogin}
          disabled={cargando}
          onMouseEnter={e => e.target.style.background = '#43a047'}
          onMouseLeave={e => e.target.style.background = '#4caf50'}
        >
          {cargando ? 'Verificando...' : 'Entrar'}
        </button>
      </div>
    </div>
  )
}

const styles = {
  container: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #F8FAFC 0%, #EDF2F7 100%)',
    fontFamily: 'Segoe UI, system-ui, -apple-system, sans-serif'
  },

  card: {
    background: '#FFFFFF',
    borderRadius: 12,
    padding: 48,
    width: 380,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 20,
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)',
    border: '1px solid #E5E7EB'
  },

  title: {
    fontSize: 28,
    fontWeight: 700,
    color: '#1F2937',
    marginBottom: 8,
    letterSpacing: '-0.5px'
  },

  select: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 6,
    border: '1px solid #E5E7EB',
    background: '#F8FAFC',
    color: '#1F2937',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'border-color 0.2s ease',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
  },

  input: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 6,
    border: '1px solid #E5E7EB',
    background: '#F8FAFC',
    color: '#1F2937',
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.2s ease',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    fontFamily: 'Segoe UI, system-ui, sans-serif'
  },

  pinDisplay: {
    display: 'flex',
    gap: 12,
    margin: '16px 0',
    justifyContent: 'center'
  },

  pinDot: {
    width: 18,
    height: 18,
    borderRadius: '50%',
    transition: 'background 0.2s ease',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
  },

  numpad: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: 12,
    width: '100%',
    marginTop: 8
  },

  btn: {
    padding: '18px 0',
    borderRadius: 6,
    border: '1px solid #E5E7EB',
    background: '#FFFFFF',
    color: '#1F2937',
    fontSize: 18,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
  },

  error: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: 500,
    padding: '8px 12px',
    background: '#FEF2F2',
    borderRadius: 6,
    textAlign: 'center'
  },

  btnLogin: {
    width: '100%',
    padding: '14px 0',
    borderRadius: 6,
    border: 'none',
    background: '#4caf50',
    color: '#fff',
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: 12,
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 4px rgba(76,175,80,0.2)',
    letterSpacing: '0.5px'
  }
}
