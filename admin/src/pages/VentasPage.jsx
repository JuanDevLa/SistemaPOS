import { useState, useEffect } from 'react'
import { api } from '../api'
import { exportarVentas } from '../utils/exportarExcel'

const NEGOCIOS = [
  { id: 1, nombre: 'Farmacia Noriega' },
  { id: 2, nombre: 'Crucero Independencia' },
]

const hoy = () => new Date().toISOString().split('T')[0]

export default function VentasPage() {
  const [negocioId, setNegocioId] = useState(1)
  const [ventas, setVentas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [fechaInicio, setFechaInicio] = useState(hoy())
  const [fechaFin, setFechaFin] = useState(hoy())
  const [detalle, setDetalle] = useState(null)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)

  useEffect(() => { cargar() }, [negocioId, fechaInicio, fechaFin])

  const cargar = async () => {
    setCargando(true)
    const params = new URLSearchParams({
      negocio_id: negocioId,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin + 'T23:59:59',
    })
    const res = await api.listarVentas(params.toString())
    setVentas(Array.isArray(res) ? res : [])
    setCargando(false)
  }

  const verDetalle = async (id) => {
    setCargandoDetalle(true)
    setDetalle({ cargando: true })
    const res = await api.obtenerVenta(id)
    setDetalle(res)
    setCargandoDetalle(false)
  }

  const totalDia = ventas.reduce((s, v) => s + parseFloat(v.total), 0)
  const porMetodo = ventas.reduce((acc, v) => {
    const total = parseFloat(v.total)
    acc[v.metodo_pago] = acc[v.metodo_pago] || { total: 0, efectivo: 0, tarjeta: 0 }
    acc[v.metodo_pago].total += total
    if (v.metodo_pago === 'mixto') {
      acc[v.metodo_pago].tarjeta  += parseFloat(v.monto_tarjeta || 0)
      acc[v.metodo_pago].efectivo += total - parseFloat(v.monto_tarjeta || 0)
    }
    return acc
  }, {})

  return (
    <div>
      {/* HEADER */}
      <div style={s.pageHeader}>
        <div>
          <h2 style={s.pageTitle}>Ventas</h2>
          <p style={s.pageSub}>{ventas.length} ventas · Total: ${totalDia.toFixed(2)}</p>
        </div>
        <button
          style={{ ...s.btnExcel, opacity: ventas.length === 0 ? 0.5 : 1 }}
          disabled={ventas.length === 0}
          onClick={() => exportarVentas(ventas, negocioId, fechaInicio, fechaFin)}
        >
          Exportar Excel
        </button>
      </div>

      {/* CONTROLES */}
      <div style={s.controls}>
        <div style={s.negocioTabs}>
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
        <div style={s.fechas}>
          <label style={s.fechaLabel}>Del</label>
          <input style={s.fechaInput} type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
          <label style={s.fechaLabel}>Al</label>
          <input style={s.fechaInput} type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} />
          <button style={s.btnBuscar} onClick={cargar}>Buscar</button>
        </div>
      </div>

      {/* RESUMEN POR MÉTODO */}
      {ventas.length > 0 && (
        <div style={s.resumenRow}>
          {Object.entries(porMetodo).map(([metodo, datos]) => (
            <div key={metodo} style={s.resumenCard}>
              <span style={s.resumenMetodo}>{metodo}</span>
              <span style={s.resumenTotal}>${datos.total.toFixed(2)}</span>
              {metodo === 'mixto' && (
                <div style={s.mixtoBreakdown}>
                  <span>Efectivo ${datos.efectivo.toFixed(2)}</span>
                  <span>Tarjeta ${datos.tarjeta.toFixed(2)}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* TABLA */}
      {cargando ? (
        <p style={{ color: '#6B7280', padding: 20 }}>Cargando...</p>
      ) : ventas.length === 0 ? (
        <div style={s.empty}>Sin ventas en el período seleccionado.</div>
      ) : (
        <div className="tbl-wrap">
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>#</th>
                <th style={s.th}>Fecha</th>
                <th style={s.th}>Hora</th>
                <th style={s.th}>Cajero</th>
                <th style={s.th}>Método</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Total</th>
                <th style={s.th}></th>
              </tr>
            </thead>
            <tbody>
              {ventas.map(v => (
                <tr key={v.id} style={s.tr}>
                  <td style={{ ...s.td, color: '#6B7280', fontFamily: 'monospace' }}>#{v.id}</td>
                  <td style={s.td}>{new Date(v.fecha).toLocaleDateString('es-MX')}</td>
                  <td style={{ ...s.td, color: '#6B7280' }}>
                    {new Date(v.fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td style={s.td}>{v.cajero}</td>
                  <td style={s.td}>
                    <span style={{ ...s.metodoBadge, ...metodoBadgeColor(v.metodo_pago) }}>
                      {v.metodo_pago}
                    </span>
                  </td>
                  <td style={{ ...s.td, textAlign: 'right', fontWeight: 700 }}>
                    ${parseFloat(v.total).toFixed(2)}
                  </td>
                  <td style={{ ...s.td, textAlign: 'right' }}>
                    <button style={s.btnVer} onClick={() => verDetalle(v.id)}>Ver</button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#F9FAFB', fontWeight: 700 }}>
                <td colSpan={5} style={{ ...s.td, color: '#6B7280' }}>Total ({ventas.length} ventas)</td>
                <td style={{ ...s.td, textAlign: 'right', fontSize: 16, color: '#1E3A5F' }}>
                  ${totalDia.toFixed(2)}
                </td>
                <td style={s.td}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* MODAL DETALLE */}
      {detalle && (
        <div style={s.overlay}>
          <div style={s.modalCard}>
            {detalle.cargando ? (
              <p style={{ textAlign: 'center', padding: 40, color: '#6B7280' }}>Cargando...</p>
            ) : (
              <>
                <div style={s.modalHeader}>
                  <div>
                    <h3 style={s.modalTitle}>Venta #{detalle.id}</h3>
                    <p style={s.modalSub}>
                      {new Date(detalle.fecha).toLocaleString('es-MX')} · {detalle.cajero}
                    </p>
                  </div>
                  <button style={s.btnCerrar} onClick={() => setDetalle(null)}>✕</button>
                </div>

                <div style={s.detalleItems}>
                  <table style={s.table}>
                    <thead>
                      <tr>
                        <th style={s.th}>Producto</th>
                        <th style={{ ...s.th, textAlign: 'right' }}>Cant.</th>
                        <th style={{ ...s.th, textAlign: 'right' }}>Precio</th>
                        <th style={{ ...s.th, textAlign: 'right' }}>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(detalle.items || []).map((item, i) => (
                        <tr key={i} style={s.tr}>
                          <td style={s.td}>{item.nombre}</td>
                          <td style={{ ...s.td, textAlign: 'right' }}>{item.cantidad}</td>
                          <td style={{ ...s.td, textAlign: 'right' }}>${parseFloat(item.precio_unitario).toFixed(2)}</td>
                          <td style={{ ...s.td, textAlign: 'right', fontWeight: 600 }}>${parseFloat(item.subtotal).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={s.detalleFooter}>
                  {parseFloat(detalle.descuento) > 0 && (
                    <div style={s.detalleRow}>
                      <span style={{ color: '#6B7280' }}>Descuento</span>
                      <span style={{ color: '#DC2626' }}>-${parseFloat(detalle.descuento).toFixed(2)}</span>
                    </div>
                  )}
                  <div style={s.detalleRow}>
                    <span style={{ color: '#6B7280' }}>Método de pago</span>
                    <span style={{ ...s.metodoBadge, ...metodoBadgeColor(detalle.metodo_pago) }}>
                      {detalle.metodo_pago}
                    </span>
                  </div>
                  {detalle.metodo_pago === 'efectivo' && detalle.efectivo_recibido && (
                    <>
                      <div style={s.detalleRow}>
                        <span style={{ color: '#6B7280' }}>Recibido</span>
                        <span>${parseFloat(detalle.efectivo_recibido).toFixed(2)}</span>
                      </div>
                      <div style={s.detalleRow}>
                        <span style={{ color: '#6B7280' }}>Cambio</span>
                        <span>${parseFloat(detalle.cambio).toFixed(2)}</span>
                      </div>
                    </>
                  )}
                  {detalle.metodo_pago === 'mixto' && (
                    <div style={s.mixtoDesglose}>
                      <div style={s.mixtoTitulo}>Desglose del pago mixto</div>
                      <div style={s.detalleRow}>
                        <span style={{ color: '#6B7280' }}>Efectivo</span>
                        <span style={{ color: '#065F46', fontWeight: 600 }}>
                          ${(parseFloat(detalle.efectivo_recibido || 0) - parseFloat(detalle.cambio || 0)).toFixed(2)}
                        </span>
                      </div>
                      <div style={s.detalleRow}>
                        <span style={{ color: '#6B7280' }}>Tarjeta</span>
                        <span style={{ color: '#1E40AF', fontWeight: 600 }}>
                          ${parseFloat(detalle.monto_tarjeta || 0).toFixed(2)}
                        </span>
                      </div>
                      {parseFloat(detalle.cambio || 0) > 0 && (
                        <div style={s.detalleRow}>
                          <span style={{ color: '#6B7280' }}>Cambio</span>
                          <span>${parseFloat(detalle.cambio).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  )}
                  <div style={{ ...s.detalleRow, fontWeight: 700, fontSize: 16, borderTop: '2px solid #E5E7EB', paddingTop: 10, marginTop: 4 }}>
                    <span>Total</span>
                    <span style={{ color: '#1E3A5F' }}>${parseFloat(detalle.total).toFixed(2)}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function metodoBadgeColor(metodo) {
  const map = {
    efectivo:      { background: '#D1FAE5', color: '#065F46' },
    tarjeta:       { background: '#DBEAFE', color: '#1E40AF' },
    transferencia: { background: '#EDE9FE', color: '#5B21B6' },
    credito:       { background: '#FEF3C7', color: '#92400E' },
    vale:          { background: '#F3F4F6', color: '#374151' },
  }
  return map[metodo] || { background: '#F3F4F6', color: '#374151' }
}

const s = {
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  pageTitle: { fontSize: 22, fontWeight: 700 },
  pageSub: { color: '#6B7280', fontSize: 13, marginTop: 2 },
  btnExcel: { padding: '8px 16px', background: '#10B981', color: '#FFF', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  controls: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' },
  negocioTabs: { display: 'flex', gap: 4 },
  tabBtn: { padding: '7px 16px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 13, background: '#FFF', color: '#374151' },
  tabBtnActive: { background: '#1E3A5F', color: '#FFF', borderColor: '#1E3A5F' },
  fechas: { display: 'flex', alignItems: 'center', gap: 8 },
  fechaLabel: { fontSize: 13, color: '#6B7280' },
  fechaInput: { padding: '7px 10px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 13 },
  btnBuscar: { padding: '7px 16px', background: '#1E3A5F', color: '#FFF', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600 },
  resumenRow: { display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' },
  resumenCard: { background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 6, padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 2 },
  resumenMetodo: { fontSize: 11, color: '#6B7280', textTransform: 'capitalize', fontWeight: 600 },
  resumenTotal: { fontSize: 18, fontWeight: 700, color: '#111827' },
  empty: { padding: 40, textAlign: 'center', color: '#9CA3AF', background: '#FFF', borderRadius: 8, border: '1px solid #E5E7EB' },
  tableWrap: { background: '#FFF', borderRadius: 8, border: '1px solid #E5E7EB', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 14px', background: '#F9FAFB', fontSize: 12, fontWeight: 600, color: '#6B7280', textAlign: 'left', borderBottom: '1px solid #E5E7EB' },
  tr: { borderBottom: '1px solid #F3F4F6' },
  td: { padding: '10px 14px', fontSize: 13, verticalAlign: 'middle' },
  metodoBadge: { display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 500 },
  btnVer: { padding: '4px 10px', background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', borderRadius: 4, fontSize: 12 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modalCard: { background: '#FFF', borderRadius: 10, padding: 28, width: 520, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', maxHeight: '85vh', display: 'flex', flexDirection: 'column' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 700 },
  modalSub: { color: '#6B7280', fontSize: 13, marginTop: 2 },
  btnCerrar: { background: 'none', border: 'none', fontSize: 18, color: '#9CA3AF', cursor: 'pointer', padding: 4 },
  detalleItems: { flex: 1, overflow: 'auto', marginBottom: 16, border: '1px solid #E5E7EB', borderRadius: 6 },
  detalleFooter: { display: 'flex', flexDirection: 'column', gap: 8 },
  detalleRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14 },
  mixtoDesglose: { background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 6, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 },
  mixtoTitulo: { fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  mixtoBreakdown: { display: 'flex', flexDirection: 'column', gap: 2, marginTop: 4, fontSize: 11, color: '#6B7280' },
}
