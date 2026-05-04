import { useState, useEffect, useMemo } from 'react'
import { api } from '../../api'

export default function TabReporteInventario({ usuario }) {
  const [productos, setProductos]             = useState([])
  const [cargando, setCargando]               = useState(true)
  const [error, setError]                     = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('todas')
  const [reload, setReload]                   = useState(0)

  useEffect(() => {
    const cargar = async () => {
      setCargando(true); setError('')
      try {
        const res = await api.listarInventario(usuario.negocio_id)
        setProductos(res)
      } catch(e) {
        setError(e.message)
      } finally {
        setCargando(false)
      }
    }
    cargar()
  }, [usuario.negocio_id, reload])

  const categorias = useMemo(() => {
    const mapa = new Map()
    for (const p of productos) {
      if (p.departamento_id && p.departamento_nombre) {
        mapa.set(p.departamento_id, p.departamento_nombre)
      }
    }
    return [...mapa.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [productos])

  const filtrados = useMemo(() =>
    filtroCategoria === 'todas'
      ? productos
      : productos.filter(p => String(p.departamento_id) === filtroCategoria),
    [productos, filtroCategoria]
  )

  const costoTotal = useMemo(() =>
    filtrados.reduce((s, p) => s + parseFloat(p.cantidad || 0) * parseFloat(p.costo || 0), 0),
    [filtrados]
  )

  if (cargando) return <div style={e.centro}>Cargando inventario...</div>
  if (error)    return <div style={{ ...e.centro, color: '#c02020' }}>{error}</div>

  const exportarCSV = () => {
    const filas = [
      ['Codigo', 'Descripcion', 'Costo', 'Precio Venta', 'Existencia', 'Inv. Minimo', 'Inv. Maximo'],
      ...filtrados.map(p => [
        p.codigo_barras || '',
        p.nombre,
        parseFloat(p.costo || 0).toFixed(2),
        parseFloat(p.precio || 0).toFixed(2),
        p.cantidad,
        p.alerta_minima,
        p.maximo ?? 0,
      ])
    ]
    const csv = filas.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'reporte_inventario.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Título + métricas */}
      <div style={e.metricas}>
        <div style={{ flex: 1 }}>
          <div style={e.titulo}>REPORTE DE INVENTARIO</div>
          <div style={{ display: 'flex', gap: 40, marginTop: 8 }}>
            <div style={e.metricaCard}>
              <div style={e.metricaLabel}>Costo del inventario</div>
              <div style={e.metricaValor}>${costoTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>
            </div>
            <div style={e.metricaCard}>
              <div style={e.metricaLabel}>Cantidad de productos en Inventario</div>
              <div style={e.metricaValor}>{filtrados.length}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div style={e.filtros}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={e.filtroLabel}>Departamento:</label>
          <select className="pos-input" style={{ width: 220 }} value={filtroCategoria} onChange={ev => setFiltroCategoria(ev.target.value)}>
            <option value="todas">Todos</option>
            {categorias.map(([id, nombre]) => <option key={id} value={String(id)}>{nombre}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="pos-btn" style={e.btnSecundario} onClick={exportarCSV}>Exportar...</button>
          <button className="pos-btn" style={e.btnSecundario} onClick={() => setReload(r => r + 1)}>Actualizar</button>
        </div>
      </div>

      {/* Banner informativo */}
      <div style={e.banner}>
        Solo se muestran los productos que manejan inventario. Para ver todos los productos, consulta Productos &gt; Catálogo.
      </div>

      {/* Tabla */}
      <div style={e.tablaWrap}>
        <table style={e.tabla}>
          <thead>
            <tr style={e.thead}>
              <th style={{ ...e.th, width: 110 }}>Código</th>
              <th style={{ ...e.th, textAlign: 'left' }}>Descripción del Producto</th>
              <th style={e.th}>Costo</th>
              <th style={e.th}>Precio Venta</th>
              <th style={e.th}>Existencia</th>
              <th style={e.th}>Inv. Mínimo</th>
              <th style={e.th}>Inv. Máximo</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 20, color: '#999', fontSize: 13 }}>Sin productos</td></tr>
            )}
            {filtrados.map((p, idx) => {
              const sinStock   = parseFloat(p.cantidad) === 0
              const stockBajo  = p.stock_bajo && !sinStock
              return (
                <tr key={p.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                  <td style={{ ...e.td, fontFamily: 'monospace', fontSize: 12, color: '#666' }}>{p.codigo_barras || '—'}</td>
                  <td style={{ ...e.td, textAlign: 'left', fontWeight: 500, color: '#1a1a1a' }}>{p.nombre}</td>
                  <td style={e.td}>${parseFloat(p.costo || 0).toFixed(2)}</td>
                  <td style={e.td}>${parseFloat(p.precio || 0).toFixed(2)}</td>
                  <td style={{ ...e.td, fontWeight: 700, color: sinStock ? '#c02020' : stockBajo ? '#e07000' : '#1a1a1a' }}>
                    {parseFloat(p.cantidad)}
                  </td>
                  <td style={{ ...e.td, color: '#666' }}>{parseFloat(p.alerta_minima || 0)}</td>
                  <td style={{ ...e.td, color: '#666' }}>{parseFloat(p.maximo || 0)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const e = {
  centro:        { display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#888' },
  metricas:      { padding: '14px 20px', borderBottom: '1px solid #e0e0e0', background: '#fafafa' },
  titulo:        { fontSize: 17, fontWeight: 700, color: '#1e3a5f' },
  metricaCard:   { display: 'flex', flexDirection: 'column', gap: 2 },
  metricaLabel:  { fontSize: 12, color: '#1e3a5f', fontWeight: 600 },
  metricaValor:  { fontSize: 26, fontWeight: 800, color: '#1a1a1a' },
  filtros:       { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderBottom: '1px solid #e0e0e0' },
  filtroLabel:   { fontSize: 13, fontWeight: 600, color: '#555' },
  btnSecundario: { fontSize: 12, padding: '5px 12px', color: '#333', border: '1px solid #ccc', background: '#fff' },
  banner:        { padding: '8px 20px', background: '#fffde7', borderBottom: '1px solid #f0e68c', fontSize: 12, color: '#555' },
  tablaWrap:     { flex: 1, overflow: 'auto' },
  tabla:         { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  thead:         { background: '#1e3a5f', position: 'sticky', top: 0 },
  th:            { padding: '9px 12px', color: '#fff', fontWeight: 600, textAlign: 'center', whiteSpace: 'nowrap' },
  td:            { padding: '7px 12px', borderBottom: '1px solid #eee', textAlign: 'center' },
}
