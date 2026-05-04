import { useState, useEffect } from 'react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import { exportarInventario } from '../utils/exportarExcel'

const NEGOCIOS = [
  { id: 1, nombre: 'Farmacia Noriega' },
  { id: 2, nombre: 'Crucero Independencia' },
]

const TIPOS_AJUSTE = [
  { value: 'ajuste',        label: 'Ajuste general' },
  { value: 'merma',         label: 'Merma (caducado / deterioro)' },
  { value: 'robo',          label: 'Robo o pérdida' },
  { value: 'dañado',        label: 'Producto dañado' },
  { value: 'error_captura', label: 'Corrección de captura' },
]

const TIPO_LABEL = {
  ajuste:         'Ajuste',
  merma:          'Merma',
  robo:           'Robo',
  dañado:         'Dañado',
  error_captura:  'Corrección',
  venta:          'Venta',
  entrada:        'Entrada',
  carga_inicial:  'Carga inicial',
  baja:           'Baja (desactivado)',
}

const TIPO_COLOR = {
  venta:          { bg: '#FEF3C7', text: '#92400E' },
  entrada:        { bg: '#D1FAE5', text: '#065F46' },
  carga_inicial:  { bg: '#DBEAFE', text: '#1E40AF' },
  ajuste:         { bg: '#F3F4F6', text: '#374151' },
  merma:          { bg: '#FEE2E2', text: '#991B1B' },
  robo:           { bg: '#FEE2E2', text: '#7F1D1D' },
  dañado:         { bg: '#FEE2E2', text: '#991B1B' },
  error_captura:  { bg: '#FDF4FF', text: '#6B21A8' },
  baja:           { bg: '#1F2937', text: '#F9FAFB' },
}

