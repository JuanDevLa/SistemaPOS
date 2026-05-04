import { useState, useRef } from 'react'
import { api } from '../../api'

const TIPOS_ENTRADA = new Set(['carga_inicial', 'entrada'])
const TIPOS_SALIDA  = new Set(['venta', 'merma', 'robo', 'dañado'])

function clasificar(mov) {
  if (TIPOS_ENTRADA.has(mov.tipo)) return 'entrada'
  if (TIPOS_SALIDA.has(mov.tipo))  return 'salida'
  // ajuste/error_captura: por signo del delta
  const delta = parseFloat(mov.hay ?? 0) - parseFloat(mov.habia ?? 0)
  return delta >= 0 ? 'entrada' : 'salida'
}

function fmt(n) {
  return `$${parseFloat(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function fmtFecha(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

export default function TabKardex({ usuario }) {
  const [query, setQuery]           = useState('')
  const [sugerencias, setSugerencias] = useState([])
  const [buscando, setBuscando]     = useState(false)
  const [producto, setProducto]     = useState(null)
  const [movimientos, setMovimientos] = useState([])
  const [cargando, setCargando]     = useState(false)
  const [error, setError]           = useState(null)
  const inputRef = useRef(null)

  const buscar = async () => {
    const q = query.trim()
    if (!q) return
    setBuscando(true)
    setSugerencias([])
    setError(null)
    try {
      const res = await api.buscarProducto(q, usuario.negocio_id)
      if (!res || res.length === 0) {
        setError('No se encontró ningún producto con ese código o nombre')
        setProducto(null)
        return
      }
      if (res.length === 1) {
        await cargarKardex(res[0])
      } else {
        setSugerencias(res)
      }
    } catch(e) {
      setError(e.message)
    } finally {
      setBuscando(false)
    }
  }

  const cargarKardex = async (prod) => {
    setSugerencias([])
    setQuery(prod.codigo_barras || prod.nombre)
    setProducto(prod)
    setCargando(true)
    setError(null)
    try {
      const data = await api.movimientosInventario({
        negocio_id: usuario.negocio_id,
        producto_id: prod.id,
      })
      // orden cronológico para Kardex (ascendente)
      const ordenado = Array.isArray(data)
        ? [...data].sort((a, b) => new Date(a.creado_en) - new Date(b.creado_en))
        : []
      setMovimientos(ordenado)
      // tomar info de inventario del primer registro (todos tienen los mismos campos de inventario)
      if (ordenado.length > 0) {
        const r = ordenado[ordenado.length - 1]
        setProducto(prev => ({
          ...prev,
          stock_actual:   r.stock_actual  ?? prev.stock_actual,
          alerta_minima:  r.alerta_minima ?? 0,
          maximo:         r.maximo        ?? 0,
          costo:          r.costo         ?? prev.costo,
          categoria:      r.categoria     ?? prev.categoria,
        }))
      }
    } catch(e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }

  const exportarCSV = () => {
    if (!movimientos.length) return
    const filas = [
      ['Fecha', 'Detalle', 'Ent.Cantidad', 'Ent.CostoUnit', 'Ent.Total', 'Sal.Cantidad', 'Sal.CostoUnit', 'Sal.Total', 'Exist.Cantidad', 'Exist.CostoUnit', 'Exist.Total'],
      ...movimientos.map(m => {
        const tipo   = clasificar(m)
        const delta  = Math.abs(parseFloat(m.hay ?? 0) - parseFloat(m.habia ?? 0))
        const saldo  = parseFloat(m.hay ?? 0)
        const costo  = parseFloat(m.costo || producto?.costo || 0)
        return [
          fmtFecha(m.creado_en),
          m.notas || m.tipo,
          tipo === 'entrada' ? delta : '',
          tipo === 'entrada' ? costo.toFixed(2) : '',
          tipo === 'entrada' ? (delta * costo).toFixed(2) : '',
          tipo === 'salida'  ? delta : '',
          tipo === 'salida'  ? costo.toFixed(2) : '',
          tipo === 'salida'  ? (delta * costo).toFixed(2) : '',
          saldo,
          costo.toFixed(2),
          (saldo * costo).toFixed(2),
        ]
      })
    ]
    const csv = filas.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kardex_${producto?.nombre || 'producto'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={e.contenedor}>
      {/* Buscador */}
      <div style={e.buscadorZona}>
        <div style={e.titulo}>KARDEX INVENTARIO</div>
        <div style={e.subtitulo}>Por favor ingresa el código del producto que deseas ver su kardex de inventario:</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', position: 'relative' }}>
          <input
            ref={inputRef}
            className="pos-input"
            style={{ width: 380 }}
            placeholder="Código de barras o nombre del producto"
            value={query}
            onChange={ev => { setQuery(ev.target.value); setSugerencias([]) }}
            onKeyDown={ev => ev.key === 'Enter' && buscar()}
          />
          <button className="pos-btn" style={e.btnBuscar} onClick={buscar} disabled={buscando}>
            {buscando ? 'Buscando...' : 'Buscar'}
          </button>
          {producto && (
            <>
              <div style={e.sep} />
              <button className="pos-btn" style={e.btnSecundario} onClick={exportarCSV}>Exportar...</button>
            </>
          )}
          {/* Dropdown sugerencias */}
          {sugerencias.length > 0 && (
            <div style={e.sugerencias}>
              {sugerencias.map(s => (
                <div key={s.id} style={e.sugerenciaItem} onClick={() => cargarKardex(s)}>
                  <span style={{ fontWeight: 600, color: '#1a1a1a' }}>{s.codigo_barras || '—'}</span>
                  <span style={{ color: '#444', marginLeft: 10 }}>{s.nombre}</span>
                  <span style={{ color: '#888', marginLeft: 'auto', fontSize: 12 }}>{s.categoria || ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {error && <div style={e.errorMsg}>{error}</div>}
      </div>

      {/* Contenido Kardex */}
      {producto && (
        <div style={e.kardexContenido}>
          {/* Header del producto */}
          <div style={e.headerProducto}>
            <div style={e.nombreNegocio}>{usuario.negocio_nombre || 'Negocio'}</div>
            <div style={e.kardexLabel}>Kardex de Inventario</div>
            <div style={e.infoGrid}>
              <div style={e.infoFila}>
                <span style={e.infoKey}>Producto:</span>
                <span style={e.infoVal}>{producto.nombre}</span>
                <span style={e.infoKey}>Inventario Mínimo</span>
                <span style={e.infoVal}>{producto.alerta_minima ?? 0}</span>
                <span style={e.infoKey}>Existencia Actual</span>
                <span style={e.infoVal}>{producto.stock_actual ?? 0}</span>
              </div>
              <div style={e.infoFila}>
                <span style={e.infoKey}>Departamento:</span>
                <span style={e.infoVal}>{producto.departamento_nombre || '— Sin Departamento —'}</span>
                <span style={e.infoKey}>Inventario Máximo</span>
                <span style={e.infoVal}>{producto.maximo ?? 0}</span>
              </div>
            </div>
          </div>

          {/* Tabla Kardex */}
          <div style={e.tablaWrap}>
            {cargando ? (
              <div style={e.centro}>Cargando kardex...</div>
            ) : (
              <table style={e.tabla}>
                <thead>
                  <tr style={e.theadGrupo}>
                    <th colSpan={2} style={{ ...e.thGrupo, borderRight: '1px solid #aaa' }} />
                    <th colSpan={3} style={{ ...e.thGrupo, borderRight: '1px solid #aaa' }}>Entradas</th>
                    <th colSpan={3} style={{ ...e.thGrupo, borderRight: '1px solid #aaa' }}>Salidas</th>
                    <th colSpan={3} style={e.thGrupo}>Existencias</th>
                  </tr>
                  <tr style={e.theadSub}>
                    <th style={e.th}>Fecha</th>
                    <th style={{ ...e.th, textAlign: 'left' }}>Detalle</th>
                    <th style={e.th}>Cantidad</th>
                    <th style={e.th}>Costo Unitario</th>
                    <th style={{ ...e.th, borderRight: '1px solid #aaa' }}>Total</th>
                    <th style={e.th}>Cantidad</th>
                    <th style={e.th}>Cost. Unitario</th>
                    <th style={{ ...e.th, borderRight: '1px solid #aaa' }}>Total</th>
                    <th style={e.th}>Cantidad</th>
                    <th style={e.th}>Costo Unitario</th>
                    <th style={e.th}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.length === 0 ? (
                    <tr><td colSpan={11} style={{ padding: 20, textAlign: 'center', color: '#888', fontSize: 13 }}>Sin movimientos registrados</td></tr>
                  ) : movimientos.map((m, i) => {
                    const tipo  = clasificar(m)
                    const delta = Math.abs(parseFloat(m.hay ?? 0) - parseFloat(m.habia ?? 0))
                    const saldo = parseFloat(m.hay ?? 0)
                    const costo = parseFloat(m.costo || producto.costo || 0)
                    return (
                      <tr key={m.id} style={{ background: i % 2 === 0 ? '#fff' : '#f7f7f7' }}>
                        <td style={{ ...e.td, whiteSpace: 'nowrap', color: '#555', fontSize: 12 }}>{fmtFecha(m.creado_en)}</td>
                        <td style={{ ...e.td, textAlign: 'left', color: '#1a1a1a' }}>{m.notas || m.tipo}</td>
                        {/* Entradas */}
                        <td style={e.td}>{tipo === 'entrada' ? delta : ''}</td>
                        <td style={e.td}>{tipo === 'entrada' ? fmt(costo) : ''}</td>
                        <td style={{ ...e.td, borderRight: '1px solid #ddd' }}>{tipo === 'entrada' ? fmt(delta * costo) : ''}</td>
                        {/* Salidas */}
                        <td style={e.td}>{tipo === 'salida' ? delta : ''}</td>
                        <td style={e.td}>{tipo === 'salida' ? fmt(costo) : ''}</td>
                        <td style={{ ...e.td, borderRight: '1px solid #ddd' }}>{tipo === 'salida' ? fmt(delta * costo) : ''}</td>
                        {/* Existencias */}
                        <td style={{ ...e.td, fontWeight: 600, color: saldo <= 0 ? '#c02020' : '#1a1a1a' }}>{saldo}</td>
                        <td style={e.td}>{fmt(costo)}</td>
                        <td style={e.td}>{fmt(saldo * costo)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div style={e.piePagina}>Kardex de Inventario generado por {usuario.negocio_nombre || 'PDV'}</div>
        </div>
      )}

      {/* Footer */}
      <div style={e.footer}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={e.kitBadge}>KIT</span>
          <span style={{ fontSize: 12, color: '#555' }}>El producto fue vendido dentro de un kit</span>
        </div>
      </div>
    </div>
  )
}

const e = {
  contenedor:     { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', background: '#f9f9f9' },
  buscadorZona:   { padding: '14px 20px', borderBottom: '1px solid #e0e0e0', background: '#fafafa' },
  titulo:         { fontSize: 16, fontWeight: 700, color: '#1e3a5f', marginBottom: 4 },
  subtitulo:      { fontSize: 13, color: '#555', marginBottom: 8 },
  btnBuscar:      { padding: '6px 16px', background: '#1e3a5f', color: '#fff', border: 'none', fontSize: 13 },
  btnSecundario:  { padding: '6px 14px', background: '#fff', color: '#333', border: '1px solid #aaa', fontSize: 12 },
  sep:            { width: 1, height: 24, background: '#ccc' },
  sugerencias:    { position: 'absolute', top: 38, left: 0, width: 520, background: '#fff', border: '1px solid #ccc', boxShadow: '0 4px 12px rgba(0,0,0,0.12)', zIndex: 50, maxHeight: 220, overflowY: 'auto' },
  sugerenciaItem: { display: 'flex', alignItems: 'center', padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0', fontSize: 13 },
  errorMsg:       { marginTop: 8, fontSize: 13, color: '#c02020' },
  kardexContenido:{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' },
  headerProducto: { padding: '16px 20px', borderBottom: '1px solid #e0e0e0', background: '#fff', textAlign: 'center' },
  nombreNegocio:  { fontSize: 20, fontWeight: 700, color: '#1a1a1a', marginBottom: 2 },
  kardexLabel:    { fontSize: 14, color: '#555', marginBottom: 14 },
  infoGrid:       { display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 900, margin: '0 auto', textAlign: 'left' },
  infoFila:       { display: 'flex', gap: 32, alignItems: 'baseline', flexWrap: 'wrap' },
  infoKey:        { fontSize: 13, fontWeight: 700, color: '#1a1a1a', minWidth: 120 },
  infoVal:        { fontSize: 13, color: '#333', minWidth: 160 },
  tablaWrap:      { flex: 1, overflow: 'auto' },
  tabla:          { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  theadGrupo:     { background: '#d0d8e8' },
  thGrupo:        { padding: '6px 10px', color: '#1e3a5f', fontWeight: 700, textAlign: 'center', borderBottom: '1px solid #aaa' },
  theadSub:       { background: '#e8ecf4' },
  th:             { padding: '6px 8px', color: '#1e3a5f', fontWeight: 600, textAlign: 'center', borderBottom: '1px solid #ccc', whiteSpace: 'nowrap' },
  td:             { padding: '5px 8px', borderBottom: '1px solid #eee', textAlign: 'center', color: '#1a1a1a' },
  piePagina:      { padding: '8px 20px', fontSize: 11, color: '#888', borderTop: '1px solid #eee', background: '#fff' },
  centro:         { padding: 40, textAlign: 'center', color: '#888', fontSize: 14 },
  footer:         { display: 'flex', alignItems: 'center', padding: '8px 16px', borderTop: '1px solid #ddd', background: '#f0f0f0' },
  kitBadge:       { background: '#6a0dad', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 3 },
}
