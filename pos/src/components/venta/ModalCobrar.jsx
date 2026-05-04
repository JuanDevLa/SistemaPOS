import { useEffect } from 'react'
import { Banknote, CreditCard, ArrowLeftRight, Handshake, GitMerge, Delete, X } from 'lucide-react'
import ModalCobrarTarjeta       from './ModalCobrarTarjeta'
import ModalCobrarTransferencia from './ModalCobrarTransferencia'
import ModalCobrarCredito       from './ModalCobrarCredito'
import ModalCobrarMixto         from './ModalCobrarMixto'

const FONT   = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
const P      = {
  modalBg:     '#FDFDFD',
  headerBg:    '#1A365D',
  btnBg:       '#F8F9FA',
  btnBgActive: '#E2E8F0',
  btnBorder:   '#E2E8F0',
  btnBdrAct:   '#CBD5E0',
  icon:        '#4A5568',
  iconActive:  '#1A365D',
  textDark:    '#1A202C',
  textMid:     '#2D3748',
  cobrarBg:    '#2B6CB0',
  cancelClr:   '#C53030',
  kbdBg:       '#FFFFFF',
  kbdDelBg:    '#FFF5F5',
  displayBg:   '#EDF2F7',
  barTotal:    '#1A202C',
  barRecib:    '#276749',
  barCambio:   '#A0AEC0',
  barCambioN:  '#C53030',
}

const METODOS = [
  { id: 'efectivo',      label: 'Efectivo',      Icon: Banknote },
  { id: 'tarjeta',       label: 'Tarjeta',        Icon: CreditCard },
  { id: 'transferencia', label: 'Transferencia',  Icon: ArrowLeftRight },
  { id: 'credito',       label: 'Crédito',        Icon: Handshake },
]

const TECLAS = [['7','8','9'],['4','5','6'],['1','2','3'],['.',  '0','del']]

