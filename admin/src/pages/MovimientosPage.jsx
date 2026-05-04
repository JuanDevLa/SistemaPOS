import { useState, useEffect } from 'react'
import { api } from '../api'
import { exportarMovimientos } from '../utils/exportarExcel'

const NEGOCIOS = [
  { id: 1, nombre: 'Farmacia Noriega' },
  { id: 2, nombre: 'Crucero Independencia' },
]

const TIPOS = ['todos', 'venta', 'entrada', 'ajuste', 'carga_inicial', 'devolucion']

const tipoBadgeColor = (tipo) => {
  const map = {
    venta:         { background: '#DBEAFE', color: '#1E40AF' },
    entrada:       { background: '#D1FAE5', color: '#065F46' },
    ajuste:        { background: '#FEF3C7', color: '#92400E' },
    carga_inicial: { background: '#EDE9FE', color: '#5B21B6' },
    devolucion:    { background: '#FEE2E2', color: '#991B1B' },
  }
  return map[tipo] || { background: '#F3F4F6', color: '#374151' }
}

export default function MovimientosPage() {
  const [negocioId, setNegocioId] = useState(1)
  const [movimientos, setMovimientos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => { cargar() }, [negocioId])

  const cargar = async () => {
    setCargando(true)
    const res = await api.listarMovimientos(negocioId)
    setMovimientos(Array.isArray(res) ? res : [])
    setCargando(false)
  }

  const items = movimientos.filter(m => {
    if (filtroTipo !== 'todos' && m.tipo !== filtroTipo) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      return (
        m.producto.toLowerCase().includes(q) ||
        (m.usuario || '').toLowerCase().includes(q) ||
        (m.notas || '').toLowerCase().includes(q)
      )
    }
    return true
  })

  const conteosPorTipo = movimientos.reduce((acc, m) => {
    acc[m.tipo] = (acc[m.tipo] || 0) + 1
    return acc
  }, {})

  return (
    <div>
      {/* HEADER */}
      <div style={s.pageHeader}>
        <div>
          <h2 style={s.pageTitle}>Movimientos de Inventario</h2>
          <p style={s.pageSub}>{movimientos.length} registros (últimos 100)</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={s.btnRefresh} onClick={cargar}>Actualizar</button>
          <button
            style={{ ...s.btnExcel, opacity: items.length === 0 ? 0.5 : 1 }}
            disabled={items.length === 0}
            onClick={() => exportarMovimientos(items, negocioId)}
          >
            Exportar Excel
          </button>
        </div>
      </div>

      {/* TABS NEGOCIO */}
      <div style={{ ...s.negocioTabs, marginBottom: 16 }}>
        {NEGOCIOS.map(n => (
          <button
            key={n.id}
            style={{ ...s.tabBtn, ...(negocioId === n.id ? s.tabBtnActive : {}) }}
            onClick={() => setNegocioId(n.id)}
          >
            {n.nombre}
          </button>
        ))}
      </div>

      {/* RESUMEN POR TIPO */}
      {movimientos.length > 0 && (
        <div style={s.resumenRow}>
          {Object.entries(conteosPorTipo).map(([tipo, count]) => (
            <button
              key={tipo}
              style={{
                ...s.resumenCard,
                ...(filtroTipo === tipo ? s.resumenCardActive : {}),
              }}
              onClick={() => setFiltroTipo(filtroTipo === tipo ? 'todos' : tipo)}
            >
              <span style={{ ...s.tipoBadge, ...tipoBadgeColor(tipo) }}>{tipo}</span>
              <span style={s.resumenCount}>{count}</span>
            </button>
          ))}
        </div>
      )}

      {/* BÚSQUEDA + FILTRO TIPO */}
      <div style={s.controls}>
        <input
          style={s.searchInput}
          type="text"
          placeholder="Buscar por producto, usuario o notas..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
        <select
          style={s.select}
          value={filtroTipo}
          onChange={e => setFiltroTipo(e.target.value)}
        >
          {TIPOS.map(t => (
            <option key={t} value={t}>
              {t === 'todos' ? 'Todos los tipos' : t}
            </option>
          ))}
        </select>
      </div>

      {/* TABLA */}
      {cargando ? (
        <p style={{ color: '#6B7280', padding: 20 }}>Cargando...</p>
      ) : items.length === 0 ? (
        <div style={s.empty}>
          {busqueda || filtroTipo !== 'todos'
            ? 'Sin resultados para ese filtro.'
            : 'Sin movimientos en este negocio.'}
        </div>
      ) : (
        <div className="tbl-wrap">
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>#</th>
                <th style={s.th}>Fecha</th>
                <th style={s.th}>Hora</th>
                <th style={s.th}>Producto</th>
                <th style={s.th}>Tipo</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Cantidad</th>
                <th style={s.th}>Usuario</th>
                <th style={s.th}>Notas</th>
              </tr>
            </thead>
            <tbody>
              {items.map(m => {
                const esEntrada = parseFloat(m.cantidad) > 0
                return (
                  <tr key={m.id} style={s.tr}>
                    <td style={{ ...s.td, color: '#6B7280', fontFamily: 'monospace', fontSize: 12 }}>
                      #{m.id}
                    </td>
                    <td style={s.td}>
                      {new Date(m.creado_en).toLocaleDateString('es-MX')}
                    </td>
                    <td style={{ ...s.td, color: '#6B7280', fontSize: 12 }}>
                      {new Date(m.creado_en).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={s.td}>
                      <span style={s.productoNombre}>{m.producto}</span>
                    </td>
                    <td style={s.td}>
                      <span style={{ ...s.tipoBadge, ...tipoBadgeColor(m.tipo) }}>
                        {m.tipo}
                      </span>
                    </td>
                    <td style={{ ...s.td, textAlign: 'right', fontWeight: 700, color: esEntrada ? '#065F46' : '#DC2626' }}>
                      {esEntrada ? '+' : ''}{parseFloat(m.cantidad)}
                    </td>
                    <td style={{ ...s.td, color: '#6B7280', fontSize: 12 }}>
                      {m.usuario || '—'}
                    </td>
                    <td style={{ ...s.td, color: '#6B7280', fontSize: 12, maxWidth: 200 }}>
                      {m.notas || '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const s = {
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  pageTitle: { fontSize: 22, fontWeight: 700 },
  pageSub: { color: '#6B7280', fontSize: 13, marginTop: 2 },
  btnRefresh: { padding: '7px 14px', background: '#FFF', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 13, color: '#374151' },
  btnExcel: { padding: '8px 16px', background: '#10B981', color: '#FFF', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  negocioTabs: { display: 'flex', gap: 4 },
  tabBtn: { padding: '7px 16px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 13, background: '#FFF', color: '#374151' },
  tabBtnActive: { background: '#1E3A5F', color: '#FFF', borderColor: '#1E3A5F' },
  resumenRow: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  resumenCard: { background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 6, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' },
  resumenCardActive: { border: '2px solid #1E3A5F' },
  resumenCount: { fontSize: 18, fontWeight: 700, color: '#111827' },
  controls: { display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' },
  searchInput: { padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 13, flex: 1, maxWidth: 360 },
  select: { padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 13, background: '#FFF' },
  empty: { padding: 40, textAlign: 'center', color: '#9CA3AF', background: '#FFF', borderRadius: 8, border: '1px solid #E5E7EB' },
  tableWrap: { background: '#FFF', borderRadius: 8, border: '1px solid #E5E7EB', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 14px', background: '#F9FAFB', fontSize: 12, fontWeight: 600, color: '#6B7280', textAlign: 'left', borderBottom: '1px solid #E5E7EB' },
  tr: { borderBottom: '1px solid #F3F4F6' },
  td: { padding: '10px 14px', fontSize: 13, verticalAlign: 'middle' },
  productoNombre: { fontWeight: 500 },
  tipoBadge: { display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600 },
}
