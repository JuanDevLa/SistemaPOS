import { useState, useEffect } from 'react'
import { KeyRound, Monitor, Loader2 } from 'lucide-react'

const estilos = {
  root: {
    position: 'fixed', inset: 0,
    background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2540 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'Segoe UI, system-ui, sans-serif',
  },
  card: {
    background: '#fff', borderRadius: 16, padding: '40px 48px',
    width: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
    display: 'flex', flexDirection: 'column', gap: 20,
  },
  logo: {
    textAlign: 'center', marginBottom: 4,
  },
  titulo: {
    fontSize: 22, fontWeight: 700, color: '#1e3a5f', textAlign: 'center', margin: 0,
  },
  subtitulo: {
    fontSize: 13, color: '#6B7280', textAlign: 'center', margin: 0,
  },
  label: { fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4, display: 'block' },
  input: {
    width: '100%', padding: '10px 12px', border: '1.5px solid #D1D5DB',
    borderRadius: 8, fontSize: 15, fontFamily: 'monospace', letterSpacing: 2,
    outline: 'none', boxSizing: 'border-box', textTransform: 'uppercase',
    color: '#1a1a1a',
  },
  boton: {
    padding: '12px', background: '#1e3a5f', color: '#fff',
    border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
    cursor: 'pointer', display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: 8,
  },
  error: {
    background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8,
    padding: '10px 12px', fontSize: 13, color: '#B91C1C',
  },
  hwid: {
    background: '#F9FAFB', borderRadius: 8, padding: '10px 12px',
    fontSize: 11, color: '#6B7280', display: 'flex', gap: 8, alignItems: 'flex-start',
  },
  footer: { fontSize: 11, color: '#9CA3AF', textAlign: 'center' },
}

export default function ActivacionScreen({ onActivar }) {
  const [clave, setClave]     = useState('')
  const [hwId, setHwId]       = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    window.licenciaAPI?.getHardwareId?.().then(id => setHwId(id || ''))
  }, [])

  const handleActivar = async () => {
    if (!clave.trim()) { setError('Ingresa la clave de licencia'); return }
    setCargando(true)
    setError('')
    const resultado = await window.licenciaAPI.activar(clave)
    setCargando(false)
    if (resultado.ok) {
      onActivar(resultado)
    } else {
      setError(resultado.mensaje || 'Error al activar')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleActivar()
  }

  return (
    <div style={estilos.root}>
      <div style={estilos.card}>
        <div style={estilos.logo}>
          <KeyRound size={40} color="#1e3a5f" />
        </div>

        <div>
          <p style={estilos.titulo}>Activar PDV</p>
          <p style={estilos.subtitulo}>Ingresa la clave de licencia para continuar</p>
        </div>

        <div>
          <label style={estilos.label}>Clave de licencia</label>
          <input
            style={estilos.input}
            value={clave}
            onChange={e => setClave(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            placeholder="PDV-XXXX-XXXX-XXXX"
            autoFocus
          />
        </div>

        {error && <div style={estilos.error}>{error}</div>}

        <button style={estilos.boton} onClick={handleActivar} disabled={cargando}>
          {cargando
            ? <><Loader2 size={16} className="spin" /> Verificando...</>
            : <><KeyRound size={16} /> Activar licencia</>
          }
        </button>

        {hwId && (
          <div style={estilos.hwid}>
            <Monitor size={14} style={{ marginTop: 1, flexShrink: 0 }} />
            <span>
              <strong>ID de esta PC:</strong> {hwId}<br />
              Proporciona este ID a soporte si necesitas ayuda con la activación.
            </span>
          </div>
        )}

        <p style={estilos.footer}>
          PDV Punto de Venta · Contacto: soporte@pdvnoriega.com
        </p>
      </div>
    </div>
  )
}
