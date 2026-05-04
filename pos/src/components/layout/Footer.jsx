import { useState, useEffect } from 'react'

export default function Footer() {
  const [ahora, setAhora] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const fecha = ahora.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })
  const hora  = ahora.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })

  return (
    <div style={s.footer}>
      <span style={s.ayuda}>💡 Punto de Venta ... Teclee o escanee el Código del Producto</span>
      <span style={s.version}>Ver 1.0.0</span>
      <span style={s.reloj}>{fecha} &nbsp; {hora}</span>
    </div>
  )
}

const s = {
  footer: {
    background: '#e0e0e0',
    borderTop: '1px solid #c0c0c0',
    padding: '4px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexShrink: 0,
    height: 28
  },
  ayuda:   { fontSize: 11, color: '#555' },
  version: { fontSize: 10, color: '#999', fontWeight: 600 },
  reloj:   { fontSize: 12, color: '#333', fontWeight: 700, fontFamily: 'monospace' }
}
