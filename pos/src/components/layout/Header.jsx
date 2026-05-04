import { AlertTriangle, WifiOff, LogOut } from 'lucide-react'

export default function Header({ negocio, cajero, corteActivo, isOnline, onLogout }) {
  return (
    <div style={s.header}>
      <div style={s.left}>
        <span style={s.negocio}>{negocio || 'PUNTO DE VENTA'}</span>
      </div>
      <div style={s.right}>
        {!corteActivo && (
          <span style={s.badge}><AlertTriangle size={11} style={{ marginRight: 4 }} />Caja sin abrir</span>
        )}
        {!isOnline && (
          <span style={{ ...s.badge, background: '#b91c1c' }}><WifiOff size={11} style={{ marginRight: 4 }} />SIN CONEXIÓN</span>
        )}
        <span style={s.cajero}>Le atiende: <strong>{cajero}</strong></span>
        <button className="pos-btn" style={s.btnSalir} onClick={onLogout}>
          <LogOut size={13} style={{ marginRight: 5 }} />Salir
        </button>
      </div>
    </div>
  )
}

const s = {
  header: {
    background: 'linear-gradient(180deg, #1e2d42 0%, #16222f 100%)',
    color: '#fff',
    padding: '0 16px',
    height: 46,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
    boxShadow: '0 2px 6px rgba(0,0,0,0.35)'
  },
  left: { display: 'flex', alignItems: 'center', gap: 10 },
  negocio: {
    fontSize: 17,
    fontWeight: 700,
    letterSpacing: '-0.3px',
    color: '#e8f0ff'
  },
  right: { display: 'flex', alignItems: 'center', gap: 10 },
  badge: {
    padding: '2px 9px',
    borderRadius: 3,
    fontSize: 11,
    fontWeight: 700,
    color: '#666',
    background: 'transparent',
    letterSpacing: '0.3px'
  },
  cajero: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  btnSalir: {
    padding: '4px 14px',
    fontSize: 12,
    fontWeight: 700
  }
}
