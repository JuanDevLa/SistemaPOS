import { ShieldAlert, RefreshCw, Loader2 } from 'lucide-react'
import { useState } from 'react'

const estilos = {
  root: {
    position: 'fixed', inset: 0,
    background: 'linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'Segoe UI, system-ui, sans-serif',
  },
  card: {
    background: '#fff', borderRadius: 16, padding: '40px 48px',
    width: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
    display: 'flex', flexDirection: 'column', gap: 20, textAlign: 'center',
  },
  titulo: { fontSize: 22, fontWeight: 700, color: '#7f1d1d', margin: 0 },
  mensaje: { fontSize: 14, color: '#4B5563', margin: 0, lineHeight: 1.6 },
  estado: {
    background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8,
    padding: '12px', fontSize: 13, color: '#991B1B', fontWeight: 500,
  },
  boton: {
    padding: '12px', background: '#7f1d1d', color: '#fff',
    border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
    cursor: 'pointer', display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: 8,
  },
  footer: { fontSize: 11, color: '#9CA3AF' },
}

const MENSAJES = {
  expirada:       'Tu suscripción ha vencido. Contacta a soporte para renovar tu licencia y continuar usando el sistema.',
  no_autorizada:  'Esta PC no está registrada en tu licencia o fue desactivada. Contacta a soporte.',
  gracia_expirada:'El sistema no pudo verificar la licencia por más de 7 días sin conexión a internet. Conecta esta PC a internet para continuar.',
}

export default function LicenciaVencidaScreen({ licencia, onReintentar }) {
  const [cargando, setCargando] = useState(false)

  const handleReintentar = async () => {
    setCargando(true)
    await new Promise(r => setTimeout(r, 800))
    setCargando(false)
    onReintentar()
  }

  const mensaje = licencia.mensaje || MENSAJES[licencia.estado] || 'Licencia inválida. Contacta a soporte.'

  return (
    <div style={estilos.root}>
      <div style={estilos.card}>
        <ShieldAlert size={48} color="#7f1d1d" style={{ margin: '0 auto' }} />

        <p style={estilos.titulo}>Licencia no válida</p>

        <div style={estilos.estado}>
          {licencia.estado === 'expirada' && '⚠️ Licencia vencida'}
          {licencia.estado === 'no_autorizada' && '🚫 PC no autorizada'}
          {licencia.estado === 'gracia_expirada' && '📡 Sin conexión prolongada'}
        </div>

        <p style={estilos.mensaje}>{mensaje}</p>

        <button style={estilos.boton} onClick={handleReintentar} disabled={cargando}>
          {cargando
            ? <><Loader2 size={16} /> Verificando...</>
            : <><RefreshCw size={16} /> Reintentar verificación</>
          }
        </button>

        <p style={estilos.footer}>
          PDV Punto de Venta · Soporte: soporte@pdvnoriega.com
        </p>
      </div>
    </div>
  )
}