export default function ModalCobrar({ cobro, total, mensaje, negocio_id, mp, clienteAsignado }) {
  const { metodoPago, setMetodoPago, pagoCon, setPagoCon, cambio, cobrar } = cobro

  useEffect(() => {
    if (metodoPago !== 'tarjeta' && metodoPago !== 'mixto') mp.cancelar()
  }, [metodoPago]) // eslint-disable-line

  if (metodoPago === null) return null

  const shared = { cobro, total, mensaje, negocio_id, mp, clienteAsignado }
  if (metodoPago === 'tarjeta')       return <ModalCobrarTarjeta       {...shared} />
  if (metodoPago === 'transferencia') return <ModalCobrarTransferencia {...shared} />
  if (metodoPago === 'credito')       return <ModalCobrarCredito        {...shared} />
  if (metodoPago === 'mixto')         return <ModalCobrarMixto          {...shared} />

  // ── Efectivo ──────────────────────────────────────────────────────────
  const recibido       = parseFloat(pagoCon) || 0
  const cambioMostrar  = pagoCon ? cambio : null
  const cambioPos      = cambioMostrar !== null && cambioMostrar >= 0

  const barra = [
    { label: 'TOTAL',    value: `$${total.toFixed(2)}`,                color: P.barTotal },
    { label: 'RECIBIDO', value: `$${recibido.toFixed(2)}`,             color: P.barRecib },
    { label: 'CAMBIO',   value: `$${(cambioMostrar ?? 0).toFixed(2)}`,
      color: cambioMostrar !== null ? (cambioPos ? P.barCambio : P.barCambioN) : P.barCambio },
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, backdropFilter: 'blur(4px)', fontFamily: FONT }}>
      <div style={{ background: P.modalBg, borderRadius: 14, boxShadow: '0 24px 56px rgba(0,0,0,0.24), 0 4px 16px rgba(0,0,0,0.08)', overflow: 'hidden', width: 640 }}>

        {/* Header */}
        <div style={{ background: P.headerBg, padding: '15px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 13, color: '#fff', letterSpacing: '0.1em' }}>
            COBRAR <kbd style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 5, padding: '2px 7px', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', fontFamily: 'inherit', marginLeft: 4 }}>F12</kbd>
          </span>
          <button style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', borderRadius: 4 }}
            onClick={() => setMetodoPago(null)}>
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        <div style={{ display: 'flex' }}>

          {/* Left: selector + actions */}
          <div style={{ flex: 1, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* 2×2 grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {METODOS.map(({ id, label, Icon }) => {
                const active = metodoPago === id
                return (
                  <button key={id}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '16px 8px', minHeight: 84, background: active ? P.btnBgActive : P.btnBg, border: `1.5px solid ${active ? P.btnBdrAct : P.btnBorder}`, borderRadius: 10, cursor: 'pointer', boxShadow: active ? 'inset 0 1px 3px rgba(0,0,0,0.07)' : '0 1px 2px rgba(0,0,0,0.04)', transition: 'background 0.12s, border-color 0.12s' }}
                    onClick={() => setMetodoPago(id)}>
                    <Icon size={22} strokeWidth={1.6} color={active ? P.iconActive : P.icon} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: active ? P.iconActive : P.textMid, letterSpacing: '0.01em' }}>{label}</span>
                  </button>
                )
              })}
            </div>

            {/* Mixto — full width */}
            <button
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: '11px 0', width: '100%', background: P.btnBg, border: `1.5px solid ${P.btnBorder}`, borderRadius: 10, cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
              onClick={() => setMetodoPago('mixto')}>
              <GitMerge size={17} strokeWidth={1.6} color={P.icon} />
              <span style={{ fontSize: 12, fontWeight: 600, color: P.textMid }}>Mixto</span>
            </button>

            {mensaje && <p style={{ color: P.cancelClr, fontSize: 12, margin: 0, fontWeight: 500 }}>{mensaje}</p>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 'auto' }}>
              <button
                style={{ width: '100%', padding: '13px 0', background: P.cobrarBg, color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', cursor: 'pointer' }}
                onClick={() => cobrar()}>
                COBRAR
              </button>
              <button
                style={{ width: '100%', padding: '9px 0', background: 'transparent', border: `1.5px solid ${P.cancelClr}`, color: P.cancelClr, borderRadius: 9, fontSize: 12, fontWeight: 600, cursor: 'pointer', letterSpacing: '0.02em' }}
                onClick={() => setMetodoPago(null)}>
                <kbd style={{ background: 'rgba(197,48,48,0.12)', border: '1px solid rgba(197,48,48,0.35)', borderRadius: 5, padding: '2px 7px', fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', fontFamily: 'inherit', marginRight: 6, color: '#C53030' }}>ESC</kbd>Cancelar
              </button>
            </div>
          </div>

          {/* Right: keypad */}
          <div style={{ width: 196, borderLeft: '1px solid #EDF2F7', padding: '14px 13px', display: 'flex', flexDirection: 'column', gap: 7, background: '#F7F8FC' }}>

            {/* Display */}
            <div style={{ background: P.displayBg, borderRadius: 8, padding: '10px 12px', textAlign: 'right', marginBottom: 1 }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#718096', letterSpacing: '0.12em', marginBottom: 3, textTransform: 'uppercase' }}>Recibido</div>
              <div style={{ fontSize: 26, fontWeight: 700, color: P.textDark, letterSpacing: '-0.5px', fontVariantNumeric: 'tabular-nums' }}>
                ${(parseFloat(pagoCon) || 0).toFixed(2)}
              </div>
            </div>

            {/* Numpad */}
            {TECLAS.map((fila, ri) => (
              <div key={ri} style={{ display: 'flex', gap: 6 }}>
                {fila.map(k => (
                  <button key={k}
                    style={{ flex: 1, padding: '12px 0', borderRadius: 7, border: `1px solid #E2E8F0`, background: k === 'del' ? P.kbdDelBg : P.kbdBg, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 600, color: k === 'del' ? P.cancelClr : P.textDark, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
                    onClick={() => {
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

        {/* Bottom summary */}
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
