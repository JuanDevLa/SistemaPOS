import { useState, useEffect } from 'react'
import { api } from '../../api'
import { useConfigNegocios } from './useConfigNegocios'
import { s } from './estilos'

export function ModalConfigNegocio({ titulo, desc, ancho, getVals, renderCampos, onClose }) {
  const { negocios, configs, cargando } = useConfigNegocios()
  const [vals, setVals]         = useState({})
  const [guardando, setGuardando] = useState({})
  const [msg, setMsg]           = useState({})

  useEffect(() => {
    if (!cargando) {
      const init = {}
      negocios.forEach(n => { init[n.id] = getVals(configs[n.id] || {}) })
      setVals(init)
    }
  }, [cargando]) // eslint-disable-line react-hooks/exhaustive-deps

  const setVal = (negocioId, campo, valor) =>
    setVals(v => ({ ...v, [negocioId]: { ...v[negocioId], [campo]: valor } }))

  const guardar = async (id) => {
    setGuardando(g => ({ ...g, [id]: true }))
    setMsg(m => ({ ...m, [id]: '' }))
    try {
      await api.actualizarConfigNegocio(id, vals[id])
      setMsg(m => ({ ...m, [id]: 'Guardado' }))
    } catch (err) { setMsg(m => ({ ...m, [id]: err.message })) }
    setGuardando(g => ({ ...g, [id]: false }))
  }

  return (
    <div style={s.overlay}>
      <div style={{ ...s.modalCard, ...(ancho ? { width: ancho } : {}) }}>
        <div style={s.modalHeader}>
          <h3 style={s.modalTitle}>{titulo}</h3>
          <button style={s.btnCerrar} onClick={onClose}>✕</button>
        </div>
        {desc && <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 20px' }}>{desc}</p>}
        {cargando ? <p style={{ textAlign: 'center', color: '#6B7280', padding: 20 }}>Cargando...</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {negocios.map(n => (
              <div key={n.id} style={s.negCard}>
                <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#1E3A5F' }}>{n.nombre}</h4>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  {renderCampos(n.id, vals[n.id] || {}, setVal)}
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
