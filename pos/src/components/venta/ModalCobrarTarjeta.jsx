import { CheckCircle, XCircle, Loader2, ArrowLeft, CreditCard, X } from 'lucide-react'

const FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
const P = {
  headerBg:   '#1A365D',
  cobrarBg:   '#276749',
  cancelClr:  '#C53030',
  displayBg:  '#EDF2F7',
  textDark:   '#1A202C',
  barTotal:   '#1A202C',
  barCard:    '#2B6CB0',
  barCambio:  '#A0AEC0',
}

const iconBtn = { background: 'none', border: 'none', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', borderRadius: 4 }

export default function ModalCobrarTarjeta({ cobro, total, mensaje, mp }) {
  const { setMetodoPago, cobrar } = cobro

  const barra = [
    { label: 'TOTAL',   value: `$${total.toFixed(2)}`, color: P.barTotal },
    { label: 'TARJETA', value: `$${total.toFixed(2)}`, color: P.barCard  },
    { label: 'CAMBIO',  value: '$0.00',                color: P.barCambio },
  ]

  const volver = () => { mp.cancelar(); setMetodoPago('efectivo') }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, backdropFilter: 'blur(4px)', fontFamily: FONT }}>
      <div style={{ background: '#FDFDFD', borderRadius: 14, boxShadow: '0 24px 56px rgba(0,0,0,0.24)', overflow: 'hidden', width: 500 }}>

        <div style={{ background: P.headerBg, padding: '15px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button style={iconBtn} onClick={volver}><ArrowLeft size={16} strokeWidth={2} /></button>
            <CreditCard size={15} strokeWidth={1.8} color="rgba(255,255,255,0.8)" />
            <span style={{ fontWeight: 700, fontSize: 13, color: '#fff', letterSpacing: '0.08em' }}>COBRO CON TARJETA</span>
          </div>
          <button style={iconBtn} onClick={() => { mp.cancelar(); setMetodoPago(null) }}><X size={16} strokeWidth={2} /></button>
        </div>

        <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 18, minHeight: 280 }}>

          {mp.MODO_PRUEBA && (
            <div style={{ fontSize: 10, background: '#FFFBEB', color: '#92400E', padding: '5px 10px', borderRadius: 6, fontWeight: 700, textAlign: 'center', letterSpacing: '0.06em', border: '1px solid #FDE68A' }}>
              MODO PRUEBA — simula terminal física
            </div>
          )}

          {mp.estado === 'idle' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center', paddingTop: 4 }}>
              <div style={{ textAlign: 'center', lineHeight: 1.6 }}>
                <div style={{ fontSize: 12, color: '#718096', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>Total a cobrar</div>
                <div style={{ fontSize: 40, fontWeight: 700, color: '#1A202C', letterSpacing: '-1px', fontVariantNumeric: 'tabular-nums' }}>${total.toFixed(2)}</div>
              </div>
              <div style={{ fontSize: 13, color: '#718096', textAlign: 'center' }}>Presenta la tarjeta en la terminal física</div>
              <button
                style={{ width: '100%', padding: '13px 0', background: '#2B6CB0', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer' }}
                onClick={() => mp.iniciarPago(total)}>
                Cobrar con terminal
              </button>
            </div>
          )}

          {mp.estado === 'procesando' && (
            <div style={{ textAlign: 'center', padding: '20px 0', display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
              <Loader2 size={40} color="#2B6CB0" strokeWidth={1.5} style={{ animation: 'spin 1s linear infinite' }} />
              <div style={{ fontWeight: 700, color: '#1A202C', fontSize: 15 }}>Procesando pago...</div>
              <div style={{ fontSize: 13, color: '#718096' }}>Completa el cobro en la terminal física</div>
              <div style={{ fontSize: 11, color: '#A0AEC0', marginTop: 2 }}>Espera a que la terminal responda antes de cancelar</div>
            </div>
          )}

          {mp.estado === 'completado' && (
            <div style={{ textAlign: 'center', padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
              <CheckCircle size={52} color={P.cobrarBg} strokeWidth={1.5} />
              <div style={{ fontWeight: 700, color: P.cobrarBg, fontSize: 17 }}>¡Pago aprobado!</div>
              <div style={{ fontSize: 11, color: '#A0AEC0', fontFamily: 'monospace', background: '#EDF2F7', padding: '4px 14px', borderRadius: 6 }}>
                ID: {mp.paymentId}
              </div>
            </div>
          )}

          {mp.estado === 'error' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', paddingTop: 4 }}>
              <XCircle size={44} color={P.cancelClr} strokeWidth={1.5} />
              <div style={{ color: P.cancelClr, fontWeight: 700, fontSize: 15 }}>Pago declinado</div>
              {mp.errorMsg && <div style={{ fontSize: 13, color: '#718096', textAlign: 'center' }}>{mp.errorMsg}</div>}
              <button style={{ padding: '9px 24px', border: `1.5px solid #CBD5E0`, borderRadius: 8, background: '#F8F9FA', fontSize: 13, fontWeight: 600, color: '#2D3748', cursor: 'pointer' }} onClick={mp.cancelar}>
                Reintentar
              </button>
            </div>
          )}

          {mensaje && <p style={{ color: P.cancelClr, fontSize: 12, margin: 0, textAlign: 'center', fontWeight: 500 }}>{mensaje}</p>}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 'auto' }}>
            {mp.estado === 'completado' && (
              <button
                style={{ width: '100%', padding: '13px 0', background: P.cobrarBg, color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', cursor: 'pointer' }}
                onClick={() => cobrar('tarjeta', { referenciaTarjeta: mp.paymentId })}>
                FINALIZAR VENTA
              </button>
            )}
            {(mp.estado === 'idle' || mp.estado === 'error') && (
              <button
                style={{ width: '100%', padding: '9px 0', background: 'transparent', border: `1.5px solid ${P.cancelClr}`, color: P.cancelClr, borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                onClick={volver}>
                ← Cambiar método de pago
              </button>
            )}
          </div>

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
