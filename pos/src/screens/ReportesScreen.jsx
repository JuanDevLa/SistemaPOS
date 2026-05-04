import { useState } from 'react'
import { api } from '../api'
import { usePermisos } from '../hooks/usePermisos'
import TabAuditLog from '../components/reportes/TabAuditLog'

const NEGOCIOS = [
  { id: 1, nombre: 'Farmacia Noriega' },
  { id: 2, nombre: 'Crucero Independencia' },
]

const hoy = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function rangoPreset(preset) {
  const now = new Date()
  const fmt = d => d.toISOString().split('T')[0]
  if (preset === 'hoy') return { fi: hoy(), ff: hoy() }
  if (preset === 'ayer') {
    const d = new Date(now); d.setDate(d.getDate() - 1)
    const f = fmt(d); return { fi: f, ff: f }
  }
  if (preset === 'semana') {
    const d = new Date(now); d.setDate(d.getDate() - d.getDay() + 1)
    return { fi: fmt(d), ff: hoy() }
  }
  if (preset === 'mes') {
    return { fi: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), ff: hoy() }
  }
  return null
}

export default function ReportesScreen({ usuario }) {
  const { esAdmin, esSupervisor } = usePermisos(usuario)
  const [vistaActiva, setVistaActiva] = useState('ventas')
  const [negocioId, setNegocioId] = useState(usuario?.negocio_id || 1)
  const [preset, setPreset] = useState('hoy')
  const [fechaInicio, setFechaInicio] = useState(hoy())
  const [fechaFin, setFechaFin] = useState(hoy())
  const [data, setData] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)

  const aplicarPreset = (p) => {
    setPreset(p)
    if (p !== 'custom') {
      const r = rangoPreset(p)
      setFechaInicio(r.fi); setFechaFin(r.ff)
    }
  }

  const cargar = async () => {
    setCargando(true); setError(null)
    try {
      const data = await api.reporteVentas(negocioId, fechaInicio, fechaFin)
      setData(data)
    } catch(e) {
      setError(e.message); setData(null)
    }
    setCargando(false)
  }

  const maxDia = data ? Math.max(...data.por_dia.map(d => d.total), 1) : 1
  const maxProducto = data ? Math.max(...data.top_productos.map(p => p.total), 1) : 1

  return (
    <div style={s.root}>
      <div style={s.pageHeader}>
        <div>
          <h2 style={s.pageTitle}>Reportes</h2>
          <p style={s.pageSub}>Análisis de ventas por período</p>
        </div>
        {(esAdmin || esSupervisor) && (
          <div style={s.vistaTabs}>
            <button style={{ ...s.vistaBtn, ...(vistaActiva === 'ventas' ? s.vistaBtnActive : {}) }} onClick={() => setVistaActiva('ventas')}>Ventas</button>
            <button style={{ ...s.vistaBtn, ...(vistaActiva === 'auditoria' ? s.vistaBtnActive : {}) }} onClick={() => setVistaActiva('auditoria')}>Auditoría</button>
          </div>
        )}
      </div>

      {vistaActiva === 'auditoria' && (esAdmin || esSupervisor) && (
        <TabAuditLog negocio_id={negocioId} />
      )}

      {vistaActiva === 'ventas' && <>
      <div style={s.controls}>
        {esAdmin && (
          <div style={s.negocioTabs}>
            {NEGOCIOS.map(n => (
              <button
                key={n.id}
                style={{ ...s.tabBtn, ...(negocioId === n.id ? s.tabBtnActive : {}) }}
                onClick={() => setNegocioId(n.id)}
              >{n.nombre}</button>
            ))}
          </div>
        )}

        <div style={s.presetRow}>
          {['hoy', 'ayer', 'semana', 'mes', 'custom'].map(p => (
            <button
              key={p}
              style={{ ...s.presetBtn, ...(preset === p ? s.presetBtnActive : {}) }}
              onClick={() => aplicarPreset(p)}
            >{{ hoy: 'Hoy', ayer: 'Ayer', semana: 'Esta semana', mes: 'Este mes', custom: 'Custom' }[p]}</button>
          ))}

          {preset === 'custom' && (
            <div style={s.fechas}>
              <input style={s.fechaInput} type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
              <span style={{ color: '#6B7280', fontSize: 13 }}>–</span>
              <input style={s.fechaInput} type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} />
            </div>
          )}

          <button style={s.btnBuscar} onClick={cargar} disabled={cargando}>
            {cargando ? 'Cargando...' : 'Generar'}
          </button>
        </div>
      </div>

      {error && <p style={s.errorMsg}>{error}</p>}

      {!data && !cargando && (
        <div style={s.empty}>Selecciona un período y presiona Generar para ver el reporte.</div>
      )}

      {data && (
        <>
          <div style={s.cardsRow}>
            <StatCard label="Total vendido"    value={`$${data.resumen.total.toFixed(2)}`}         color="#1E3A5F" />
            <StatCard label="Transacciones"    value={data.resumen.num_ventas}                      color="#065F46" />
            <StatCard label="Ticket promedio"  value={`$${data.resumen.ticket_promedio.toFixed(2)}`} color="#5B21B6" />
            <StatCard label="Descuentos"       value={`$${data.resumen.descuentos.toFixed(2)}`}     color="#92400E" />
          </div>

          <div style={s.grid2}>
            <Section title="Por método de pago">
              {data.por_metodo.length === 0 ? (
                <p style={s.emptySmall}>Sin datos</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {data.por_metodo.map(m => (
                    <div key={m.metodo} style={s.metodoRow}>
                      <div style={s.metodoLeft}>
                        <span style={{ ...s.metodoBadge, ...metodoBadgeColor(m.metodo) }}>{m.metodo}</span>
                        <span style={s.metodoCount}>{m.num_ventas} ventas</span>
                      </div>
                      <span style={s.metodoTotal}>${m.total.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section title="Por cajero">
              {data.por_cajero.length === 0 ? (
                <p style={s.emptySmall}>Sin datos</p>
              ) : (
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>Cajero</th>
                      <th style={{ ...s.th, textAlign: 'right' }}>Ventas</th>
                      <th style={{ ...s.th, textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.por_cajero.map((c, i) => (
                      <tr key={i} style={s.tr}>
                        <td style={s.td}>{c.cajero}</td>
                        <td style={{ ...s.td, textAlign: 'right', color: '#6B7280' }}>{c.num_ventas}</td>
                        <td style={{ ...s.td, textAlign: 'right', fontWeight: 600 }}>${c.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Section>
          </div>

          <Section title="Top 10 productos">
            {data.top_productos.length === 0 ? (
              <p style={s.emptySmall}>Sin datos</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {data.top_productos.map((p, i) => (
                  <div key={i} style={s.productoRow}>
                    <span style={s.productoRank}>{i + 1}</span>
                    <div style={{ flex: 1 }}>
                      <div style={s.productoNombre}>{p.producto}</div>
                      <div style={s.productoBar}>
                        <div style={{ ...s.productoBarFill, width: `${(p.total / maxProducto) * 100}%` }} />
                      </div>
                    </div>
                    <div style={s.productoStats}>
                      <span style={s.productoCantidad}>{p.cantidad} uds</span>
                      <span style={s.productoTotal}>${p.total.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {data.por_departamento?.length > 0 && (
            <Section title="Ventas por departamento">
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Departamento</th>
                    <th style={{ ...s.th, textAlign: 'right' }}>Ventas</th>
                    <th style={{ ...s.th, textAlign: 'right' }}>Unidades</th>
                    <th style={{ ...s.th, textAlign: 'right' }}>Total</th>
                    <th style={{ ...s.th, textAlign: 'right' }}>% del total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.por_departamento.map((d, i) => (
                    <tr key={i} style={s.tr}>
                      <td style={s.td}>{d.departamento}</td>
                      <td style={{ ...s.td, textAlign: 'right', color: '#6B7280' }}>{d.num_ventas}</td>
                      <td style={{ ...s.td, textAlign: 'right', color: '#6B7280' }}>{d.cantidad}</td>
                      <td style={{ ...s.td, textAlign: 'right', fontWeight: 600 }}>${d.total.toFixed(2)}</td>
                      <td style={{ ...s.td, textAlign: 'right', color: '#6B7280' }}>
                        {data.resumen.total > 0 ? ((d.total / data.resumen.total) * 100).toFixed(1) : '0'}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {data.por_dia.length > 1 && (
            <Section title="Ventas por día">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {data.por_dia.map((d, i) => (
                  <div key={i} style={s.diaRow}>
                    <span style={s.diaFecha}>
                      {new Date(d.fecha + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                    <div style={s.diaBarWrap}>
                      <div style={{ ...s.diaBarFill, width: `${(d.total / maxDia) * 100}%` }} />
                    </div>
                    <span style={s.diaTotal}>${d.total.toFixed(2)}</span>
                    <span style={s.diaCount}>{d.num_ventas} ventas</span>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </>
      )}
      </>}
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div style={s.card}>
      <div style={{ ...s.cardAccent, background: color }} />
      <div style={s.cardBody}>
        <p style={s.cardLabel}>{label}</p>
        <p style={{ ...s.cardValue, color }}>{value}</p>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={s.section}>
      <h3 style={s.sectionTitle}>{title}</h3>
      <div style={s.sectionBody}>{children}</div>
    </div>
  )
}

function metodoBadgeColor(metodo) {
  const map = {
    efectivo:      { background: '#D1FAE5', color: '#065F46' },
    tarjeta:       { background: '#DBEAFE', color: '#1E40AF' },
    transferencia: { background: '#EDE9FE', color: '#5B21B6' },
    credito:       { background: '#FEF3C7', color: '#92400E' },
    mixto:         { background: '#FEE2E2', color: '#991B1B' },
  }
  return map[metodo] || { background: '#F3F4F6', color: '#374151' }
}

const s = {
  root: { padding: 20, color: '#1a1a1a', overflow: 'auto', height: '100%' },
  pageHeader:     { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  pageTitle:      { fontSize: 22, fontWeight: 700, color: '#1a1a1a' },
  pageSub:        { color: '#6B7280', fontSize: 13, marginTop: 2 },
  vistaTabs:      { display: 'flex', gap: 4, alignItems: 'center' },
  vistaBtn:       { padding: '6px 16px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 13, color: '#6b7280' },
  vistaBtnActive: { background: '#1e3a5f', color: '#fff', borderColor: '#1e3a5f', fontWeight: 600 },
  controls: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  negocioTabs: { display: 'flex', gap: 4 },
  tabBtn: { padding: '7px 16px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 13, background: '#FFF', color: '#374151', cursor: 'pointer' },
  tabBtnActive: { background: '#1E3A5F', color: '#FFF', border: '1px solid #1E3A5F' },
  presetRow: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  presetBtn: { padding: '6px 12px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 12, background: '#FFF', color: '#6B7280', cursor: 'pointer' },
  presetBtnActive: { background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', fontWeight: 600 },
  fechas: { display: 'flex', alignItems: 'center', gap: 6 },
  fechaInput: { padding: '5px 8px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 12, color: '#1a1a1a' },
  btnBuscar: { padding: '7px 18px', background: '#1E3A5F', color: '#FFF', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  errorMsg: { color: '#DC2626', fontSize: 13, marginBottom: 12 },
  empty: { padding: 40, textAlign: 'center', color: '#9CA3AF', background: '#FFF', borderRadius: 8, border: '1px solid #E5E7EB' },
  emptySmall: { color: '#9CA3AF', fontSize: 13, padding: '12px 0', textAlign: 'center' },
  cardsRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 },
  card: { background: '#FFF', borderRadius: 8, border: '1px solid #E5E7EB', display: 'flex', overflow: 'hidden' },
  cardAccent: { width: 5, flexShrink: 0 },
  cardBody: { padding: '14px 16px' },
  cardLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  cardValue: { fontSize: 22, fontWeight: 700 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 10 },
  sectionBody: { background: '#FFF', borderRadius: 8, border: '1px solid #E5E7EB', padding: 16 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '8px 12px', background: '#F9FAFB', fontSize: 12, fontWeight: 600, color: '#6B7280', textAlign: 'left', borderBottom: '1px solid #E5E7EB' },
  tr: { borderBottom: '1px solid #F3F4F6' },
  td: { padding: '9px 12px', fontSize: 13, color: '#1a1a1a' },
  metodoRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #F3F4F6' },
  metodoLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  metodoBadge: { display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 500 },
  metodoCount: { fontSize: 12, color: '#9CA3AF' },
  metodoTotal: { fontWeight: 700, fontSize: 15 },
  productoRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' },
  productoRank: { width: 20, fontSize: 12, color: '#9CA3AF', textAlign: 'right', flexShrink: 0 },
  productoNombre: { fontSize: 13, fontWeight: 500, marginBottom: 4, color: '#1a1a1a' },
  productoBar: { height: 6, background: '#F3F4F6', borderRadius: 3, overflow: 'hidden' },
  productoBarFill: { height: '100%', background: '#1E3A5F', borderRadius: 3, transition: 'width 0.3s' },
  productoStats: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1, flexShrink: 0, minWidth: 90 },
  productoCantidad: { fontSize: 11, color: '#9CA3AF' },
  productoTotal: { fontSize: 13, fontWeight: 700 },
  diaRow: { display: 'flex', alignItems: 'center', gap: 12 },
  diaFecha: { width: 100, fontSize: 12, color: '#6B7280', flexShrink: 0, textTransform: 'capitalize' },
  diaBarWrap: { flex: 1, height: 8, background: '#F3F4F6', borderRadius: 4, overflow: 'hidden' },
  diaBarFill: { height: '100%', background: '#10B981', borderRadius: 4, transition: 'width 0.3s' },
  diaTotal: { width: 80, textAlign: 'right', fontSize: 13, fontWeight: 600 },
  diaCount: { width: 60, textAlign: 'right', fontSize: 11, color: '#9CA3AF' },
}
