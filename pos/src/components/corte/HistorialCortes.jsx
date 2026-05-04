import { useEffect, useState } from 'react'
import { api } from '../../api'
import { printCorteSnapshot } from '../../printer-client'

export default function HistorialCortes({ usuario }) {
  const [items, setItems] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [detalle, setDetalle] = useState(null)

  useEffect(() => {
    let mounted = true
    api.listarHistorialCortes({ negocio_id: usuario.negocio_id })
      .then(r => { if (mounted) setItems(Array.isArray(r) ? r : []) })
      .catch(e => { if (mounted) setError(e.message) })
      .finally(() => { if (mounted) setCargando(false) })
    return () => { mounted = false }
  }, [usuario.negocio_id])

  const verDetalle = async (id) => {
    try {
      const r = await api.obtenerHistorialCorte(id)
      setDetalle(r)
    } catch (e) {
      setError(e.message)
    }
  }

  const reimprimir = async (snap) => {
    try { await printCorteSnapshot(snap, {}) } catch { /* impresora puede no estar */ }
  }

  if (cargando) return <div style={{ padding: 30, color: '#6B7280' }}>Cargando historial...</div>
  if (error) return <div style={{ padding: 30, color: '#DC2626' }}>{error}</div>

  return (
    <div style={s.root}>
      <h3 style={s.titulo}>Historial de cortes</h3>
      {items.length === 0 ? (
        <p style={{ color: '#6B7280' }}>No hay cortes registrados.</p>
      ) : (
        <table style={s.tabla}>
          <thead>
            <tr>
              <th style={s.th}>Fecha</th>
              <th style={s.th}>Tipo</th>
              <th style={s.th}>Cajero</th>
              <th style={s.th}>Total ventas</th>
              <th style={s.th}>Diferencia</th>
              <th style={s.th}></th>
            </tr>
          </thead>
          <tbody>
            {items.map(it => (
              <tr key={it.id} style={s.tr}>
                <td style={s.td}>{new Date(it.creado_en).toLocaleString('es-MX')}</td>
                <td style={s.td}>{it.tipo}</td>
                <td style={s.td}>{it.cajero_nombre}</td>
                <td style={s.td}>${parseFloat(it.total_ventas || 0).toFixed(2)}</td>
                <td style={s.td}>{it.diferencia != null ? `$${parseFloat(it.diferencia).toFixed(2)}` : '—'}</td>
                <td style={s.td}>
                  <button style={s.btn} onClick={() => verDetalle(it.id)}>Ver</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {detalle && (
        <div style={s.overlay}>
          <div style={s.card}>
            <div style={s.cardHeader}>
              <span>Detalle — {detalle.tipo} · {detalle.cajero_nombre}</span>
              <button style={s.btnClose} onClick={() => setDetalle(null)}>×</button>
            </div>
            <div style={s.cardBody}>
              <pre style={s.json}>{JSON.stringify(detalle.snapshot, null, 2)}</pre>
            </div>
            <div style={s.cardFooter}>
              <button style={s.btnPrim} onClick={() => reimprimir(detalle.snapshot)}>Reimprimir</button>
              <button style={s.btnSec} onClick={() => setDetalle(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  root:   { padding: 20, color: '#1a1a1a' },
  titulo: { fontSize: 18, fontWeight: 700, marginBottom: 14, color: '#1a1a1a' },
  tabla:  { width: '100%', borderCollapse: 'collapse', background: '#FFF', border: '1px solid #E5E7EB' },
  th:     { textAlign: 'left', padding: '10px 12px', fontSize: 12, fontWeight: 700, color: '#374151', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' },
  tr:     { borderBottom: '1px solid #F3F4F6' },
  td:     { padding: '10px 12px', fontSize: 13, color: '#1a1a1a' },
  btn:    { padding: '4px 10px', fontSize: 12, border: '1px solid #BFDBFE', background: '#F0F7FF', color: '#1E3A5F', borderRadius: 4, cursor: 'pointer' },
  overlay:{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 150 },
  card:   { width: 720, maxHeight: '80vh', background: '#FFF', borderRadius: 8, display: 'flex', flexDirection: 'column', color: '#1a1a1a' },
  cardHeader: { padding: '12px 16px', background: '#1E3A5F', color: '#FFF', fontWeight: 700, display: 'flex', justifyContent: 'space-between' },
  btnClose: { background: 'transparent', border: 'none', color: '#FFF', fontSize: 22, cursor: 'pointer' },
  cardBody: { padding: 16, overflow: 'auto', flex: 1 },
  json:   { fontSize: 11, color: '#1a1a1a', whiteSpace: 'pre-wrap' },
  cardFooter: { padding: '10px 16px', borderTop: '1px solid #E5E7EB', display: 'flex', gap: 8, justifyContent: 'flex-end' },
  btnPrim:{ padding: '6px 14px', background: '#1E3A5F', color: '#FFF', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' },
  btnSec: { padding: '6px 14px', background: '#FFF', color: '#374151', border: '1px solid #D1D5DB', borderRadius: 4, fontSize: 12, cursor: 'pointer' },
}
