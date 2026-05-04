import { useState } from 'react'
import { api } from '../../api'
import { s } from './estilos'

export function ModalBaseDatos({ onClose }) {
  const [descargando, setDescargando] = useState(false)
  const [msg, setMsg]                 = useState('')

  const descargar = async () => {
    setDescargando(true); setMsg('')
    try {
      const blob = await api.exportarBackup()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `backup-${new Date().toISOString().slice(0,10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setMsg('Backup descargado correctamente')
    } catch (err) { setMsg(err.message) }
    setDescargando(false)
  }

  return (
    <div style={s.overlay}>
      <div style={{ ...s.modalCard, width: 460 }}>
        <div style={s.modalHeader}>
          <h3 style={s.modalTitle}>Base de datos</h3>
          <button style={s.btnCerrar} onClick={onClose}>✕</button>
        </div>
        <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 20px' }}>
          Exporta un snapshot completo de los datos del sistema en formato JSON.
          Incluye negocios, usuarios, productos, inventario, ventas, clientes y movimientos.
        </p>
        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 6, padding: '10px 14px', fontSize: 12, color: '#92400E', marginBottom: 20 }}>
          Este archivo contiene datos sensibles. Guárdalo en un lugar seguro y no lo compartas.
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {msg ? (
            <span style={{ fontSize: 12, color: msg.includes('correctamente') ? '#065F46' : '#DC2626' }}>{msg}</span>
          ) : <span />}
          <button style={s.btnGuardar} onClick={descargar} disabled={descargando}>
            {descargando ? 'Generando...' : '⬇ Descargar backup'}
          </button>
        </div>
      </div>
    </div>
  )
}
