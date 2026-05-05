import { useState, useEffect } from 'react'
import { api } from '../api'

// ── Formulario: Registrar lote manualmente ─────────────────────────────────
function FormAgregarLote({ negocioId }) {
  const [abierto, setAbierto]       = useState(false)
  const [busq, setBusq]             = useState('')
  const [resultados, setResultados] = useState([])
  const [producto, setProducto]     = useState(null)
  const [lote, setLote]             = useState('')
  const [caducidad, setCaducidad]   = useState('')
  const [cantidad, setCantidad]     = useState('')
  const [guardando, setGuardando]   = useState(false)
  const [msg, setMsg]               = useState('')

  const buscar = async () => {
    if (!busq.trim() || !negocioId) return
    const res = await api.buscarProductos(busq)
    setResultados(Array.isArray(res) ? res.filter(p => p.controla_lote) : [])
  }

  const seleccionar = (p) => {
    setProducto(p); setResultados([]); setBusq(p.nombre)
  }

  const guardar = async () => {
    if (!producto || !lote.trim() || !cantidad) { setMsg('Completa producto, lote y cantidad'); return }
    setGuardando(true); setMsg('')
    try {
      await api.crearLoteInicial({
        producto_id:     producto.id,
        negocio_id:      parseInt(negocioId),
        lote:            lote.trim(),
        fecha_caducidad: caducidad || null,
        cantidad:        parseFloat(cantidad),
      })
      setMsg(`Lote "${lote}" registrado para ${producto.nombre}`)
      setProducto(null); setBusq(''); setLote(''); setCaducidad(''); setCantidad('')
    } catch (e) { setMsg(e.message || 'Error al guardar') }
    setGuardando(false)
  }

  if (!abierto) {
    return (
      <button style={s.btnLote} onClick={() => setAbierto(true)}>
        + Registrar lote de producto existente
      </button>
    )
  }

  return (
    <div style={s.loteCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: '#1E3A5F' }}>Registrar lote</span>
        <button onClick={() => setAbierto(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#6B7280' }}>&#10005;</button>
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ position: 'relative' }}>
          <label style={s.flabel}>Producto (controla lote)</label>
          <input style={s.fselect} placeholder="Buscar por nombre..." value={busq}
            onChange={e => { setBusq(e.target.value); setProducto(null) }}
            onKeyDown={e => e.key === 'Enter' && buscar()} />
          <button style={{ ...s.btnBuscar, marginLeft: 6 }} onClick={buscar}>Buscar</button>
          {resultados.length > 0 && (
            <div style={s.dropdown}>
              {resultados.map(p => (
                <div key={p.id} style={s.dropdownItem} onClick={() => seleccionar(p)}>
                  {p.nombre} {p.codigo_barras ? `· ${p.codigo_barras}` : ''}
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <label style={s.flabel}>No. de Lote *</label>
          <input style={s.fselect} placeholder="ej. L-2025-001" value={lote} onChange={e => setLote(e.target.value)} />
        </div>
        <div>
          <label style={s.flabel}>Fecha caducidad</label>
          <input style={s.fselect} type="date" value={caducidad} onChange={e => setCaducidad(e.target.value)} />
        </div>
        <div>
          <label style={s.flabel}>Cantidad *</label>
          <input style={{ ...s.fselect, width: 90 }} type="number" min="0" step="1" placeholder="0"
            value={cantidad} onChange={e => setCantidad(e.target.value)} />
        </div>
        <button style={s.btnBuscar} onClick={guardar} disabled={guardando || !producto}>
          {guardando ? 'Guardando...' : 'Registrar'}
        </button>
      </div>
      {msg && <p style={{ marginTop: 8, fontSize: 13, color: msg.startsWith('Lote') ? '#15803D' : '#DC2626', fontWeight: 600 }}>{msg}</p>}
    </div>
  )
}

const FILTROS_DIAS = [
  { label: 'Vencidos + 30 días', value: 30 },
  { label: 'Vencidos + 60 días', value: 60 },
  { label: 'Vencidos + 90 días', value: 90 },
  { label: 'Vencidos + 180 días', value: 180 },
]

export default function CaducidadesPage() {
  const [negocios, setNegocios]   = useState([])
  const [negocioId, setNegocioId] = useState('')
  const [dias, setDias]           = useState(30)
  const [filas, setFilas]         = useState([])
  const [cargando, setCargando]   = useState(false)
  const [buscado, setBuscado]     = useState(false)

  useEffect(() => {
    api.listarNegocios().then(ns => {
      if (Array.isArray(ns) && ns.length > 0) {
        setNegocios(ns)
        setNegocioId(String(ns[0].id))
      }
    })
  }, [])

  const buscar = async () => {
    if (!negocioId) return
    setCargando(true)
    try {
      const res = await api.caducidades(negocioId, dias)
      setFilas(Array.isArray(res) ? res : [])
    } catch { setFilas([]) }
    setCargando(false)
    setBuscado(true)
  }

  const vencidos  = filas.filter(f => f.estado === 'vencido')
  const proximos  = filas.filter(f => f.estado === 'proximo')

  return (
    <div>
      <div style={s.pageHeader}>
        <div>
          <h2 style={s.pageTitle}>Caducidades</h2>
          <p style={s.pageSub}>Lotes próximos a vencer y vencidos con stock disponible</p>
        </div>
      </div>

      <FormAgregarLote negocioId={negocioId} />

      {/* Filtros */}
      <div style={s.filtros}>
        <div>
          <label style={s.flabel}>Negocio</label>
          <select style={s.fselect} value={negocioId} onChange={e => setNegocioId(e.target.value)}>
            {negocios.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
          </select>
        </div>
        <div>
          <label style={s.flabel}>Rango</label>
          <select style={s.fselect} value={dias} onChange={e => setDias(parseInt(e.target.value))}>
            {FILTROS_DIAS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
        <button style={s.btnBuscar} onClick={buscar} disabled={cargando || !negocioId}>
          {cargando ? 'Consultando...' : 'Consultar'}
        </button>
      </div>

      {/* KPIs */}
      {buscado && (
        <div style={s.kpis}>
          <div style={{ ...s.kpi, borderColor: '#FCA5A5', background: '#FEF2F2' }}>
            <span style={{ ...s.kpiNum, color: '#DC2626' }}>{vencidos.length}</span>
            <span style={s.kpiLabel}>Lotes vencidos</span>
          </div>
          <div style={{ ...s.kpi, borderColor: '#FDE68A', background: '#FFFBEB' }}>
            <span style={{ ...s.kpiNum, color: '#92400E' }}>{proximos.length}</span>
            <span style={s.kpiLabel}>Por vencer en {dias} días</span>
          </div>
          <div style={{ ...s.kpi, borderColor: '#E5E7EB', background: '#F9FAFB' }}>
            <span style={{ ...s.kpiNum, color: '#374151' }}>{filas.length}</span>
            <span style={s.kpiLabel}>Total lotes afectados</span>
          </div>
        </div>
      )}

      {/* Tabla */}
      {buscado && filas.length === 0 && (
        <div style={s.empty}>Sin lotes vencidos ni próximos a vencer en el rango seleccionado.</div>
      )}

      {filas.length > 0 && (
        <div className="tbl-wrap">
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Estado</th>
                <th style={s.th}>Producto</th>
                <th style={s.th}>Código</th>
                <th style={s.th}>Lote</th>
                <th style={s.th}>Caducidad</th>
                <th style={s.th}>Días rest.</th>
                <th style={s.th}>Cantidad</th>
              </tr>
            </thead>
            <tbody>
              {filas.map(f => {
                const vencido = f.estado === 'vencido'
                const dias_r  = parseInt(f.dias_restantes)
                const urgente = !vencido && dias_r <= 7
                return (
                  <tr key={f.id} style={{ ...s.tr, background: vencido ? '#FEF2F2' : urgente ? '#FFFBEB' : undefined }}>
                    <td style={s.td}>
                      <span style={{
                        ...s.badge,
                        background: vencido ? '#FEE2E2' : urgente ? '#FEF3C7' : '#DBEAFE',
                        color:      vencido ? '#991B1B' : urgente ? '#92400E' : '#1E40AF',
                      }}>
                        {vencido ? 'VENCIDO' : urgente ? `${dias_r}d` : `${dias_r}d`}
                      </span>
                    </td>
                    <td style={{ ...s.td, fontWeight: 600 }}>{f.producto}</td>
                    <td style={{ ...s.td, fontFamily: 'monospace', fontSize: 12 }}>{f.codigo_barras || '—'}</td>
                    <td style={{ ...s.td, fontFamily: 'monospace' }}>{f.lote}</td>
                    <td style={s.td}>{f.fecha_caducidad ? new Date(f.fecha_caducidad).toLocaleDateString('es-MX') : '—'}</td>
                    <td style={{ ...s.td, color: vencido ? '#DC2626' : urgente ? '#92400E' : '#374151', fontWeight: 600 }}>
                      {vencido ? `+${Math.abs(dias_r)}d vencido` : `${dias_r}d`}
                    </td>
                    <td style={s.td}>{parseFloat(f.cantidad).toFixed(2)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const s = {
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  pageTitle:  { fontSize: 22, fontWeight: 700, margin: 0 },
  pageSub:    { fontSize: 13, color: '#6B7280', margin: '4px 0 0' },
  filtros:    { display: 'flex', gap: 16, alignItems: 'flex-end', marginBottom: 24, flexWrap: 'wrap' },
  flabel:     { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 },
  fselect:    { padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 13, minWidth: 180 },
  btnBuscar:  { padding: '9px 20px', background: '#1E3A5F', color: '#FFF', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  kpis:       { display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' },
  kpi:        { flex: 1, minWidth: 140, padding: '16px 20px', borderRadius: 8, border: '1px solid', display: 'flex', flexDirection: 'column', gap: 4 },
  kpiNum:     { fontSize: 28, fontWeight: 700, lineHeight: 1 },
  kpiLabel:   { fontSize: 12, color: '#6B7280' },
  table:      { width: '100%', borderCollapse: 'collapse' },
  th:         { padding: '10px 12px', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' },
  tr:         { borderBottom: '1px solid #F3F4F6' },
  td:         { padding: '11px 12px', fontSize: 13, color: '#1F2937' },
  badge:      { padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700 },
  empty:      { padding: 40, textAlign: 'center', color: '#6B7280', background: '#F9FAFB', borderRadius: 8 },
  btnLote:    { marginBottom: 20, padding: '8px 16px', background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  loteCard:   { background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '16px 20px', marginBottom: 20 },
  dropdown:   { position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #D1D5DB', borderRadius: 6, zIndex: 100, maxHeight: 200, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
  dropdownItem: { padding: '8px 12px', cursor: 'pointer', fontSize: 13, color: '#1F2937', borderBottom: '1px solid #F3F4F6' },
}
