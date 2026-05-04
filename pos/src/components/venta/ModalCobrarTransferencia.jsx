import { ArrowLeftRight, ArrowLeft, X } from 'lucide-react'

const FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
const P = {
  headerBg:  '#1A365D',
  cobrarBg:  '#2B6CB0',
  cancelClr: '#C53030',
  barTotal:  '#1A202C',
  barRecib:  '#276749',
  barCambio: '#A0AEC0',
}
const iconBtn = { background: 'none', border: 'none', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', borderRadius: 4 }
const lbl     = { fontSize: 11, fontWeight: 600, color: '#4A5568', display: 'block', marginBottom: 5, letterSpacing: '0.04em', textTransform: 'uppercase' }

export default function ModalCobrarTransferencia({ cobro, total, mensaje }) {
  const { setMetodoPago, referenciaTransferencia, setReferenciaTransferencia, nombreTransferencia, setNombreTransferencia, cobrar } = cobro

  const barra = [
    { label: 'TOTAL',    value: `$${total.toFixed(2)}`, color: P.barTotal  },
    { label: 'RECIBIDO', value: `$${total.toFixed(2)}`, color: P.barRecib  },
    { label: 'CAMBIO',   value: '$0.00',                color: P.barCambio },
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, backdropFilter: 'blur(4px)', fontFamily: FONT }}>
      <div style={{ background: '#FDFDFD', borderRadius: 14, boxShadow: '0 24px 56px rgba(0,0,0,0.24)', overflow: 'hidden', width: 500 }}>

        <div style={{ background: P.headerBg, padding: '15px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button style={iconBtn} onClick={() => setMetodoPago('efectivo')}><ArrowLeft size={16} strokeWidth={2} /></button>
            <ArrowLeftRight size={15} strokeWidth={1.8} color="rgba(255,255,255,0.8)" />
            <span style={{ fontWeight: 700, fontSize: 13, color: '#fff', letterSpacing: '0.08em' }}>COBRO POR TRANSFERENCIA</span>
          </div>
          <button style={iconBtn} onClick={() => setMetodoPago(null)}><X size={16} strokeWidth={2} /></button>
        </div>

        <div style={{ padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 20, minHeight: 280 }}>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#718096', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>Total a cobrar</div>
            <div style={{ fontSize: 40, fontWeight: 700, color: '#1A202C', letterSpacing: '-1px', fontVariantNumeric: 'tabular-nums' }}>${total.toFixed(2)}</div>
          </div>

          <div style={{ background: '#EBF4FF', border: '1px solid #BEE3F8', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#2B6CB0', lineHeight: 1.6, fontWeight: 500 }}>
            Registra el folio de la transferencia y el nombre del titular de la cuenta.
          </div>

          <div>
            <label style={lbl}>No. Referencia / Folio</label>
            <input className="pos-input" type="text"
              value={referenciaTransferencia}
              onChange={e => setReferenciaTransferencia(e.target.value)}
              style={{ width: '100%', fontSize: 15, fontWeight: 600, fontFamily: FONT }}
              autoFocus
              placeholder="Ej: 202504220001" />
          </div>

          <div>
            <label style={lbl}>Nombre completo del titular</label>
            <input className="pos-input" type="text"
              value={nombreTransferencia}
              onChange={e => setNombreTransferencia(e.target.value)}
              style={{ width: '100%', fontSize: 15, fontWeight: 600, fontFamily: FONT }}
              placeholder="Ej: Juan García López" />
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
