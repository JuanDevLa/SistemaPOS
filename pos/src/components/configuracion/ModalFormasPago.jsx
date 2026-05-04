import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { api } from '../../api'
import { s } from './estilos'

export function ModalFormasPago({ onClose }) {
  const [negocios, setNegocios]   = useState([])
  const [cargando, setCargando]   = useState(true)
  const [formas, setFormas]       = useState({})
  const [guardando, setGuardando] = useState({})
  const [msg, setMsg]             = useState({})

  useEffect(() => {
    api.listarNegocios().then(async ns => {
      if (!Array.isArray(ns)) return setCargando(false)
      setNegocios(ns)
      const init = {}
      await Promise.all(ns.map(async n => {
        try { init[n.id] = await api.listarFormasPago(n.id) }
        catch { init[n.id] = [] }
      }))
      setFormas(init); setCargando(false)
    }).catch(() => setCargando(false))
  }, [])

  const toggle = (nid, clave, campo) =>
    setFormas(f => ({ ...f, [nid]: f[nid].map(fp => fp.clave === clave ? { ...fp, [campo]: !fp[campo] } : fp) }))

  const guardar = async (nid) => {
    setGuardando(g => ({ ...g, [nid]: true }))
    setMsg(m => ({ ...m, [nid]: '' }))
    try {
      await api.guardarFormasPago(nid, formas[nid])
      setMsg(m => ({ ...m, [nid]: 'Guardado' }))
    } catch (err) { setMsg(m => ({ ...m, [nid]: err.message })) }
    setGuardando(g => ({ ...g, [nid]: false }))
  }

  return (
    <div style={s.overlay}>
      <div style={{ ...s.modalCard, width: 580 }}>
        <div style={s.modalHeader}>
          <h3 style={s.modalTitle}>Formas de pago</h3>
          <button style={s.btnCerrar} onClick={onClose}><X size={18} /></button>
        </div>
        <p style={s.desc}>Activa los métodos de pago disponibles en el POS para cada negocio.</p>
        {cargando ? <p style={s.loading}>Cargando...</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {negocios.map(n => (
              <div key={n.id} style={s.negCard}>
                <h4 style={s.negNombre}>{n.nombre}</h4>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ ...s.fieldLabel, textAlign: 'left', padding: '4px 0' }}>Forma de pago</th>
                      <th style={{ ...s.fieldLabel, textAlign: 'center', width: 70 }}>Activa</th>
                      <th style={{ ...s.fieldLabel, textAlign: 'center', width: 100 }}>Pide ref.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(formas[n.id] || []).map(fp => (
                      <tr key={fp.clave}>
                        <td style={{ padding: '6px 0', fontSize: 13, color: '#1a1a1a' }}>{fp.nombre}</td>
                        <td style={{ textAlign: 'center' }}>
                          <input type="checkbox" checked={fp.activo} onChange={() => toggle(n.id, fp.clave, 'activo')} />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <input type="checkbox" checked={fp.requiere_referencia} disabled={!fp.activo}
                            onChange={() => toggle(n.id, fp.clave, 'requiere_referencia')} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginTop: 10 }}>
                  {msg[n.id] && <span style={{ fontSize: 12, color: msg[n.id] === 'Guardado' ? '#065F46' : '#DC2626' }}>{msg[n.id]}</span>}
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
