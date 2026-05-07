import { useState, useEffect } from 'react'
import { Download, RefreshCw } from 'lucide-react'

export default function UpdateNotification() {
  const [estado, setEstado] = useState(null) // null | 'descargando' | 'listo'
  const [version, setVersion] = useState('')
  const [instalando, setInstalando] = useState(false)

  useEffect(() => {
    if (!window.updaterAPI) return
    window.updaterAPI.onDisponible((v) => { setVersion(v); setEstado('descargando') })
    window.updaterAPI.onListo((v)      => { setVersion(v); setEstado('listo') })
  }, [])

  if (!estado) return null

  const handleInstalar = async () => {
    setInstalando(true)
    await window.updaterAPI.instalar()
  }

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9998,
      background: estado === 'listo' ? '#1e3a5f' : '#374151',
      color: '#fff', padding: '8px 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      fontSize: 13, fontFamily: 'Segoe UI, system-ui, sans-serif',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {estado === 'descargando'
          ? <><Download size={14} /> Descargando actualización v{version} en segundo plano...</>
          : <><RefreshCw size={14} /> Actualización v{version} lista para instalar.</>
        }
      </div>

      {estado === 'listo' && (
        <button
          onClick={handleInstalar}
          disabled={instalando}
          style={{
            background: '#fff', color: '#1e3a5f', border: 'none',
            borderRadius: 6, padding: '4px 14px', fontSize: 12,
            fontWeight: 700, cursor: instalando ? 'not-allowed' : 'pointer',
          }}
        >
          {instalando ? 'Reiniciando...' : 'Instalar y reiniciar'}
        </button>
      )}
    </div>
  )
}
