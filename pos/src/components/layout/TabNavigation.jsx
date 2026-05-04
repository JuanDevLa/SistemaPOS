import {
  ShoppingCart, Smartphone, CreditCard, Users, Package,
  ClipboardList, Truck, Settings, Scissors, BarChart2
} from 'lucide-react'

const TABS = [
  { id: 'venta',         label: 'Ventas',        Icono: ShoppingCart,  tecla: 'F1', permiso: null },
  { id: 'recargas',      label: 'Recargas',      Icono: Smartphone,    tecla: null, permiso: 'vender_recargas' },
  { id: 'creditos',      label: 'Créditos',      Icono: CreditCard,    tecla: 'F2', permiso: 'cobrar_credito' },
  { id: 'clientes',      label: 'Clientes',      Icono: Users,         tecla: null, permiso: null },
  { id: 'productos',     label: 'Productos',     Icono: Package,       tecla: 'F3', permiso: null },
  { id: 'inventario',    label: 'Inventario',    Icono: ClipboardList, tecla: 'F4', permiso: null },
  { id: 'compras',       label: 'Compras',       Icono: Truck,         tecla: null, permiso: 'crear_ordenes_compra' },
  { id: 'configuracion', label: 'Configuración', Icono: Settings,      tecla: null, permiso: 'cambiar_config' },
  { id: 'corte',         label: 'Corte',         Icono: Scissors,      tecla: null, permiso: 'corte_propio' },
  { id: 'reportes',      label: 'Reportes',      Icono: BarChart2,     tecla: null, permiso: 'ver_reportes' },
]

export function tabsPermitidos(puede) {
  return TABS.filter(t => !t.permiso || puede(t.permiso))
}

export default function TabNavigation({ tabActivo, onChange, puede, cantidadStockBajo, onAbrirAlertas }) {
  const visibles = tabsPermitidos(puede)

  return (
    <div style={s.navBar}>
      {visibles.map(tab => {
        const isActive = tabActivo === tab.id
        return (
          <button
            key={tab.id}
            style={{ ...s.navBtn, ...(isActive ? s.navBtnActive : {}) }}
            onClick={() => onChange(tab.id)}
            title={tab.tecla ? `${tab.tecla} — ${tab.label}` : tab.label}
          >
            <tab.Icono size={14} strokeWidth={isActive ? 2.5 : 1.8} />
            {tab.tecla && <span style={{ ...s.tecla, ...(isActive ? s.teclaActive : {}) }}>{tab.tecla}</span>}
            <span>{tab.label}</span>
          </button>
        )
      })}
      {cantidadStockBajo > 0 && (
        <button
          style={s.alertBadgeIndependent}
          onClick={() => onAbrirAlertas()}
          title={`${cantidadStockBajo} producto(s) con stock bajo`}
        >
          ⚠️
        </button>
      )}
    </div>
  )
}

const s = {
  navBar: {
    display: 'flex',
    alignItems: 'stretch',
    background: '#e8e8e8',
    borderBottom: '2px solid #c0c0c0',
    padding: '5px 8px 0',
    gap: 3,
    flexShrink: 0,
    overflowX: 'auto'
  },
  navBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '6px 12px',
    background: 'transparent',
    border: 'none',
    borderRadius: '0',
    cursor: 'pointer',
    fontSize: 12.5,
    fontWeight: 500,
    color: '#666',
    fontFamily: 'Segoe UI, system-ui, sans-serif',
    boxShadow: 'none',
    whiteSpace: 'nowrap',
    transition: 'color 0.1s, background 0.1s',
    position: 'relative',
    bottom: 0
  },
  navBtnActive: {
    background: 'transparent',
    color: '#1e3a5f',
    fontWeight: 700,
    boxShadow: 'inset 0 -3px 0 #2563a8',
    zIndex: 1,
  },
  tecla: {
    fontSize: 9,
    fontWeight: 700,
    background: '#d0d0d0',
    color: '#555',
    padding: '1px 4px',
    borderRadius: 2,
    letterSpacing: '0.3px',
    fontFamily: 'monospace'
  },
  teclaActive: {
    background: '#c8d8f0',
    color: '#1e3a5f'
  },
  alertBadgeIndependent: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    padding: '6px 12px',
    background: '#FFF3CD',
    border: '1px solid #FFE69C',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
    color: '#856404',
    fontFamily: 'Segoe UI, system-ui, sans-serif',
    marginLeft: 'auto',
    marginRight: 8,
    transition: 'background 0.1s',
    ':hover': { background: '#FFE69C' }
  }
}
