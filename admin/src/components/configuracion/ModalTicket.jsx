import { useState, useEffect } from 'react'
import { api } from '../../api'
import { s } from './estilos'

export function ModalTicket({ onClose }) {
  const [negocios, setNegocios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [vals, setVals] = useState({})
  const [guardando, setGuardando] = useState({})
  const [msg, setMsg] = useState({})

  useEffect(() => {
    api.listarNegocios().then(res => {
      if (Array.isArray(res)) {
        setNegocios(res)
        const init = {}
        res.forEach(n => {
          init[n.id] = {
            ticket_nombre:   n.ticket_nombre   || n.nombre || '',
            ticket_slogan:   n.ticket_slogan   || '',
            ticket_telefono: n.ticket_telefono || '',
            ticket_pie:      n.ticket_pie      || '¡Gracias por su compra!',
          }
        })
        setVals(init)
      }
      setCargando(false)
    }).catch(() => setCargando(false))
  }, [])

  const setVal = (id, campo, valor) =>
    setVals(v => ({ ...v, [id]: { ...v[id], [campo]: valor } }))

  const guardar = async (id) => {
    setGuardando(g => ({ ...g, [id]: true }))
    setMsg(m => ({ ...m, [id]: '' }))
    try {
      const res = await api.actualizarTicket(id, vals[id])
      setMsg(m => ({ ...m, [id]: res.error ? res.error : 'Guardado' }))
    } catch (err) { setMsg(m => ({ ...m, [id]: err.message })) }
    setGuardando(g => ({ ...g, [id]: false }))
  }

  return (
    <div style={s.overlay}>
      <div style={{ ...s.modalCard, width: 600 }}>
        <div style={s.modalHeader}>
          <h3 style={s.modalTitle}>Formato de ticket</h3>
          <button style={s.btnCerrar} onClick={onClose}>✕</button>
        </div>
        <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 20px' }}>
          Estos datos aparecen en el encabezado y pie de cada ticket impreso.
        </p>
        {cargando ? (
          <p style={{ textAlign: 'center', color: '#6B7280', padding: 20 }}>Cargando...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {negocios.map(n => (
              <div key={n.id} style={s.negCard}>
                <h4 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: '#1E3A5F' }}>{n.nombre}</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={s.fieldLabel}>Nombre en el ticket (encabezado principal)</label>
                    <input style={s.fieldInput} value={vals[n.id]?.ticket_nombre || ''} onChange={e => setVal(n.id, 'ticket_nombre', e.target.value)} placeholder={n.nombre} maxLength={100} />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={s.fieldLabel}>Segunda línea (dirección o slogan)</label>
                    <input style={s.fieldInput} value={vals[n.id]?.ticket_slogan || ''} onChange={e => setVal(n.id, 'ticket_slogan', e.target.value)} placeholder="Calle Independencia #123, Col. Centro" maxLength={150} />
                  </div>
                  <div>
                    <label style={s.fieldLabel}>Teléfono</label>
                    <input style={s.fieldInput} value={vals[n.id]?.ticket_telefono || ''} onChange={e => setVal(n.id, 'ticket_telefono', e.target.value)} placeholder="222 123 4567" maxLength={30} />
                  </div>
                  <div>
                    <label style={s.fieldLabel}>Mensaje al pie</label>
                    <input style={s.fieldInput} value={vals[n.id]?.ticket_pie || ''} onChange={e => setVal(n.id, 'ticket_pie', e.target.value)} placeholder="¡Gracias por su compra!" maxLength={100} />
                  </div>
                </div>

                <div style={s.ticketPreview}>
                  <div style={{ textAlign: 'center', borderBottom: '1px dashed #ccc', paddingBottom: 6, marginBottom: 6 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{vals[n.id]?.ticket_nombre || n.nombre}</div>
                    {vals[n.id]?.ticket_slogan && <div style={{ fontSize: 11 }}>{vals[n.id].ticket_slogan}</div>}
                    {vals[n.id]?.ticket_telefono && <div style={{ fontSize: 11 }}>Tel: {vals[n.id].ticket_telefono}</div>}
                    <div style={{ fontSize: 11, color: '#888' }}>16/04/2026 12:00 · Folio: F-000001</div>
                  </div>
                  <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Coca-Cola 600ml x2  $36.00</div>
                  <div style={{ fontSize: 11, color: '#666', borderTop: '1px dashed #ccc', paddingTop: 4, marginTop: 4, textAlign: 'right' }}>TOTAL: $36.00</div>
                  <div style={{ fontSize: 11, textAlign: 'center', marginTop: 6, color: '#555' }}>{vals[n.id]?.ticket_pie || '¡Gracias por su compra!'}</div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                  {msg[n.id] ? (
                    <span style={{ fontSize: 12, color: msg[n.id] === 'Guardado' ? '#065F46' : '#DC2626' }}>{msg[n.id]}</span>
                  ) : <span />}
                  <button style={s.btnGuardar} onClick={() => guardar(n.id)} disabled={guardando[n.id]}>
                    {guardando[n.id] ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
