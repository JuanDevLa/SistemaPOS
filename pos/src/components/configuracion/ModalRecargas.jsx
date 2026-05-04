import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { api } from '../../api'
import { s } from './estilos'

export function ModalRecargas({ onClose }) {
  const [negocios, setNegocios]   = useState([])
  const [cargando, setCargando]   = useState(true)
  const [vals, setVals]           = useState({})
  const [guardando, setGuardando] = useState({})
  const [msg, setMsg]             = useState({})

  useEffect(() => {
    api.listarNegocios().then(async ns => {
      if (!Array.isArray(ns)) return setCargando(false)
      setNegocios(ns)
      const map = {}
      await Promise.all(ns.map(async n => {
        try {
          const cfg = await api.obtenerConfigRecargas(n.id)
          map[n.id] = { activo: cfg.activo ?? true, modo: cfg.modo ?? 'mock', api_key: '', api_secret: '' }
        } catch { map[n.id] = { activo: true, modo: 'mock', api_key: '', api_secret: '' } }
      }))
      setVals(map); setCargando(false)
    }).catch(() => setCargando(false))
  }, [])

  const set = (nid, campo, valor) =>
    setVals(v => ({ ...v, [nid]: { ...v[nid], [campo]: valor } }))

  const guardar = async (nid) => {
    setGuardando(g => ({ ...g, [nid]: true }))
    setMsg(m => ({ ...m, [nid]: '' }))
    try {
      await api.actualizarConfigRecargas({ negocio_id: nid, ...vals[nid] })
      setMsg(m => ({ ...m, [nid]: 'Guardado' }))
    } catch (err) { setMsg(m => ({ ...m, [nid]: err.message })) }
    setGuardando(g => ({ ...g, [nid]: false }))
  }

  return (
    <div style={s.overlay}>
      <div style={{ ...s.modalCard, width: 560 }}>
        <div style={s.modalHeader}>
          <h3 style={s.modalTitle}>Recargas electrónicas</h3>
          <button style={s.btnCerrar} onClick={onClose}><X size={18} /></button>
        </div>
        <p style={s.desc}>Configura el proveedor por negocio. Modo <strong>mock</strong> = simulación sin cobro real.</p>
        {cargando ? <p style={s.loading}>Cargando...</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {negocios.map(n => (
              <div key={n.id} style={s.negCard}>
                <h4 style={s.negNombre}>{n.nombre}</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <label style={s.checkLabel}>
                      <input type="checkbox" checked={vals[n.id]?.activo ?? true}
                        onChange={e => set(n.id, 'activo', e.target.checked)} />
                      Módulo activo
                    </label>
                    <div>
                      <label style={s.fieldLabel}>Modo</label>
                      <select style={s.fieldInput} value={vals[n.id]?.modo ?? 'mock'}
                        onChange={e => set(n.id, 'modo', e.target.value)}>
                        <option value="mock">Mock (simulación)</option>
                        <option value="produccion">Producción</option>
                      </select>
                    </div>
                  </div>
                  {vals[n.id]?.modo === 'produccion' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <label style={s.fieldLabel}>API Key</label>
                        <input style={s.fieldInput} type="password" placeholder="••••••••"
                          value={vals[n.id]?.api_key ?? ''}
                          onChange={e => set(n.id, 'api_key', e.target.value)} />
                      </div>
                      <div>
                        <label style={s.fieldLabel}>API Secret</label>
                        <input style={s.fieldInput} type="password" placeholder="••••••••"
                          value={vals[n.id]?.api_secret ?? ''}
                          onChange={e => set(n.id, 'api_secret', e.target.value)} />
                      </div>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10 }}>
                    {msg[n.id] && <span style={{ fontSize: 12, color: msg[n.id] === 'Guardado' ? '#065F46' : '#DC2626' }}>{msg[n.id]}</span>}
                    <button style={s.btnGuardar} onClick={() => guardar(n.id)} disabled={guardando[n.id]}>
                      {guardando[n.id] ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
