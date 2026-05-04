import { useState, useEffect } from 'react'
import { api } from '../../api'

const ACCIONES_LABEL = {
  permisos_modificados:    'Permisos',
  descuento_aplicado:      'Descuento',
  efectivo_entrada:        'Entrada efectivo',
  efectivo_salida:         'Salida efectivo',
  ticket_cancelado:        'Ticket cancelado',
  articulo_eliminado:      'Artículo eliminado',
  mercancia_agregada:      'Mercancía agregada',
  ajuste_inventario:       'Ajuste inventario',
  credito_otorgado:        'Crédito otorgado',
}

export default function TabAuditLog({ negocio_id }) {
  const [logs, setLogs]       = useState([])
  const [total, setTotal]     = useState(0)
  const [cargando, setCargando] = useState(true)
  const [desde, setDesde]     = useState('')
  const [hasta, setHasta]     = useState('')
  const [page, setPage]       = useState(1)

  useEffect(() => { cargar() }, [page])

  const cargar = async () => {
    setCargando(true)
    try {
      const params = { negocio_id, limit: 30, page }
      if (desde) params.desde = desde
      if (hasta) params.hasta = hasta + 'T23:59:59'
      const res = await api.listarAuditLog(params)
      setLogs(res.logs || [])
      setTotal(res.total || 0)
    } catch {
      setLogs([])
    }
    setCargando(false)
  }

  const buscar = () => { setPage(1); cargar() }

  const fmt = (s) => {
    if (!s) return '—'
    const d = new Date(s)
    return `${d.toLocaleDateString('es-MX')} ${d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`
  }

  return (
    <div style={s.root}>
      <div style={s.filtros}>
        <input style={s.inp} type="date" value={desde} onChange={e => setDesde(e.target.value)} />
        <span style={{ color: '#666', fontSize: 13 }}>—</span>
        <input style={s.inp} type="date" value={hasta} onChange={e => setHasta(e.target.value)} />
        <button style={s.btnFiltrar} onClick={buscar}>Filtrar</button>
        <span style={{ fontSize: 12, color: '#888', marginLeft: 'auto' }}>{total} registros</span>
      </div>

      {cargando ? (
        <p style={{ color: '#888', padding: 20, fontSize: 13 }}>Cargando...</p>
      ) : logs.length === 0 ? (
        <p style={{ color: '#888', padding: 20, fontSize: 13 }}>Sin registros en este rango</p>
      ) : (
        <div style={s.tabla}>
          {logs.map(log => (
            <div key={log.id} style={s.fila}>
              <div style={s.filaTop}>
                <span style={s.accion}>{ACCIONES_LABEL[log.accion] || log.accion}</span>
                <span style={s.usuario}>{log.usuario || '?'}</span>
                <span style={s.fecha}>{fmt(log.creado_en)}</span>
              </div>
              {log.notas && <div style={s.notas}>{log.notas}</div>}
            </div>
          ))}
        </div>
      )}

      {total > 30 && (
        <div style={s.pag}>
          <button style={s.btnPag} disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Ant</button>
          <span style={{ fontSize: 12, color: '#666' }}>{page} / {Math.ceil(total / 30)}</span>
          <button style={s.btnPag} disabled={page >= Math.ceil(total / 30)} onClick={() => setPage(p => p + 1)}>Sig →</button>
        </div>
      )}
    </div>
  )
}

const s = {
  root:      { padding: '12px 0' },
  filtros:   { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' },
  inp:       { padding: '6px 8px', border: '1px solid #ccc', borderRadius: 5, fontSize: 12, color: '#1a1a1a', background: '#fff' },
  btnFiltrar:{ padding: '6px 14px', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 5, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  tabla:     { display: 'flex', flexDirection: 'column', gap: 8 },
  fila:      { background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: '10px 14px' },
  filaTop:   { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' },
  accion:    { fontSize: 12, fontWeight: 700, background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 10 },
  usuario:   { fontSize: 12, fontWeight: 600, color: '#1e3a5f' },
  fecha:     { fontSize: 11, color: '#888', marginLeft: 'auto' },
  notas:     { fontSize: 12, color: '#374151', marginTop: 6, paddingTop: 6, borderTop: '1px solid #e5e7eb' },
  pag:       { display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  btnPag:    { padding: '5px 12px', border: '1px solid #d1d5db', borderRadius: 5, background: '#fff', cursor: 'pointer', fontSize: 12 },
}
