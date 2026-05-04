import { useEffect } from 'react'
import { Handshake, ArrowLeft, X } from 'lucide-react'
import { api } from '../../api'

const FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
const P = {
  headerBg:  '#1A365D',
  cobrarBg:  '#2B6CB0',
  cancelClr: '#C53030',
  barTotal:  '#1A202C',
  barRecib:  '#276749',
}
const iconBtn = { background: 'none', border: 'none', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', borderRadius: 4 }
const lbl     = { fontSize: 11, fontWeight: 600, color: '#4A5568', display: 'block', marginBottom: 5, letterSpacing: '0.04em', textTransform: 'uppercase' }

export default function ModalCobrarCredito({ cobro, total, mensaje, negocio_id, clienteAsignado }) {
  const {
    setMetodoPago,
    clienteCredito, setClienteCredito,
    busquedaCredito, setBusquedaCredito,
    resultadosCredito, setResultadosCredito,
    montoPagadoFiado, setMontoPagadoFiado,
    nombreClienteFiado, setNombreClienteFiado,
    cobrar,
  } = cobro

  useEffect(() => {
    if (clienteAsignado && !clienteCredito) setClienteCredito(clienteAsignado)
  }, []) // eslint-disable-line

  const pagado    = parseFloat(montoPagadoFiado || 0)
  const restante  = Math.max(0, total - pagado)
  const deudaPrev = clienteCredito ? parseFloat(clienteCredito.saldo_actual || 0) : 0
  const fechaDeuda = clienteCredito?.fecha_deuda_mas_antigua
    ? new Date(clienteCredito.fecha_deuda_mas_antigua).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null

  const barra = [
    { label: 'TOTAL',    value: `$${total.toFixed(2)}`,   color: P.barTotal },
    { label: 'RECIBIDO', value: `$${pagado.toFixed(2)}`,  color: P.barRecib },
    { label: 'RESTANTE', value: `$${restante.toFixed(2)}`,color: restante > 0 ? '#B7791F' : '#276749',
      sub: restante > 0 ? 'próxima visita' : '' },
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, backdropFilter: 'blur(4px)', fontFamily: FONT }}>
      <div style={{ background: '#FDFDFD', borderRadius: 14, boxShadow: '0 24px 56px rgba(0,0,0,0.24)', overflow: 'hidden', width: 540 }}>

        <div style={{ background: P.headerBg, padding: '15px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button style={iconBtn} onClick={() => setMetodoPago('efectivo')}><ArrowLeft size={16} strokeWidth={2} /></button>
            <Handshake size={15} strokeWidth={1.8} color="rgba(255,255,255,0.8)" />
            <span style={{ fontWeight: 700, fontSize: 13, color: '#fff', letterSpacing: '0.08em' }}>COBRO A CRÉDITO</span>
          </div>
          <button style={iconBtn} onClick={() => setMetodoPago(null)}><X size={16} strokeWidth={2} /></button>
        </div>

        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 16, minHeight: 320 }}>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#718096', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>Total de la venta</div>
            <div style={{ fontSize: 38, fontWeight: 700, color: '#1A202C', letterSpacing: '-1px', fontVariantNumeric: 'tabular-nums' }}>${total.toFixed(2)}</div>
          </div>

          {/* Client picker */}
          <div>
            <label style={lbl}>Cliente</label>
            {clienteCredito ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', background: '#276749', borderRadius: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                    {clienteCredito.nombre.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, fontWeight: 600, fontSize: 13, color: '#fff' }}>{clienteCredito.nombre}</div>
                  <button style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', display: 'flex' }} onClick={() => setClienteCredito(null)}>
                    <X size={15} />
                  </button>
                </div>
                {deudaPrev > 0 && (
                  <div style={{ background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: 6, padding: '6px 12px', marginTop: 6, fontSize: 12, color: P.cancelClr, fontWeight: 600 }}>
                    Deuda previa: ${deudaPrev.toFixed(2)}{fechaDeuda ? ` desde ${fechaDeuda}` : ''}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ position: 'relative' }}>
                  <input className="pos-input" type="text" value={busquedaCredito} autoFocus
                    placeholder="Buscar por nombre o teléfono..."
                    style={{ width: '100%', fontFamily: FONT }}
                    onChange={async e => {
                      setBusquedaCredito(e.target.value)
                      if (e.target.value.length > 0) {
                        try {
                          const r = await api.buscarClientes(e.target.value, negocio_id)
                          setResultadosCredito(Array.isArray(r) ? r : [])
                        } catch { setResultadosCredito([]) }
                      } else { setResultadosCredito([]) }
                    }} />
                  {resultadosCredito.length > 0 && (
                    <div style={{ position: 'absolute', left: 0, right: 0, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, zIndex: 10, maxHeight: 140, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
                      {resultadosCredito.map(c => (
                        <div key={c.id}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', cursor: 'pointer', borderBottom: '1px solid #F7FAFC' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#EBF8FF'}
                          onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                          onClick={() => { setClienteCredito(c); setBusquedaCredito(''); setResultadosCredito([]) }}>
                          <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#276749', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
                            {c.nombre.slice(0, 2).toUpperCase()}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 13, color: '#1A202C' }}>{c.nombre} {c.apellidos || ''}</div>
                            <div style={{ fontSize: 11, color: '#718096' }}>{c.telefono || ''}</div>
                          </div>
                          <div style={{ fontSize: 12, color: P.cancelClr, fontWeight: 700 }}>${parseFloat(c.saldo_actual || 0).toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <input className="pos-input" type="text" value={nombreClienteFiado}
                  onChange={e => setNombreClienteFiado(e.target.value)}
                  style={{ width: '100%', fontSize: 13, fontFamily: FONT }}
                  placeholder="O escribe el nombre del cliente..." />
              </div>
            )}
          </div>

          {/* Amount */}
          <div>
            <label style={lbl}>Monto recibido hoy</label>
            <input className="pos-input" type="number" step="0.01" min="0" max={total}
              value={montoPagadoFiado}
              onChange={e => setMontoPagadoFiado(e.target.value)}
              style={{ width: '100%', fontSize: 20, fontWeight: 700, textAlign: 'right', fontFamily: FONT, fontVariantNumeric: 'tabular-nums' }}
              placeholder="0.00" />
            {montoPagadoFiado && parseFloat(montoPagadoFiado) < total && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 13 }}>
                <span style={{ color: '#718096', fontWeight: 500 }}>Queda a deber:</span>
                <span style={{ fontWeight: 700, color: '#B7791F' }}>${(total - parseFloat(montoPagadoFiado)).toFixed(2)}</span>
              </div>
            )}
          </div>

          {mensaje && <p style={{ color: P.cancelClr, fontSize: 12, margin: 0, fontWeight: 500 }}>{mensaje}</p>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 'auto' }}>
            <button
              style={{ width: '100%', padding: '13px 0', background: P.cobrarBg, color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', cursor: 'pointer' }}
              onClick={() => cobrar()}>
              COBRAR
            </button>
            <button
              style={{ width: '100%', padding: '9px 0', background: 'transparent', border: `1.5px solid ${P.cancelClr}`, color: P.cancelClr, borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              onClick={() => setMetodoPago('efectivo')}>
              ← Cambiar método de pago
            </button>
          </div>

        </div>

        <div style={{ display: 'flex' }}>
          {barra.map(({ label, value, color, sub }) => (
            <div key={label} style={{ flex: 1, padding: '14px 8px 13px', textAlign: 'center', background: color }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.16em', marginBottom: 4, textTransform: 'uppercase' }}>{label}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: '-0.5px', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
              {sub && <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', fontWeight: 600, letterSpacing: '0.1em', marginTop: 3, textTransform: 'uppercase' }}>{sub}</div>}
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
