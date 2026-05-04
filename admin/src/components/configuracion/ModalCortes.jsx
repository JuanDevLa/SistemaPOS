import { useState, useEffect } from 'react'
import { api } from '../../api'
import { s } from './estilos'

export function ModalCortes({ onClose }) {
  const [negocios, setNegocios] = useState([])
  const [vals, setVals] = useState({})
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState({})
  const [msg, setMsg] = useState({})

  useEffect(() => {
    let activo = true
    api.listarNegocios().then(async (res) => {
      if (!Array.isArray(res) || !activo) return
      setNegocios(res)
      const init = {}
      for (const n of res) {
        try {
          const cfg = await api.obtenerConfigNegocio(n.id)
          init[n.id] = cfg?.max_cortes_cajero_dia ?? 3
        } catch {
          init[n.id] = 3
        }
      }
      if (activo) { setVals(init); setCargando(false) }
    }).catch(() => { if (activo) setCargando(false) })
    return () => { activo = false }
  }, [])

  const guardar = async (id) => {
    setGuardando(g => ({ ...g, [id]: true }))
    setMsg(m => ({ ...m, [id]: '' }))
    try {
      const res = await api.actualizarConfigNegocio(id, { max_cortes_cajero_dia: parseInt(vals[id], 10) })
      if (res?.error) setMsg(m => ({ ...m, [id]: res.error }))
      else setMsg(m => ({ ...m, [id]: 'Guardado' }))
    } catch (err) { setMsg(m => ({ ...m, [id]: err.message })) }
    setGuardando(g => ({ ...g, [id]: false }))
  }

  return (
    <div style={s.overlay}>
      <div style={s.modalCard}>
        <div style={s.modalHeader}>
          <h3 style={s.modalTitle}>Cortes</h3>
          <button style={s.btnCerrar} onClick={onClose}>✕</button>
        </div>
        <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 20px' }}>
          Define cuántos cortes parciales puede generar cada cajero al día (1–20).
          Al alcanzarlo deberá pedir autorización al admin.
        </p>
        {cargando ? (
          <p style={{ textAlign: 'center', color: '#6B7280', padding: 20 }}>Cargando...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {negocios.map(n => (
              <div key={n.id} style={s.negCard}>
                <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700, color: '#1E3A5F' }}>{n.nombre}</h4>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div>
                    <label style={s.fieldLabel}>Máximo de cortes por cajero al día</label>
                    <input
                      style={{ ...s.fieldInput, width: 100 }}
                      type="number" min={1} max={20}
                      value={vals[n.id] ?? 3}
                      onChange={e => setVals(v => ({ ...v, [n.id]: e.target.value }))}
                    />
                  </div>
                  <button style={s.btnGuardar} onClick={() => guardar(n.id)} disabled={guardando[n.id]}>
                    {guardando[n.id] ? 'Guardando...' : 'Guardar'}
                  </button>
                  {msg[n.id] && (
                    <span style={{ fontSize: 12, color: msg[n.id] === 'Guardado' ? '#065F46' : '#DC2626' }}>{msg[n.id]}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
