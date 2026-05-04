import { useState, useEffect } from 'react'
import { api } from '../api'
import { exportarTodo } from '../utils/exportarExcel'

const NEGOCIOS = [
  { id: 1, nombre: 'Farmacia Noriega' },
  { id: 2, nombre: 'Crucero Independencia' },
]

export default function DashboardPage() {
  const [data, setData] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [exportandoTodo, setExportandoTodo] = useState(false)

  useEffect(() => {
    cargar()
    const intervalo = setInterval(cargar, 60000) // refresca cada minuto
    return () => clearInterval(intervalo)
  }, [])

  const cargar = async () => {
    const res = await api.obtenerResumen()
    if (!res.error) setData(res)
    setCargando(false)
  }

  const handleExportarTodo = async () => {
    setExportandoTodo(true)
    try {
      // Llamar a los 2 endpoints para cada negocio (6 llamadas total)
      const promesas = [
        api.listarVentas('negocio_id=1&fecha_inicio=2000-01-01&fecha_fin=2099-12-31'),
        api.listarVentas('negocio_id=2&fecha_inicio=2000-01-01&fecha_fin=2099-12-31'),
        api.listarInventario(1),
        api.listarInventario(2),
        api.listarCortes(1),
        api.listarCortes(2),
      ]
      const [v1, v2, inv1, inv2, c1, c2] = await Promise.all(promesas)

      const ventasPorNegocio = { 1: v1, 2: v2 }
      const inventarioPorNegocio = { 1: inv1, 2: inv2 }
      const cortesPorNegocio = { 1: c1, 2: c2 }

      exportarTodo(ventasPorNegocio, inventarioPorNegocio, cortesPorNegocio)
    } catch (error) {
      alert('Error al exportar datos')
      console.error(error)
    } finally {
      setExportandoTodo(false)
    }
  }

  if (cargando) return <p style={{ color: '#6B7280', padding: 20 }}>Cargando...</p>
  if (!data) return <p style={{ color: '#DC2626' }}>Error al cargar datos.</p>

  const fecha = new Date(data.fecha).toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  return (
    <div>
      <div style={s.pageHeader}>
        <div>
          <h2 style={s.pageTitle}>Dashboard</h2>
          <p style={s.pageSub}>{fecha}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={s.btnRefresh} onClick={cargar}>Actualizar</button>
          <button
            style={{ ...s.btnExcel, opacity: exportandoTodo ? 0.6 : 1 }}
            disabled={exportandoTodo}
            onClick={handleExportarTodo}
          >
            {exportandoTodo ? 'Exportando...' : 'Exportar todo'}
          </button>
        </div>
      </div>

      {/* TARJETAS RESUMEN */}
      <div className="dash-cards">
        <Card
          label="Ventas del día"
          value={`$${data.totales.total_ventas.toFixed(2)}`}
          sub={`${data.totales.num_ventas} transacciones`}
          color="#1E3A5F"
        />
        <Card
          label="Turnos abiertos"
          value={data.cortes_activos.length}
          sub={data.cortes_activos.length === 0 ? 'Sin turno activo' : `en ${data.cortes_activos.length} negocio(s)`}
          color="#065F46"
        />
        <Card
          label="Alertas de stock"
          value={data.stock_bajo.length}
          sub={data.stock_bajo.length === 0 ? 'Todo en orden' : 'productos bajo mínimo'}
          color={data.stock_bajo.length > 0 ? '#991B1B' : '#065F46'}
        />
      </div>

      {/* VENTAS POR NEGOCIO */}
      <Section title="Ventas de hoy por negocio">
        <div className="tbl-wrap">
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Negocio</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Ventas</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Efectivo</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Tarjeta</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Transferencia</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {data.negocios.map(n => (
                <tr key={n.negocio_id} style={s.tr}>
                  <td style={s.td}><strong>{n.negocio}</strong></td>
                  <td style={{ ...s.td, textAlign: 'right', color: '#6B7280' }}>{n.num_ventas}</td>
                  <td style={{ ...s.td, textAlign: 'right' }}>${n.total_efectivo.toFixed(2)}</td>
                  <td style={{ ...s.td, textAlign: 'right' }}>${n.total_tarjeta.toFixed(2)}</td>
                  <td style={{ ...s.td, textAlign: 'right' }}>${n.total_transferencia.toFixed(2)}</td>
                  <td style={{ ...s.td, textAlign: 'right', fontWeight: 700 }}>${n.total_ventas.toFixed(2)}</td>
                </tr>
              ))}
              <tr style={{ background: '#F9FAFB', fontWeight: 700 }}>
                <td style={s.td}>Total consolidado</td>
                <td style={{ ...s.td, textAlign: 'right', color: '#6B7280' }}>{data.totales.num_ventas}</td>
                <td style={s.td}></td>
                <td style={s.td}></td>
                <td style={s.td}></td>
                <td style={{ ...s.td, textAlign: 'right', color: '#1E3A5F', fontSize: 16 }}>
                  ${data.totales.total_ventas.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <div className="dash-split">

        {/* TURNOS ACTIVOS */}
        <Section title="Turnos por negocio">
          <div className="tbl-wrap tbl-compact">
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Neg.</th>
                  <th style={s.th}>Cajero</th>
                  <th style={s.th}>Apertura</th>
                  <th style={{ ...s.th, textAlign: 'right' }}>Efectivo</th>
                </tr>
              </thead>
              <tbody>
                {NEGOCIOS.map(neg => {
                  const turno = data.cortes_activos.find(c => c.negocio_id === neg.id || c.negocio === neg.nombre)
                  return (
                    <tr key={neg.id} style={s.tr}>
                      <td style={{ ...s.td, fontWeight: 600 }}>{abrevNegocio(neg.nombre)}</td>
                      {turno ? (
                        <>
                          <td style={s.td}>{turno.cajero}</td>
                          <td style={{ ...s.td, color: '#6B7280' }}>
                            {new Date(turno.apertura).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td style={{ ...s.td, textAlign: 'right' }}>${parseFloat(turno.efectivo_inicial).toFixed(2)}</td>
                        </>
                      ) : (
                        <td colSpan={3} style={{ ...s.td, color: '#9CA3AF', fontStyle: 'italic' }}>Sin turno activo</td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Section>

        {/* ALERTAS DE STOCK */}
        <Section title={`Stock bajo (${data.stock_bajo.length})`}>
          {data.stock_bajo.length === 0 ? (
            <p style={s.empty}>Sin productos en alerta.</p>
          ) : (
            <div className="tbl-wrap tbl-compact">
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Producto</th>
                    <th style={s.th}>Neg.</th>
                    <th style={{ ...s.th, textAlign: 'right' }}>Stock</th>
                    <th style={{ ...s.th, textAlign: 'right' }}>Mín.</th>
                  </tr>
                </thead>
                <tbody>
                  {data.stock_bajo.map((p, i) => (
                    <tr key={i} style={s.tr}>
                      <td style={s.td}><span style={s.productName}>{p.nombre}</span></td>
                      <td style={{ ...s.td, fontSize: 12, color: '#6B7280' }}>{abrevNegocio(p.negocio)}</td>
                      <td style={{ ...s.td, textAlign: 'right', color: '#DC2626', fontWeight: 700 }}>{p.cantidad}</td>
                      <td style={{ ...s.td, textAlign: 'right', color: '#6B7280' }}>{p.alerta_minima}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

      </div>
    </div>
  )
}

const abrevNegocio = n => n?.includes('Noriega') ? 'F.N.' : n?.includes('Crucero') || n?.includes('Independencia') ? 'C.I.' : n

function Card({ label, value, sub, color }) {
  return (
    <div style={s.card}>
      <div style={{ ...s.cardAccent, background: color }} />
      <div style={s.cardBody}>
        <p style={s.cardLabel}>{label}</p>
        <p style={{ ...s.cardValue, color }}>{value}</p>
        <p style={s.cardSub}>{sub}</p>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={s.section}>
      <h3 style={s.sectionTitle}>{title}</h3>
      {children}
    </div>
  )
}

const s = {
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  pageTitle: { fontSize: 22, fontWeight: 700 },
  pageSub: { color: '#6B7280', fontSize: 13, marginTop: 2, textTransform: 'capitalize' },
  btnRefresh: {
    padding: '7px 14px', background: '#FFF', border: '1px solid #D1D5DB',
    borderRadius: 6, fontSize: 13, color: '#374151',
  },
  btnExcel: { padding: '8px 16px', background: '#10B981', color: '#FFF', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  cardsRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 },
  card: { background: '#FFF', borderRadius: 8, border: '1px solid #E5E7EB', display: 'flex', overflow: 'hidden' },
  cardAccent: { width: 6, flexShrink: 0 },
  cardBody: { padding: '16px 20px' },
  cardLabel: { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  cardValue: { fontSize: 28, fontWeight: 700, marginBottom: 2 },
  cardSub: { fontSize: 12, color: '#9CA3AF' },
  section: { marginTop: 0 },
  sectionTitle: { fontSize: 15, fontWeight: 600, marginBottom: 10, color: '#111827' },
  tableWrap: { background: '#FFF', borderRadius: 8, border: '1px solid #E5E7EB', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '9px 14px', background: '#F9FAFB', fontSize: 12, fontWeight: 600, color: '#6B7280', textAlign: 'left', borderBottom: '1px solid #E5E7EB' },
  tr: { borderBottom: '1px solid #F3F4F6' },
  td: { padding: '10px 14px', fontSize: 13 },
  productName: { fontWeight: 500 },
  empty: { color: '#9CA3AF', fontSize: 13, padding: '20px 0', textAlign: 'center' },
}
