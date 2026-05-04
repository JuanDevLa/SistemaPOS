import { useState, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'
import { api } from '../api'
import ModalProductoForm      from '../components/productos/ModalProductoForm'
import ModalImportarProductos from '../components/productos/ModalImportarProductos'

export default function ProductosPage() {
  const [productos, setProductos]       = useState([])
  const [departamentos, setDepartamentos] = useState([])
  const [cargando, setCargando]         = useState(true)
  const [busqueda, setBusqueda]         = useState('')
  const [modal, setModal]               = useState(null)   // 'form' | 'importar' | null
  const [productoEditar, setProductoEditar] = useState(null)
  const [confirmDesactivar, setConfirmDesactivar] = useState(null)
  const [importPreview, setImportPreview] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    setCargando(true)
    try {
      const [prods, deps] = await Promise.all([api.listarProductos(), api.listarDepartamentos()])
      setProductos(Array.isArray(prods) ? prods : [])
      setDepartamentos(Array.isArray(deps) ? deps : [])
    } catch { /* lista vacía si falla */ }
    setCargando(false)
  }

  const handleDesactivar = async (id) => {
    try {
      await api.desactivarProducto(id)
      setConfirmDesactivar(null)
      cargar()
    } catch { setConfirmDesactivar(null) }
  }

  const handleArchivoImportar = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target.result, { type: 'array' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' })
      const normalizar = (row) => ({
        codigo_barras:  row['codigo_barras']  || row['Código']      || row['codigo']      || '',
        nombre:         row['nombre']         || row['Nombre']                            || '',
        precio:         row['precio']         || row['Precio']                            || '',
        costo:          row['costo']          || row['Costo']                             || '',
        precio_mayoreo: row['precio_mayoreo'] || row['Mayoreo']                           || '',
        unidad:         row['unidad']         || row['Unidad']                            || 'pieza',
        descripcion:    row['descripcion']    || row['Descripcion'] || row['Descripción'] || '',
      })
      setImportPreview(rows.map(normalizar).filter(r => r.nombre))
      setModal('importar')
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  const nombreDep = (id) => departamentos.find(d => d.id === id)?.nombre || '—'

  const productosFiltrados = productos.filter(p => {
    if (!busqueda) return true
    const q = busqueda.toLowerCase()
    const dep = departamentos.find(d => d.id === p.departamento_id)
    return (
      p.nombre.toLowerCase().includes(q) ||
      (p.codigo_barras || '').includes(q) ||
      (dep?.nombre || '').toLowerCase().includes(q)
    )
  })

  return (
    <div>
      <div style={s.pageHeader}>
        <div>
          <h2 style={s.pageTitle}>Productos</h2>
          <p style={s.pageSub}>{productos.length} productos en catálogo</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={handleArchivoImportar} />
          <button style={s.btnSecondary} onClick={() => fileInputRef.current?.click()}>Importar CSV/Excel</button>
          <button style={s.btnPrimary} onClick={() => { setProductoEditar(null); setModal('form') }}>+ Nuevo producto</button>
        </div>
      </div>

      <div style={s.searchBar}>
        <input style={s.searchInput} type="text" placeholder="Buscar por nombre, código o departamento..."
          value={busqueda} onChange={e => setBusqueda(e.target.value)} />
      </div>

      {cargando ? (
        <p style={{ color: '#6B7280', padding: 20 }}>Cargando...</p>
      ) : productosFiltrados.length === 0 ? (
        <div style={s.empty}>
          {busqueda ? 'Sin resultados para esa búsqueda.' : 'No hay productos. Agrega el primero.'}
        </div>
      ) : (
        <div className="tbl-wrap">
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Código</th>
                <th style={s.th}>Nombre</th>
                <th style={s.th}>Departamento</th>
                <th style={s.th}>Unidad</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Costo</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Precio</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Mayoreo</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Ganancia</th>
                <th style={s.th}></th>
              </tr>
            </thead>
            <tbody>
              {productosFiltrados.map(p => {
                const gan = p.costo && p.precio ? parseFloat(p.precio) - parseFloat(p.costo) : null
                const margenPct = p.costo && p.precio
                  ? (((parseFloat(p.precio) - parseFloat(p.costo)) / parseFloat(p.precio)) * 100).toFixed(0)
                  : null
                return (
                  <tr key={p.id} style={s.tr}>
                    <td style={s.td}><span style={s.code}>{p.codigo_barras || '—'}</span></td>
                    <td style={s.td}>
                      <span style={s.productName}>{p.nombre}</span>
                      {p.aplica_iva && <span style={s.badgeIva}>IVA</span>}
                      {p.descripcion && <span style={s.productDesc}>{p.descripcion}</span>}
                    </td>
                    <td style={s.td}>{nombreDep(p.departamento_id)}</td>
                    <td style={s.td}>{p.unidad}</td>
                    <td style={{ ...s.td, textAlign: 'right', color: '#6B7280' }}>
                      {p.costo ? `$${parseFloat(p.costo).toFixed(2)}` : '—'}
                    </td>
                    <td style={{ ...s.td, textAlign: 'right', fontWeight: 600 }}>
                      ${parseFloat(p.precio).toFixed(2)}
                    </td>
                    <td style={{ ...s.td, textAlign: 'right', color: '#6B7280' }}>
                      {p.precio_mayoreo ? `$${parseFloat(p.precio_mayoreo).toFixed(2)}` : '—'}
                    </td>
                    <td style={{ ...s.td, textAlign: 'right' }}>
                      {gan !== null
                        ? <span style={{ color: '#059669', fontWeight: 600 }}>${gan.toFixed(2)} <span style={{ fontSize: 11, color: '#6B7280' }}>({margenPct}%)</span></span>
                        : <span style={{ color: '#9CA3AF' }}>—</span>}
                    </td>
                    <td style={{ ...s.td, textAlign: 'right' }}>
                      <div style={s.actions}>
                        <button style={s.btnEdit} onClick={() => { setProductoEditar(p); setModal('form') }}>Editar</button>
                        {p.activo && (
                          <button style={s.btnDelete} onClick={() => setConfirmDesactivar(p)}>Desactivar</button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal === 'form' && (
        <ModalProductoForm
          producto={productoEditar}
          departamentos={departamentos}
          onSuccess={cargar}
          onClose={() => setModal(null)}
        />
      )}

      {modal === 'importar' && (
        <ModalImportarProductos
          importPreview={importPreview}
          onSuccess={cargar}
          onClose={() => { setModal(null); setImportPreview(null) }}
        />
      )}

      {confirmDesactivar && (
        <div style={s.overlay}>
          <div style={{ ...s.modalCard, width: 380 }}>
            <h3 style={s.modalTitle}>Desactivar producto</h3>
            <p style={{ color: '#374151', marginBottom: 20 }}>
              ¿Desactivar <strong>{confirmDesactivar.nombre}</strong>? No se podrá vender pero el historial se conserva.
            </p>
            <div style={s.modalFooter}>
              <button style={s.btnSecondary} onClick={() => setConfirmDesactivar(null)}>Cancelar</button>
              <button style={{ ...s.btnPrimary, background: '#DC2626' }} onClick={() => handleDesactivar(confirmDesactivar.id)}>
                Desactivar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  pageHeader:  { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  pageTitle:   { fontSize: 22, fontWeight: 700 },
  pageSub:     { color: '#6B7280', fontSize: 13, marginTop: 2 },
  btnPrimary:  { padding: '9px 18px', background: '#1E3A5F', color: '#FFF', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnSecondary:{ padding: '9px 18px', background: '#FFF', color: '#374151', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 14, cursor: 'pointer' },
  searchBar:   { marginBottom: 16 },
  searchInput: { width: '100%', maxWidth: 400, padding: '9px 12px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 14 },
  empty:       { padding: 40, textAlign: 'center', color: '#9CA3AF', background: '#FFF', borderRadius: 8, border: '1px solid #E5E7EB' },
  table:       { width: '100%', borderCollapse: 'collapse' },
  th:          { padding: '10px 14px', background: '#F9FAFB', fontSize: 12, fontWeight: 600, color: '#6B7280', textAlign: 'left', borderBottom: '1px solid #E5E7EB' },
  tr:          { borderBottom: '1px solid #F3F4F6' },
  td:          { padding: '10px 14px', fontSize: 14, verticalAlign: 'middle' },
  code:        { fontFamily: 'monospace', fontSize: 12, color: '#6B7280' },
  productName: { display: 'block', fontWeight: 500 },
  productDesc: { display: 'block', fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  badgeIva:    { marginLeft: 6, fontSize: 10, background: '#DBEAFE', color: '#1E40AF', padding: '1px 5px', borderRadius: 4, fontWeight: 600 },
  actions:     { display: 'flex', gap: 6, justifyContent: 'flex-end' },
  btnEdit:     { padding: '4px 10px', background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', borderRadius: 4, fontSize: 12, cursor: 'pointer' },
  btnDelete:   { padding: '4px 10px', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 4, fontSize: 12, cursor: 'pointer' },
  overlay:     { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modalCard:   { background: '#FFF', borderRadius: 10, padding: 28, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' },
  modalTitle:  { fontSize: 18, fontWeight: 700, marginBottom: 20 },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
}
