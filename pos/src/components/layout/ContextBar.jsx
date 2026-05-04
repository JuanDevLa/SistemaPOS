const CTX = {
  venta:         { label: 'VENTA – Ticket 1',           grad: 'linear-gradient(90deg, #2c5aa0, #1e3a6e)' },
  creditos:      { label: 'CRÉDITO A CLIENTES',         grad: 'linear-gradient(90deg, #5b21b6, #3b0e8c)' },
  clientes:      { label: 'CLIENTES',                   grad: 'linear-gradient(90deg, #0e7490, #0a5068)' },
  productos:     { label: 'PRODUCTOS',                  grad: 'linear-gradient(90deg, #b45309, #7c3d08)' },
  inventario:    { label: 'INVENTARIO',                 grad: 'linear-gradient(90deg, #166534, #0d4022)' },
  compras:       { label: 'COMPRAS',                    grad: 'linear-gradient(90deg, #9a3412, #6c2008)' },
  configuracion: { label: 'CONFIGURACIÓN',              grad: 'linear-gradient(90deg, #374151, #1f2937)' },
  facturas:      { label: 'FACTURAS',                   grad: 'linear-gradient(90deg, #1e40af, #172c7a)' },
  corte:         { label: 'CORTE DE CAJA',              grad: 'linear-gradient(90deg, #374151, #1f2937)' },
  reportes:      { label: 'REPORTES Y ESTADÍSTICAS',    grad: 'linear-gradient(90deg, #1e3a5f, #102040)' },
}

const SUBTAB_LABEL = {
  entrada: ' – Entrada de Mercancía',
  carga:   ' – Carga Inicial de Inventario',
}

export default function ContextBar({ tab, subTabInventario }) {
  const ctx = CTX[tab] || CTX.venta
  const suffix = tab === 'inventario' ? (SUBTAB_LABEL[subTabInventario] || '') : ''

  return (
    <div style={{ ...s.bar, background: ctx.grad }}>
      <span style={s.texto}>{ctx.label}{suffix}</span>
    </div>
  )
}

const s = {
  bar: {
    padding: '7px 18px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center'
  },
  texto: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.9px',
    textTransform: 'uppercase',
    textShadow: '0 1px 2px rgba(0,0,0,0.3)'
  }
}
