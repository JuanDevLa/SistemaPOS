import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { api } from '../api'

export default function LoginPage() {
  const { login } = useAuth()
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!usuario || !password) { setError('Ingresa usuario y contraseña'); return }
    setCargando(true)
    setError('')
    try {
      const res = await api.loginAdmin(usuario, password)
      if (res.token) {
        login(res)
      } else {
        setError(res.error || 'Credenciales incorrectas')
      }
    } catch {
      setError('No se pudo conectar al servidor. Verifica que esté corriendo.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>
          <h1 style={s.logoText}>PDV Admin</h1>
          <p style={s.logoSub}>Panel de Administración</p>
        </div>

        <form onSubmit={handleSubmit} style={s.form}>
          <div style={s.field}>
            <label style={s.label}>Usuario</label>
            <input
              style={s.input}
              type="text"
              value={usuario}
              onChange={e => setUsuario(e.target.value)}
              placeholder="admin"
              autoFocus
            />
          </div>

          <div style={s.field}>
            <label style={s.label}>Contraseña</label>
            <input
              style={s.input}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && <p style={s.error}>{error}</p>}

          <button style={{ ...s.btn, opacity: cargando ? 0.6 : 1 }} type="submit" disabled={cargando}>
            {cargando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}

const s = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#1E3A5F',
  },
  card: {
    background: '#FFF',
    borderRadius: 8,
    padding: '40px 36px',
    width: 360,
    boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
  },
  logo: { textAlign: 'center', marginBottom: 32 },
  logoText: { fontSize: 28, fontWeight: 700, color: '#1E3A5F' },
  logoSub: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 13, fontWeight: 600, color: '#374151' },
  input: {
    padding: '10px 12px',
    border: '1px solid #D1D5DB',
    borderRadius: 6,
    fontSize: 14,
    outline: 'none',
  },
  error: { color: '#DC2626', fontSize: 13, textAlign: 'center' },
  btn: {
    padding: '11px 0',
    background: '#1E3A5F',
    color: '#FFF',
    border: 'none',
    borderRadius: 6,
    fontSize: 15,
    fontWeight: 600,
    marginTop: 4,
  },
}
