import { useEffect } from 'react'
import { CheckCircle, XCircle, Loader2, CreditCard, X } from 'lucide-react'

const FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
const P = {
  headerBg:  '#1A365D',
  cobrarBg:  '#276749',
  cancelClr: '#C53030',
  textDark:  '#1A202C',
  barTotal:  '#1A202C',
  barCard:   '#2B6CB0',
  barCambio: '#A0AEC0',
}

const iconBtn = { background: 'none', border: 'none', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', borderRadius: 4 }

export default function ModalCobrarTarjeta({ cobro, total, mensaje, negocio_id, mp }) {
  const { setMetodoPago, cobrar } = cobro

  // Dispara el pago automáticamente al abrir el modal
  useEffect(() => {
    const ref = `PDV-${negocio_id}-${Date.now()}`
    mp.iniciarPago(total, ref)
  }, []) // eslint-disable-line

  const volver = () => { mp.cancelar(); setMetodoPago('efectivo') }
  const cerrar = () => { mp.cancelar(); setMetodoPago(null) }

  const barra = [
    { label: 'TOTAL',   value: `$${total.toFixed(2)}`, color: P.barTotal },
    { label: 'TARJETA', value: `$${total.toFixed(2)}`, color: P.barCard  },
    { label: 'CAMBIO',  value: '$0.00',                color: P.barCambio },
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, backdropFilter: 'blur(4px)', fontFamily: FONT }}>
      <div style={{ background: '#FDFDFD', borderRadius: 14, boxShadow: '0 24px 56px rgba(0,0,0,0.24)', overflow: 'hidden', width: 500 }}>

        <div style={{ background: P.headerBg, padding: '15px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <CreditCard size={15} strokeWidth={1.8} color="rgba(255,255,255,0.8)" />
            <span style={{ fontWeight: 700, fontSize: 13, color: '#fff', letterSpacing: '0.08em' }}>COBRO CON TARJETA</span>
          </div>
          {mp.MODO_PRUEBA && (
            <span style={{ fontSize: 9, background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '3px 8px', borderRadius: 5, fontWeight: 700, letterSpacing: '0.06em' }}>MODO PRUEBA</span>
          )}
          {(mp.estado === 'idle' || mp.estado === 'error') && (
            <button style={iconBtn} onClick={cerrar}><X size={16} strokeWidth={2} /></button>
          )}
        </div>

        <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: 20, minHeight: 260, alignItems: 'center', justifyContent: 'center' }}>

          {/* Conectando / enviando intent */}
          {mp.estado === 'idle' && (
            <>
              <Loader2 size={36} color="#2B6CB0" strokeWidth={1.5} style={{ animation: 'spin 1s linear infinite' }} />
              <div style={{ fontWeight: 600, color: P.textDark, fontSize: 14 }}>Conectando con terminal...</div>
            </>
          )}

          {/* Esperando pago */}
          {mp.estado === 'procesando' && (
            <>
              <Loader2 size={40} color="#2B6CB0" strokeWidth={1.5} style={{ animation: 'spin 1s linear infinite' }} />
              <div style={{ fontWeight: 700, color: P.textDark, fontSize: 15 }}>Procesando pago...</div>
              <div style={{ fontSize: 13, color: '#718096', textAlign: 'center' }}>Espera a que el cliente complete el cobro en la terminal</div>
              <button
                style={{ marginTop: 8, padding: '9px 28px', border: `1.5px solid ${P.cancelClr}`, borderRadius: 8, background: 'transparent', fontSize: 12, fontWeight: 600, color: P.cancelClr, cursor: 'pointer' }}
                onClick={volver}>
                Cancelar
              </button>
            </>
          )}

          {/* Aprobado */}
          {mp.estado === 'completado' && (
            <>
              <CheckCircle size={52} color={P.cobrarBg} strokeWidth={1.5} />
              <div style={{ fontWeight: 700, color: P.cobrarBg, fontSize: 17 }}>¡Pago aprobado!</div>
              <div style={{ fontSize: 11, color: '#A0AEC0', fontFamily: 'monospace', background: '#EDF2F7', padding: '4px 14px', borderRadius: 6 }}>
                ID: {mp.paymentId}
              </div>
              <button
                style={{ width: '100%', padding: '13px 0', background: P.cobrarBg, color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', cursor: 'pointer' }}
                onClick={() => cobrar('tarjeta', { referenciaTarjeta: mp.paymentId })}>
                FINALIZAR VENTA
              </button>
            </>
          )}

          {/* Error / declinado */}
          {mp.estado === 'error' && (
            <>
              <XCircle size={44} color={P.cancelClr} strokeWidth={1.5} />
              <div style={{ color: P.cancelClr, fontWeight: 700, fontSize: 15 }}>Pago declinado</div>
              {mp.errorMsg && <div style={{ fontSize: 13, color: '#718096', textAlign: 'center' }}>{mp.errorMsg}</div>}
              <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                <button
                  style={{ flex: 1, padding: '10px 0', border: `1.5px solid #CBD5E0`, borderRadius: 8, background: '#F8F9FA', fontSize: 13, fontWeight: 600, color: '#2D3748', cursor: 'pointer' }}
                  onClick={() => { mp.cancelar(); setTimeout(() => mp.iniciarPago(total, `PDV-${negocio_id}-${Date.now()}`), 50) }}>
                  Reintentar
                </button>
                <button
                  style={{ flex: 1, padding: '10px 0', border: `1.5px solid ${P.cancelClr}`, borderRadius: 8, background: 'transparent', fontSize: 12, fontWeight: 600, color: P.cancelClr, cursor: 'pointer' }}
                  onClick={volver}>
                  Cambiar método
                </button>
              </div>
            </>
          )}

          {mensaje && <p style={{ color: P.cancelClr, fontSize: 12, margin: 0, textAlign: 'center', fontWeight: 500 }}>{mensaje}</p>}
        </div>

        <div style={{ display: 'flex' }}>
          {barra.map(({ label, value, color }) => (
            <div key={label} style={{ flex: 1, padding: '14px 8px 13px', textAlign: 'center', background: color }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.16em', marginBottom: 4, textTransform: 'uppercase' }}>{label}</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: '-0.5px', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
