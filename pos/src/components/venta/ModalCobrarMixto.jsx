import { CheckCircle, XCircle, Loader2, GitMerge, ArrowLeft, Delete, X } from 'lucide-react'

const FONT  = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
const P = {
  headerBg:   '#1A365D',
  cobrarBg:   '#276749',
  cancelClr:  '#C53030',
  displayBg:  '#EDF2F7',
  textDark:   '#1A202C',
  kbdBorder:  '#E2E8F0',
  kbdDelBg:   '#FFF5F5',
  barTotal:   '#1A202C',
  barEfect:   '#276749',
}
const iconBtn = { background: 'none', border: 'none', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', borderRadius: 4 }
const TECLAS = [['7','8','9'],['4','5','6'],['1','2','3'],['.',  '0','del']]

export default function ModalCobrarMixto({ cobro, total, mensaje, mp }) {
  const { setMetodoPago, pagoCon, setPagoCon, cobrar } = cobro

  const mixtoEfectivo = parseFloat(pagoCon) || 0
  const mixtoTerminal = parseFloat(Math.max(0, total - mixtoEfectivo).toFixed(2))

  const barra = [
    { label: 'TOTAL',    value: `$${total.toFixed(2)}`,          color: P.barTotal },
    { label: 'EFECTIVO', value: `$${mixtoEfectivo.toFixed(2)}`,  color: P.barEfect },
    { label: 'TERMINAL', value: `$${mixtoTerminal.toFixed(2)}`,  color: mp.estado === 'completado' ? '#276749' : '#2B6CB0' },
  ]

  const volver = () => { mp.cancelar(); setMetodoPago('efectivo') }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, backdropFilter: 'blur(4px)', fontFamily: FONT }}>
      <div style={{ background: '#FDFDFD', borderRadius: 14, boxShadow: '0 24px 56px rgba(0,0,0,0.24)', overflow: 'hidden', width: 640 }}>

        <div style={{ background: P.headerBg, padding: '15px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button style={iconBtn} onClick={volver}><ArrowLeft size={16} strokeWidth={2} /></button>
            <GitMerge size={15} strokeWidth={1.8} color="rgba(255,255,255,0.8)" />
            <span style={{ fontWeight: 700, fontSize: 13, color: '#fff', letterSpacing: '0.08em' }}>COBRO MIXTO</span>
          </div>
          <button style={iconBtn} onClick={() => { mp.cancelar(); setMetodoPago(null) }}><X size={16} strokeWidth={2} /></button>
        </div>

        <div style={{ display: 'flex' }}>

          {/* Left: state + actions */}
          <div style={{ flex: 1, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14, minHeight: 300 }}>

            {mp.estado === 'idle' && (
              <>
                {/* Split display */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1, background: '#F0FFF4', border: '1px solid #C6F6D5', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#276749', letterSpacing: '0.12em', marginBottom: 4, textTransform: 'uppercase' }}>Efectivo</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: '#276749', letterSpacing: '-0.5px', fontVariantNumeric: 'tabular-nums' }}>${mixtoEfectivo.toFixed(2)}</div>
                    <div style={{ fontSize: 10, color: '#68D391', marginTop: 3 }}>ingresa con el teclado →</div>
                  </div>
                  <div style={{ flex: 1, background: '#EBF4FF', border: '1px solid #BEE3F8', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#2B6CB0', letterSpacing: '0.12em', marginBottom: 4, textTransform: 'uppercase' }}>Terminal</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: '#2B6CB0', letterSpacing: '-0.5px', fontVariantNumeric: 'tabular-nums' }}>${mixtoTerminal.toFixed(2)}</div>
                    <div style={{ fontSize: 10, color: '#76B9F0', marginTop: 3 }}>cobrar en terminal</div>
                  </div>
                </div>

                {mixtoEfectivo > 0 && mixtoEfectivo < total && (
                  <button
                    style={{ width: '100%', padding: '12px 0', background: '#2B6CB0', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', cursor: 'pointer' }}
                    onClick={() => mp.iniciarPago(mixtoTerminal)}>
                    Cobrar ${mixtoTerminal.toFixed(2)} en terminal
                  </button>
                )}

                {(!pagoCon || mixtoEfectivo <= 0) && (
                  <div style={{ fontSize: 12, color: '#A0AEC0', textAlign: 'center', fontWeight: 500 }}>
                    Ingresa el monto en efectivo con el teclado
                  </div>
                )}
                {mixtoEfectivo >= total && (
                  <div style={{ fontSize: 12, color: P.cancelClr, textAlign: 'center', fontWeight: 600 }}>
                    El efectivo cubre el total — usa solo Efectivo
                  </div>
                )}
              </>
            )}

            {mp.estado === 'procesando' && (
              <div style={{ textAlign: 'center', padding: '24px 0', display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
                <Loader2 size={40} color="#2B6CB0" strokeWidth={1.5} style={{ animation: 'spin 1s linear infinite' }} />
                <div style={{ fontWeight: 700, color: '#1A202C', fontSize: 15 }}>Procesando terminal...</div>
                <div style={{ fontSize: 13, color: '#718096' }}>${mixtoTerminal.toFixed(2)} pendientes</div>
              </div>
            )}

            {mp.estado === 'completado' && (
              <div style={{ textAlign: 'center', padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
                <CheckCircle size={48} color="#276749" strokeWidth={1.5} />
                <div style={{ fontWeight: 700, color: '#276749', fontSize: 16 }}>Terminal: pago aprobado</div>
                <div style={{ fontSize: 13, color: '#718096' }}>
                  Efectivo <strong>${mixtoEfectivo.toFixed(2)}</strong> · Terminal <strong>${mixtoTerminal.toFixed(2)}</strong>
                </div>
                <div style={{ fontSize: 11, color: '#A0AEC0', fontFamily: 'monospace', background: '#EDF2F7', padding: '4px 14px', borderRadius: 6 }}>
                  ID: {mp.paymentId}
                </div>
              </div>
            )}

            {mp.estado === 'error' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
                <XCircle size={40} color={P.cancelClr} strokeWidth={1.5} />
                <div style={{ color: P.cancelClr, fontWeight: 700, fontSize: 14 }}>Error al procesar en terminal</div>
                {mp.errorMsg && <div style={{ fontSize: 12, color: '#718096' }}>{mp.errorMsg}</div>}
                <button style={{ padding: '9px 24px', border: '1.5px solid #CBD5E0', borderRadius: 8, background: '#F8F9FA', fontSize: 13, fontWeight: 600, color: '#2D3748', cursor: 'pointer' }} onClick={mp.cancelar}>
                  Reintentar
                </button>
              </div>
            )}

            {mensaje && <p style={{ color: P.cancelClr, fontSize: 12, margin: 0, fontWeight: 500 }}>{mensaje}</p>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 'auto' }}>
              {mp.estado === 'completado' && (
                <button
                  style={{ width: '100%', padding: '13px 0', background: '#276749', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', cursor: 'pointer' }}
                  onClick={() => cobrar('mixto', { referenciaTarjeta: mp.paymentId })}>
                  FINALIZAR VENTA
                </button>
              )}
              {(mp.estado === 'procesando' || mp.estado === 'completado') ? (
                <div style={{ textAlign: 'center', fontSize: 11, color: '#A0AEC0', padding: '4px 0', fontWeight: 500 }}>
                  {mp.estado === 'procesando' ? 'Espera a que la terminal responda' : 'El cliente ya fue cobrado — finaliza la venta'}
                </div>
              ) : (
                <button
                  style={{ width: '100%', padding: '9px 0', background: 'transparent', border: `1.5px solid ${P.cancelClr}`, color: P.cancelClr, borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  onClick={volver}>
                  ← Cambiar método de pago
                </button>
              )}
            </div>

          </div>

          {/* Right: numpad */}
          <div style={{ width: 196, borderLeft: '1px solid #EDF2F7', padding: '14px 13px', display: 'flex', flexDirection: 'column', gap: 7, background: '#F7F8FC' }}>
            <div style={{ background: P.displayBg, borderRadius: 8, padding: '10px 12px', textAlign: 'right', marginBottom: 1 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#718096', letterSpacing: '0.12em', marginBottom: 3, textTransform: 'uppercase' }}>Efectivo</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: P.textDark, letterSpacing: '-0.5px', fontVariantNumeric: 'tabular-nums' }}>
                ${mixtoEfectivo.toFixed(2)}
              </div>
            </div>
            {TECLAS.map((fila, ri) => (
              <div key={ri} style={{ display: 'flex', gap: 6 }}>
                {fila.map(k => (
                  <button key={k}
                    disabled={mp.estado !== 'idle'}
                    style={{ flex: 1, padding: '12px 0', borderRadius: 7, border: `1px solid ${P.kbdBorder}`, background: k === 'del' ? P.kbdDelBg : '#FFFFFF', cursor: mp.estado === 'idle' ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 600, color: k === 'del' ? P.cancelClr : P.textDark, opacity: mp.estado !== 'idle' ? 0.4 : 1, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
                    onClick={() => {
                      if (mp.estado !== 'idle') return
                      if (k === 'del') { setPagoCon(pagoCon.slice(0, -1)); return }
                      if (k === '.' && pagoCon.includes('.')) return
                      setPagoCon(pagoCon + k)
                    }}>
                    {k === 'del' ? <Delete size={14} strokeWidth={2} color={P.cancelClr} /> : k}
                  </button>
                ))}
              </div>
            ))}
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
