import { useState, useEffect } from 'react'
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
      if (!Array.isArray(ns)) { setCargando(false); return }
      setNegocios(ns)
      const init = {}
      await Promise.all(ns.map(async n => {
        try { init[n.id] = await api.listarFormasPago(n.id) }
        catch { init[n.id] = [] }
      }))
      setFormas(init); setCargando(false)
    }).catch(() => setCargando(false))
  }, [])

  const toggleActivo = (negocioId, clave) => {
    setFormas(f => ({
      ...f,
      [negocioId]: f[negocioId].map(fp => fp.clave === clave ? { ...fp, activo: !fp.activo } : fp)
    }))
  }

  const toggleRef = (negocioId, clave) => {
    setFormas(f => ({
      ...f,
      [negocioId]: f[negocioId].map(fp => fp.clave === clave ? { ...fp, requiere_referencia: !fp.requiere_referencia } : fp)
    }))
  }

  const guardar = async (negocioId) => {
    setGuardando(g => ({ ...g, [negocioId]: true }))
    setMsg(m => ({ ...m, [negocioId]: '' }))
    try {
      await api.guardarFormasPago(negocioId, formas[negocioId])
      setMsg(m => ({ ...m, [negocioId]: 'Guardado' }))
    } catch (err) { setMsg(m => ({ ...m, [negocioId]: err.message })) }
    setGuardando(g => ({ ...g, [negocioId]: false }))
  }

  return (
    <div style={s.overlay}>
      <div style={{ ...s.modalCard, width: 620 }}>
        <div style={s.modalHeader}>
          <h3 style={s.modalTitle}>Formas de pago</h3>
          <button style={s.btnCerrar} onClick={onClose}>✕</button>
        </div>
        <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 20px' }}>
          Activa los métodos de pago disponibles en el POS para cada negocio.
        </p>
        {cargando ? <p style={{ textAlign: 'center', color: '#6B7280', padding: 20 }}>Cargando...</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {negocios.map(n => (
              <div key={n.id} style={s.negCard}>
                <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#1E3A5F' }}>{n.nombre}</h4>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ ...s.fieldLabel, textAlign: 'left', padding: '4px 0' }}>Forma de pago</th>
                      <th style={{ ...s.fieldLabel, textAlign: 'center', padding: '4px 0', width: 70 }}>Activa</th>
                      <th style={{ ...s.fieldLabel, textAlign: 'center', padding: '4px 0', width: 110 }}>Pide ref.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(formas[n.id] || []).map(fp => (
                      <tr key={fp.clave}>
                        <td style={{ padding: '6px 0', fontSize: 13, color: '#374151' }}>{fp.nombre}</td>
                        <td style={{ textAlign: 'center' }}>
                          <input type="checkbox" checked={fp.activo} onChange={() => toggleActivo(n.id, fp.clave)} />
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <input type="checkbox" checked={fp.requiere_referencia} onChange={() => toggleRef(n.id, fp.clave)}
                            disabled={!fp.activo} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginTop: 12 }}>
                  {msg[n.id] && (
                    <span style={{ fontSize: 12, color: msg[n.id] === 'Guardado' ? '#065F46' : '#DC2626' }}>{msg[n.id]}</span>
                  )}
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
