import { useState, useEffect } from 'react'
import { api } from '../../api'
import { s } from './estilos'

export function ModalFolios({ onClose }) {
  const [negocios, setNegocios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState({})
  const [vals, setVals] = useState({})
  const [msg, setMsg] = useState({})

  useEffect(() => {
    api.listarNegocios().then(res => {
      if (Array.isArray(res)) {
        setNegocios(res)
        const init = {}
        res.forEach(n => {
          init[n.id] = { folio_prefijo: n.folio_prefijo || '', folio_siguiente: n.folio_siguiente ?? 1 }
        })
        setVals(init)
      }
      setCargando(false)
    }).catch(() => setCargando(false))
  }, [])

  const guardar = async (id) => {
    setGuardando(g => ({ ...g, [id]: true }))
    setMsg(m => ({ ...m, [id]: '' }))
    try {
      const res = await api.actualizarFolios(id, {
        folio_prefijo: vals[id].folio_prefijo,
        folio_siguiente: parseInt(vals[id].folio_siguiente, 10)
      })
      if (res.error) setMsg(m => ({ ...m, [id]: res.error }))
      else {
        setMsg(m => ({ ...m, [id]: 'Guardado' }))
        setNegocios(ns => ns.map(n => n.id === id ? { ...n, ...res } : n))
      }
    } catch (err) { setMsg(m => ({ ...m, [id]: err.message })) }
    setGuardando(g => ({ ...g, [id]: false }))
  }

  const setVal = (id, campo, valor) =>
    setVals(v => ({ ...v, [id]: { ...v[id], [campo]: valor } }))

  return (
    <div style={s.overlay}>
      <div style={s.modalCard}>
        <div style={s.modalHeader}>
          <h3 style={s.modalTitle}>Folios de ticket</h3>
          <button style={s.btnCerrar} onClick={onClose}>✕</button>
        </div>
        <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 20px' }}>
          El folio se imprime en cada ticket. Formato: <strong>PREFIJO + número (6 dígitos)</strong>. Ejemplo: F-000001.
        </p>
        {cargando ? (
          <p style={{ textAlign: 'center', color: '#6B7280', padding: 20 }}>Cargando...</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {negocios.map(n => (
              <div key={n.id} style={s.negCard}>
                <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#1E3A5F' }}>{n.nombre}</h4>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div>
                    <label style={s.fieldLabel}>Prefijo</label>
                    <input
                      style={{ ...s.fieldInput, width: 90 }}
                      value={vals[n.id]?.folio_prefijo || ''}
                      onChange={e => setVal(n.id, 'folio_prefijo', e.target.value)}
                      placeholder="F-"
                      maxLength={10}
                    />
                  </div>
                  <div>
                    <label style={s.fieldLabel}>Siguiente número</label>
                    <input
                      style={{ ...s.fieldInput, width: 110 }}
                      type="number"
                      min={1}
                      value={vals[n.id]?.folio_siguiente ?? 1}
                      onChange={e => setVal(n.id, 'folio_siguiente', e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={s.fieldLabel}>Vista previa</label>
                    <div style={s.preview}>
                      {(vals[n.id]?.folio_prefijo || '') + String(vals[n.id]?.folio_siguiente ?? 1).padStart(6, '0')}
                    </div>
                  </div>
                  <button
                    style={s.btnGuardar}
                    onClick={() => guardar(n.id)}
                    disabled={guardando[n.id]}
                  >
                    {guardando[n.id] ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
                {msg[n.id] && (
                  <p style={{ fontSize: 12, marginTop: 6, color: msg[n.id] === 'Guardado' ? '#065F46' : '#DC2626' }}>
                    {msg[n.id]}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
