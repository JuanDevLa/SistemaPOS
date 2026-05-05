import { useState, useEffect } from 'react'
import { api } from '../api'

const ACCIONES_LABEL = {
  venta_creada:            'Venta registrada',
  venta_cancelada:         'Venta cancelada',
  devolucion_parcial:      'Devolución parcial',
  permisos_modificados:    'Permisos modificados',
  descuento_aplicado:      'Descuento aplicado',
  efectivo_entrada:        'Entrada de efectivo',
  efectivo_salida:         'Salida de efectivo',
  ticket_cancelado:        'Ticket cancelado',
  articulo_eliminado:      'Artículo eliminado de venta',
  mercancia_recibida:      'Mercancía recibida (orden)',
  mercancia_agregada:      'Mercancía agregada',
  ajuste_inventario:       'Ajuste de inventario',
  credito_otorgado:        'Crédito otorgado',
}

export default function AuditLogPage() {
  const [logs, setLogs]       = useState([])
  const [total, setTotal]     = useState(0)
  const [cargando, setCargando] = useState(true)
  const [filtros, setFiltros] = useState({ accion: '', desde: '', hasta: '', page: 1 })

  useEffect(() => { cargar() }, [filtros.page])

  const cargar = async () => {
    setCargando(true)
    try {
      const params = { limit: 50, page: filtros.page }
      if (filtros.accion) params.accion = filtros.accion
      if (filtros.desde)  params.desde  = filtros.desde
      if (filtros.hasta)  params.hasta  = filtros.hasta + 'T23:59:59'
      const res = await api.listarAuditLog(params)
      setLogs(res.logs || [])
      setTotal(res.total || 0)
    } catch {
      setLogs([])
    }
    setCargando(false)
  }

  const buscar = () => setFiltros(f => ({ ...f, page: 1 }))

  const formatFecha = (s) => {
    if (!s) return '—'
    const d = new Date(s)
    return `${d.toLocaleDateString('es-MX')} ${d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`
  }

  return (
    <div>
      <div style={s.header}>
        <div>
          <h2 style={s.titulo}>Historial de Auditoría</h2>
          <p style={s.sub}>{total} registros</p>
        </div>
      </div>

      <div style={s.filtros}>
        <select style={s.input} value={filtros.accion} onChange={e => setFiltros(f => ({ ...f, accion: e.target.value }))}>
          <option value="">Todas las acciones</option>
          {Object.entries(ACCIONES_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input style={s.input} type="date" value={filtros.desde} onChange={e => setFiltros(f => ({ ...f, desde: e.target.value }))} placeholder="Desde" />
        <input style={s.input} type="date" value={filtros.hasta} onChange={e => setFiltros(f => ({ ...f, hasta: e.target.value }))} placeholder="Hasta" />
        <button style={s.btnBuscar} onClick={buscar}>Filtrar</button>
      </div>

      {cargando ? (
        <p style={{ color: '#6B7280', padding: 20 }}>Cargando...</p>
      ) : (
        <div className="tbl-wrap">
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Fecha</th>
                <th style={s.th}>Usuario</th>
                <th style={s.th}>Negocio</th>
                <th style={s.th}>Acción</th>
                <th style={s.th}>Notas / Motivo</th>
                <th style={s.th}>Referencia</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan={6} style={{ ...s.td, textAlign: 'center', color: '#9CA3AF' }}>Sin registros</td></tr>
              ) : logs.map(log => (
                <tr key={log.id} style={s.tr}>
                  <td style={s.td}>{formatFecha(log.creado_en)}</td>
                  <td style={s.td}>
                    <strong>{log.usuario || '—'}</strong>
                    {log.usuario_rol && <span style={s.rolBadge}>{log.usuario_rol}</span>}
                  </td>
                  <td style={s.td}>{log.negocio || '—'}</td>
                  <td style={s.td}>
                    <span style={s.accionBadge}>{ACCIONES_LABEL[log.accion] || log.accion}</span>
                  </td>
                  <td style={{ ...s.td, maxWidth: 280 }}>
                    {log.notas ? (
                      <span style={{ color: '#374151', fontSize: 12 }}>{log.notas}</span>
                    ) : (
                      <span style={{ color: '#9CA3AF' }}>—</span>
                    )}
                  </td>
                  <td style={s.td}>
                    {log.tabla && log.referencia_id ? (
                      <span style={{ fontSize: 11, color: '#6B7280' }}>{log.tabla} #{log.referencia_id}</span>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > 50 && (
        <div style={s.paginacion}>
          <button style={s.btnPage} disabled={filtros.page === 1} onClick={() => setFiltros(f => ({ ...f, page: f.page - 1 }))}>← Anterior</button>
          <span style={{ fontSize: 13, color: '#6B7280' }}>Página {filtros.page} de {Math.ceil(total / 50)}</span>
          <button style={s.btnPage} disabled={filtros.page >= Math.ceil(total / 50)} onClick={() => setFiltros(f => ({ ...f, page: f.page + 1 }))}>Siguiente →</button>
        </div>
      )}
    </div>
  )
}

const s = {
  header:      { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  titulo:      { fontSize: 22, fontWeight: 700, margin: 0 },
  sub:         { color: '#6B7280', fontSize: 13, marginTop: 4 },
  filtros:     { display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' },
  input:       { padding: '7px 10px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 13, color: '#1a1a1a', background: '#fff' },
  btnBuscar:   { padding: '7px 16px', background: '#1E3A5F', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  table:       { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th:          { padding: '10px 12px', background: '#F9FAFB', borderBottom: '2px solid #E5E7EB', textAlign: 'left', fontWeight: 600, color: '#374151', whiteSpace: 'nowrap' },
  td:          { padding: '10px 12px', borderBottom: '1px solid #F3F4F6', color: '#1a1a1a', verticalAlign: 'top' },
  tr:          { transition: 'background 0.1s' },
  rolBadge:    { marginLeft: 6, fontSize: 10, background: '#EFF6FF', color: '#1E3A5F', padding: '1px 6px', borderRadius: 10, fontWeight: 600 },
  accionBadge: { fontSize: 11, background: '#FEF3C7', color: '#92400E', padding: '2px 8px', borderRadius: 10, fontWeight: 600, whiteSpace: 'nowrap' },
  paginacion:  { display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  btnPage:     { padding: '6px 14px', border: '1px solid #D1D5DB', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 13, color: '#374151' },
}
