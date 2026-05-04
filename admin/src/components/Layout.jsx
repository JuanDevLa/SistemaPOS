import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV = [
  { to: '/',          label: 'Dashboard',  icon: '▤' },
  { to: '/productos',     label: 'Productos',     icon: '▦' },
  { to: '/departamentos', label: 'Departamentos', icon: '▤' },
  { to: '/inventario',  label: 'Inventario',  icon: '▣' },
  { to: '/caducidades', label: 'Caducidades', icon: '⏳' },
  { to: '/clientes',  label: 'Clientes',   icon: '▤' },
  { to: '/ventas',    label: 'Ventas',     icon: '▧' },
  { to: '/cortes',    label: 'Cortes',     icon: '▨' },
  { to: '/reportes',      label: 'Reportes',      icon: '▤' },
  { to: '/configuracion', label: 'Configuración', icon: '⚙' },
  { to: '/usuarios',  label: 'Usuarios',   icon: '▤' },
  { to: '/movimientos', label: 'Movimientos', icon: '▥' },
  { to: '/auditoria',  label: 'Auditoría',   icon: '▤' },
]

export default function Layout({ children }) {
  const { usuario, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const closeSidebar = () => setOpen(false)

  const currentLabel = NAV.find(n =>
    n.to === '/' ? location.pathname === '/' : location.pathname.startsWith(n.to)
  )?.label ?? 'Admin'

  return (
    <div className="admin-shell">
      {/* TOPBAR (solo mobile) */}
      <div className="admin-topbar">
        <button
          className={`admin-hamburger${open ? ' open' : ''}`}
          onClick={() => setOpen(o => !o)}
          aria-label="Menú"
        >
          <span /><span /><span />
        </button>
        <span style={{ fontWeight: 600, fontSize: 15 }}>{currentLabel}</span>
        <span style={{ fontSize: 13, opacity: 0.7 }}>{usuario?.nombre}</span>
      </div>

      {/* OVERLAY (solo mobile) */}
      <div className={`admin-overlay${open ? ' open' : ''}`} onClick={closeSidebar} />

      {/* SIDEBAR */}
      <aside className={`admin-sidebar${open ? ' open' : ''}`}>
        <div style={s.sideTop}>
          <div style={s.brand}>PDV Admin</div>
          <nav style={s.nav}>
            {NAV.map(n => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === '/'}
                onClick={closeSidebar}
                style={({ isActive }) => ({ ...s.navLink, ...(isActive ? s.navLinkActive : {}) })}
              >
                <span style={s.navIcon}>{n.icon}</span>
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div style={s.sideBottom}>
          <div style={s.userInfo}>{usuario?.nombre || 'Admin'}</div>
          <button style={s.logoutBtn} onClick={handleLogout}>Cerrar sesión</button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="admin-main">
        {children}
      </main>
    </div>
  )
}

const s = {
  sideTop: { padding: '24px 0 16px' },
  brand: {
    fontSize: 20,
    fontWeight: 700,
    padding: '0 20px 24px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    marginBottom: 8,
  },
  nav: { display: 'flex', flexDirection: 'column', gap: 2, padding: '8px 0' },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 20px',
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    borderLeft: '3px solid transparent',
  },
  navLinkActive: {
    color: '#FFF',
    background: 'rgba(255,255,255,0.1)',
    borderLeft: '3px solid #60A5FA',
  },
  navIcon: { fontSize: 16 },
  sideBottom: { padding: 16, borderTop: '1px solid rgba(255,255,255,0.1)' },
  userInfo: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 8 },
  logoutBtn: {
    width: '100%',
    padding: '8px 0',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#FFF',
    borderRadius: 4,
    fontSize: 13,
  },
}
