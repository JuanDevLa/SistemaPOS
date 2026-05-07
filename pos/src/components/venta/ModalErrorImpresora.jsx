import { useState } from 'react'
import { reprintLastTicket } from '../../printer-client'

const estilos = {
  overlay:  { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
  caja:     { background: '#FFF', borderRadius: 10, padding: 28, width: 360, display: 'flex', flexDirection: 'column', gap: 16 },
  titulo:   { fontSize: 17, fontWeight: 700, color: '#B91C1C', margin: 0 },
  subtitulo:{ fontSize: 13, color: '#6B7280', margin: 0 },
  detalle:  { fontSize: 13, color: '#374151', background: '#F9FAFB', borderRadius: 6, padding: '10px 14px' },
  fila:     { display: 'flex', gap: 10 },
  btnPrim:  { flex: 1, padding: '10px 0', background: '#1E3A5F', color: '#FFF', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnSec:   { flex: 1, padding: '10px 0', background: '#F3F4F6', color: '#374151', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 13, cursor: 'pointer' },
  msg:      { fontSize: 12, color: '#6B7280', textAlign: 'center', minHeight: 16 },
}

export function ModalErrorImpresora({ folio, total, onContinuar }) {
  const [estado, setEstado] = useState('')

  const handleReimprimir = async () => {
    setEstado('Imprimiendo...')
    try {
      const res = await reprintLastTicket()
      if (res?.success) {
        setEstado('Ticket impreso')
        setTimeout(onContinuar, 800)
      } else {
        setEstado(res?.error || 'No se pudo imprimir')
      }
    } catch {
      setEstado('Error al imprimir')
    }
  }

  return (
    <div style={estilos.overlay}>
      <div style={estilos.caja}>
        <p style={estilos.titulo}>Error al imprimir ticket</p>
        <p style={estilos.subtitulo}>La venta fue registrada correctamente. Solo falló la impresora.</p>
        <div style={estilos.detalle}>
          {folio && <div style={{ color: '#1E3A5F', fontWeight: 600 }}>Folio: {folio}</div>}
          {total && <div>Total: ${parseFloat(total).toFixed(2)}</div>}
        </div>
        <p style={estilos.msg}>{estado}</p>
        <div style={estilos.fila}>
          <button style={estilos.btnPrim} onClick={handleReimprimir} disabled={estado === 'Imprimiendo...'}>
            Reimprimir ticket
          </button>
          <button style={estilos.btnSec} onClick={onContinuar}>
            Continuar sin ticket
          </button>
        </div>
      </div>
    </div>
  )
}