export default function InventarioPage() {
  const { usuario } = useAuth()
  const [negocioId, setNegocioId]       = useState(usuario?.negocio_id || 1)
  const [inventario, setInventario]     = useState([])
  const [cargando, setCargando]         = useState(true)
  const [busqueda, setBusqueda]         = useState('')
  const [filtro, setFiltro]             = useState('todos')
  const [inversion, setInversion]       = useState(null)

  // Modal ajuste
  const [modalAjuste, setModalAjuste]   = useState(null)
  const [nuevaCantidad, setNuevaCantidad] = useState('')
  const [nuevaAlerta, setNuevaAlerta]   = useState('')
  const [nuevoMaximo, setNuevoMaximo]   = useState('')
  const [tipoAjuste, setTipoAjuste]     = useState('ajuste')
  const [notasAjuste, setNotasAjuste]   = useState('')
  const [guardando, setGuardando]       = useState(false)
  const [mensajeAjuste, setMensajeAjuste] = useState('')

  // Modal kardex
  const [kardex, setKardex]             = useState(null)  // { producto, movimientos }
  const [cargandoKardex, setCargandoKardex] = useState(false)

  useEffect(() => { cargar() }, [negocioId])

  const cargar = async () => {
    setCargando(true)
    const [inv, invData] = await Promise.all([
      api.listarInventario(negocioId),
      api.obtenerInversion(negocioId),
    ])
    setInventario(Array.isArray(inv) ? inv : [])
    setInversion(invData && !invData.error ? invData : null)
    setCargando(false)
  }

  const items = inventario.filter(i => {
    if (filtro === 'bajo' && parseFloat(i.cantidad) > parseFloat(i.alerta_minima)) return false
    if (!busqueda) return true
    const q = busqueda.toLowerCase()
    return i.nombre.toLowerCase().includes(q) || (i.codigo_barras || '').includes(q)
  })

  const totalProductos   = inventario.length
  const productosBajos   = inventario.filter(i => parseFloat(i.cantidad) <= parseFloat(i.alerta_minima)).length

  // ── Ajuste ────────────────────────────────────────────────
  const abrirAjuste = (item) => {
    setModalAjuste(item)
    setNuevaCantidad('')
    setNuevaAlerta(item.alerta_minima || '')
    setNuevoMaximo(item.maximo || '')
    setTipoAjuste('ajuste')
    setNotasAjuste('')
    setMensajeAjuste('')
  }

  const handleAjustar = async () => {
    if (nuevaCantidad === '' || parseFloat(nuevaCantidad) < 0) {
      setMensajeAjuste('Ingresa una cantidad válida')
      return
    }
    setGuardando(true)
    const res = await api.ajustarInventario({
      producto_id:  modalAjuste.producto_id,
      negocio_id:   negocioId,
      cantidad:     parseFloat(nuevaCantidad),
      alerta_minima: nuevaAlerta ? parseFloat(nuevaAlerta) : undefined,
      maximo:       nuevoMaximo ? parseInt(nuevoMaximo) : undefined,
      tipo:         tipoAjuste,
      notas:        notasAjuste || TIPOS_AJUSTE.find(t => t.value === tipoAjuste)?.label || 'Ajuste',
    })
    setGuardando(false)
    if (res.error) { setMensajeAjuste(res.error) }
    else { setModalAjuste(null); cargar() }
  }

  // ── Kardex ────────────────────────────────────────────────
  const abrirKardex = async (item) => {
    setCargandoKardex(true)
    setKardex({ producto: item, movimientos: [] })
    const res = await api.listarMovimientos(negocioId, item.producto_id)
    setKardex({ producto: item, movimientos: Array.isArray(res) ? res : [] })
    setCargandoKardex(false)
  }

  const formatFecha = (iso) => {
    const d = new Date(iso)
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div>
      {/* HEADER */}
      <div style={s.pageHeader}>
        <div>
          <h2 style={s.pageTitle}>Inventario</h2>
          <p style={s.pageSub}>{totalProductos} productos · {productosBajos} en alerta</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={s.btnRefresh} onClick={cargar}>Actualizar</button>
          <button
            style={{ ...s.btnExcel, opacity: inventario.length === 0 ? 0.5 : 1 }}
            disabled={inventario.length === 0}
            onClick={() => exportarInventario(inventario, negocioId)}
          >
            Exportar Excel
          </button>
        </div>
      </div>

      {/* WIDGET INVERSIÓN */}
      {inversion && (
        <div style={s.invWidget}>
          <div style={s.invTotal}>
            <span style={{ fontSize: 12, color: '#6B7280', fontWeight: 600 }}>INVERSIÓN TOTAL EN INVENTARIO</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: '#1E3A5F' }}>${parseFloat(inversion.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
          </div>
          <div style={s.invCats}>
            {inversion.por_categoria.slice(0, 6).map(c => (
              <div key={c.categoria} style={s.invCat}>
                <span style={{ fontSize: 12, color: '#6B7280' }}>{c.categoria}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>${parseFloat(c.inversion).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>{parseFloat(c.unidades)} uds</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CONTROLES */}
      <div style={s.controls}>
        <div style={s.negocioTabs}>
          {NEGOCIOS.map(n => (
            <button key={n.id}
              style={{ ...s.tabBtn, ...(negocioId === n.id ? s.tabBtnActive : {}) }}
              onClick={() => setNegocioId(n.id)}>
              {n.nombre}
            </button>
          ))}
        </div>
        <div style={s.filtros}>
          <input style={s.searchInput} type="text" placeholder="Buscar producto..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          <button style={{ ...s.filtroBtn, ...(filtro === 'todos' ? s.filtroBtnActive : {}) }}
            onClick={() => setFiltro('todos')}>Todos</button>
          <button style={{ ...s.filtroBtn, ...(filtro === 'bajo' ? s.filtroBtnAlerta : {}) }}
            onClick={() => setFiltro(filtro === 'bajo' ? 'todos' : 'bajo')}>
            Solo alertas {productosBajos > 0 && <span style={s.badge}>{productosBajos}</span>}
          </button>
        </div>
      </div>

      {/* TABLA */}
      {cargando ? (
        <p style={{ color: '#6B7280', padding: 20 }}>Cargando...</p>
      ) : items.length === 0 ? (
        <div style={s.empty}>
          {busqueda || filtro === 'bajo' ? 'Sin resultados.' : 'Sin productos en inventario para este negocio.'}
        </div>
      ) : (
        <div className="tbl-wrap">
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Código</th>
                <th style={s.th}>Producto</th>
                <th style={s.th}>Unidad</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Precio</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Stock</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Mínimo</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Máximo</th>
                <th style={s.th}>Estado</th>
                <th style={s.th}></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const bajo = parseFloat(item.cantidad) <= parseFloat(item.alerta_minima)
                return (
                  <tr key={item.id} style={{ ...s.tr, ...(bajo ? s.trAlerta : {}) }}>
                    <td style={s.td}><span style={s.code}>{item.codigo_barras || '—'}</span></td>
                    <td style={s.td}><span style={s.productName}>{item.nombre}</span></td>
                    <td style={s.td}>{item.unidad}</td>
                    <td style={{ ...s.td, textAlign: 'right' }}>${parseFloat(item.precio).toFixed(2)}</td>
                    <td style={{ ...s.td, textAlign: 'right', fontWeight: 700, color: bajo ? '#DC2626' : '#111827' }}>
                      {parseFloat(item.cantidad)}
                    </td>
                    <td style={{ ...s.td, textAlign: 'right', color: '#6B7280' }}>
                      {parseFloat(item.alerta_minima)}
                    </td>
                    <td style={{ ...s.td, textAlign: 'right', color: item.maximo ? '#374151' : '#D1D5DB' }}>
                      {item.maximo || '—'}
                    </td>
                    <td style={s.td}>
                      <span style={{ ...s.statusBadge, ...(bajo ? s.statusBajo : s.statusOk) }}>
                        {bajo ? 'Stock bajo' : 'OK'}
                      </span>
                    </td>
                    <td style={{ ...s.td, textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button style={s.btnKardex} onClick={() => abrirKardex(item)}>Kardex</button>
                        <button style={s.btnAjustar} onClick={() => abrirAjuste(item)}>Ajustar</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── MODAL AJUSTE ────────────────────────────────────── */}
      {modalAjuste && (
        <div style={s.overlay}>
          <div style={s.modalCard}>
            <h3 style={s.modalTitle}>Ajustar inventario</h3>
            <p style={s.modalSub}>{modalAjuste.nombre}</p>

            <div style={s.formGrid}>
              <div style={{ ...s.field, gridColumn: '1 / -1' }}>
                <label style={s.label}>Tipo de ajuste</label>
                <select style={s.input} value={tipoAjuste} onChange={e => setTipoAjuste(e.target.value)}>
                  {TIPOS_AJUSTE.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div style={s.field}>
                <label style={s.label}>Nueva cantidad en stock</label>
                <input style={s.input} type="number" min="0" step="1"
                  placeholder={`Stock actual: ${parseFloat(modalAjuste.cantidad)}`}
                  value={nuevaCantidad} onChange={e => setNuevaCantidad(e.target.value)} autoFocus />
              </div>

              <div style={s.field}>
                <label style={s.label}>Alerta mínima</label>
                <input style={s.input} type="number" min="0" step="1"
                  value={nuevaAlerta} onChange={e => setNuevaAlerta(e.target.value)} />
              </div>

              <div style={s.field}>
                <label style={s.label}>Máximo en stock</label>
                <input style={s.input} type="number" min="0" step="1"
                  placeholder="Opcional"
                  value={nuevoMaximo} onChange={e => setNuevoMaximo(e.target.value)} />
              </div>

              {nuevoMaximo && nuevaCantidad !== '' && parseFloat(nuevoMaximo) > parseFloat(nuevaCantidad) && (
                <div style={{ gridColumn: '1 / -1', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: '#1D4ED8' }}>
                  Sugerencia: comprar <strong>{parseFloat(nuevoMaximo) - parseFloat(nuevaCantidad)}</strong> unidades para llegar al máximo
                </div>
              )}

              <div style={{ ...s.field, gridColumn: '1 / -1' }}>
                <label style={s.label}>Notas (opcional)</label>
                <input style={s.input} type="text"
                  placeholder="Ej: conteo del 15 de abril, caja dañada por humedad..."
                  value={notasAjuste} onChange={e => setNotasAjuste(e.target.value)} />
              </div>
            </div>

            {mensajeAjuste && <p style={s.errorMsg}>{mensajeAjuste}</p>}

            <div style={s.modalFooter}>
              <button style={s.btnSecondary} onClick={() => setModalAjuste(null)}>Cancelar</button>
              <button style={{ ...s.btnPrimary, opacity: guardando ? 0.6 : 1 }}
                onClick={handleAjustar} disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar ajuste'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL KARDEX ────────────────────────────────────── */}
      {kardex && (
        <div style={s.overlay}>
          <div style={{ ...s.modalCard, width: 680, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <div>
                <h3 style={s.modalTitle}>Kardex</h3>
                <p style={s.modalSub}>{kardex.producto.nombre}</p>
              </div>
              <button style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6B7280', padding: '0 4px' }}
                onClick={() => setKardex(null)}>✕</button>
            </div>

            {cargandoKardex ? (
              <p style={{ textAlign: 'center', color: '#6B7280', padding: 30 }}>Cargando historial...</p>
            ) : kardex.movimientos.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#9CA3AF', padding: 30 }}>Sin movimientos registrados.</p>
            ) : (
              <div style={{ overflowY: 'auto', flex: 1 }}>
                <table style={{ ...s.table, fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={s.th}>Fecha</th>
                      <th style={s.th}>Tipo</th>
                      <th style={{ ...s.th, textAlign: 'right' }}>Cantidad</th>
                      <th style={{ ...s.th, textAlign: 'right' }}>Saldo</th>
                      <th style={s.th}>Usuario</th>
                      <th style={s.th}>Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kardex.movimientos.map(m => {
                      const color = TIPO_COLOR[m.tipo] || TIPO_COLOR.ajuste
                      const esNegativo = ['venta', 'merma', 'robo', 'dañado'].includes(m.tipo)
                      const esBaja = m.tipo === 'baja'
                      return (
                        <tr key={m.id} style={s.tr}>
                          <td style={s.td}>{formatFecha(m.creado_en)}</td>
                          <td style={s.td}>
                            <span style={{ ...s.statusBadge, background: color.bg, color: color.text }}>
                              {TIPO_LABEL[m.tipo] || m.tipo}
                            </span>
                          </td>
                          <td style={{ ...s.td, textAlign: 'right', fontWeight: 600,
                            color: esNegativo ? '#DC2626' : esBaja ? '#6B7280' : '#059669' }}>
                            {esBaja ? '—' : (esNegativo ? '' : '+') + parseFloat(m.cantidad)}
                          </td>
                          <td style={{ ...s.td, textAlign: 'right', fontWeight: 700 }}>
                            {esBaja ? '—' : parseFloat(m.saldo_acumulado)}
                          </td>
                          <td style={{ ...s.td, color: '#6B7280' }}>{m.usuario || '—'}</td>
                          <td style={{ ...s.td, color: '#6B7280', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {m.notas || '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ ...s.modalFooter, marginTop: 16 }}>
              <button style={s.btnSecondary} onClick={() => setKardex(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  invWidget:      { background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 8, padding: '16px 20px', marginBottom: 16, display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' },
  invTotal:       { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 200 },
  invCats:        { display: 'flex', gap: 12, flexWrap: 'wrap', flex: 1 },
  invCat:         { display: 'flex', flexDirection: 'column', gap: 2, background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 6, padding: '8px 12px', minWidth: 120 },
  pageHeader:     { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  pageTitle:      { fontSize: 22, fontWeight: 700 },
  pageSub:        { color: '#6B7280', fontSize: 13, marginTop: 2 },
  btnRefresh:     { padding: '7px 14px', background: '#FFF', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 13, color: '#374151', cursor: 'pointer' },
  btnExcel:       { padding: '8px 16px', background: '#10B981', color: '#FFF', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  controls:       { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' },
  negocioTabs:    { display: 'flex', gap: 4 },
  tabBtn:         { padding: '7px 16px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 13, background: '#FFF', color: '#374151', cursor: 'pointer' },
  tabBtnActive:   { background: '#1E3A5F', color: '#FFF', borderColor: '#1E3A5F' },
  filtros:        { display: 'flex', gap: 8, alignItems: 'center' },
  searchInput:    { padding: '7px 12px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 13, width: 220 },
  filtroBtn:      { padding: '7px 14px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 13, background: '#FFF', color: '#374151', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' },
  filtroBtnActive:{ background: '#1E3A5F', color: '#FFF', borderColor: '#1E3A5F' },
  filtroBtnAlerta:{ background: '#FEF2F2', color: '#DC2626', borderColor: '#FECACA' },
  badge:          { background: '#DC2626', color: '#FFF', borderRadius: 10, padding: '1px 6px', fontSize: 11, fontWeight: 700 },
  empty:          { padding: 40, textAlign: 'center', color: '#9CA3AF', background: '#FFF', borderRadius: 8, border: '1px solid #E5E7EB' },
  tableWrap:      { background: '#FFF', borderRadius: 8, border: '1px solid #E5E7EB', overflow: 'hidden' },
  table:          { width: '100%', borderCollapse: 'collapse' },
  th:             { padding: '10px 14px', background: '#F9FAFB', fontSize: 12, fontWeight: 600, color: '#6B7280', textAlign: 'left', borderBottom: '1px solid #E5E7EB' },
  tr:             { borderBottom: '1px solid #F3F4F6' },
  trAlerta:       { background: '#FFF9F9' },
  td:             { padding: '10px 14px', fontSize: 13, verticalAlign: 'middle' },
  code:           { fontFamily: 'monospace', fontSize: 12, color: '#6B7280' },
  productName:    { fontWeight: 500 },
  statusBadge:    { display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 500 },
  statusOk:       { background: '#D1FAE5', color: '#065F46' },
  statusBajo:     { background: '#FEE2E2', color: '#991B1B' },
  btnKardex:      { padding: '4px 10px', background: '#F5F3FF', color: '#6D28D9', border: '1px solid #DDD6FE', borderRadius: 4, fontSize: 12, cursor: 'pointer' },
  btnAjustar:     { padding: '4px 10px', background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', borderRadius: 4, fontSize: 12, cursor: 'pointer' },
  overlay:        { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modalCard:      { background: '#FFF', borderRadius: 10, padding: 28, width: 440, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' },
  modalTitle:     { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  modalSub:       { color: '#6B7280', fontSize: 13, marginBottom: 20 },
  formGrid:       { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 },
  field:          { display: 'flex', flexDirection: 'column', gap: 5 },
  label:          { fontSize: 12, fontWeight: 600, color: '#374151' },
  input:          { padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 14 },
  errorMsg:       { color: '#DC2626', fontSize: 13, marginBottom: 12 },
  modalFooter:    { display: 'flex', justifyContent: 'flex-end', gap: 10 },
  btnPrimary:     { padding: '9px 18px', background: '#1E3A5F', color: '#FFF', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnSecondary:   { padding: '9px 18px', background: '#FFF', color: '#374151', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 14, cursor: 'pointer' },
}
