import { useState, useEffect } from 'react'
import { api } from '../../api'

export default function TabHistorialCompras({ usuario }) {
  const [entradas, setEntradas]   = useState([])
  const [cargando, setCargando]   = useState(true)
  const [detalle, setDetalle]     = useState(null)

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    setCargando(true)
    try {
      const res = await api.listarEntradas(usuario.negocio_id)
      setEntradas(Array.isArray(res) ? res : [])
    } catch { setEntradas([]) }
    finally { setCargando(false) }
  }

  const verDetalle = async (id) => {
    setDetalle({ cargando: true })
    try {
      const res = await api.obtenerEntrada(id)
      setDetalle(res)
    } catch { setDetalle(null) }
  }

  const fmt = (fecha) => new Date(fecha).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })

  return (
    <div style={e.shell}>
      <div style={e.toolbar}>
        <span style={e.toolbarTxt}>{entradas.length} entradas registradas</span>
        <button className="pos-btn" style={{ fontSize: 12, padding: '3px 12px' }} onClick={cargar}>
          Actualizar
        </button>
      </div>

      <div style={e.tablaWrap}>
        {cargando ? (
          <div style={e.centro}>Cargando...</div>
        ) : entradas.length === 0 ? (
          <div style={e.centro}>Sin entradas registradas.</div>
        ) : (
          <table style={e.tabla}>
            <thead>
              <tr>
                <th style={{ ...e.th, width: 50 }}>#</th>
                <th style={{ ...e.th, width: 160 }}>Fecha</th>
                <th style={{ ...e.th, textAlign: 'left' }}>Proveedor</th>
                <th style={{ ...e.th, width: 120 }}>Recibio</th>
                <th style={{ ...e.th, width: 80 }}>Productos</th>
                <th style={{ ...e.th, width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {entradas.map((en, i) => (
                <tr key={en.id} style={i % 2 === 1 ? e.trImpar : undefined}>
                  <td style={{ ...e.td, fontFamily: 'monospace', color: '#888' }}>#{en.id}</td>
                  <td style={{ ...e.td, fontSize: 11 }}>{fmt(en.fecha)}</td>
                  <td style={{ ...e.td, textAlign: 'left', fontWeight: 600 }}>{en.proveedor}</td>
                  <td style={{ ...e.td, color: '#666' }}>{en.recibio}</td>
                  <td style={{ ...e.td, textAlign: 'center' }}>{en.total_productos}</td>
                  <td style={e.td}>
                    <button className="pos-btn" style={{ padding: '2px 8px', fontSize: 11 }} onClick={() => verDetalle(en.id)}>
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal detalle */}
      {detalle && (
        <div style={e.overlay}>
          <div style={e.modal}>
            {detalle.cargando ? (
              <div style={e.centro}>Cargando...</div>
            ) : (
              <>
                <div style={e.modalHeader}>
                  <div>
                    <strong style={{ color: '#1a1a1a' }}>Entrada #{detalle.id}</strong>
                    <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                      {fmt(detalle.fecha)} · {detalle.proveedor} · Recibio: {detalle.recibio}
                    </div>
                  </div>
                  <button className="pos-btn" style={{ padding: '2px 8px' }} onClick={() => setDetalle(null)}>✕</button>
                </div>

                {(!detalle.items || detalle.items.length === 0) ? (
                  <div style={e.centro}>Sin productos registrados</div>
                ) : (() => {
                  const tieneCostos = detalle.items.some(it => it.costo_unitario)
                  const totalEntrada = tieneCostos
                    ? detalle.items.reduce((s, it) => s + (it.costo_unitario ? parseFloat(it.cantidad) * parseFloat(it.costo_unitario) : 0), 0)
                    : null
                  return (
                    <>
                      <table style={e.tabla}>
                        <thead>
                          <tr>
                            <th style={{ ...e.th, textAlign: 'left' }}>Producto</th>
                            <th style={{ ...e.th, width: 60 }}>Unidad</th>
                            <th style={{ ...e.th, width: 60 }}>Cant.</th>
                            <th style={{ ...e.th, width: 90 }}>Precio venta</th>
                            {tieneCostos && <th style={{ ...e.th, width: 90 }}>Costo unit.</th>}
                            {tieneCostos && <th style={{ ...e.th, width: 90 }}>Subtotal</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {detalle.items.map((it, i) => (
                            <tr key={i} style={i % 2 === 1 ? e.trImpar : undefined}>
                              <td style={{ ...e.td, textAlign: 'left', fontWeight: 600, color: '#1a1a1a' }}>{it.nombre}</td>
                              <td style={{ ...e.td, color: '#888' }}>{it.unidad || '—'}</td>
                              <td style={{ ...e.td, fontWeight: 700 }}>{parseFloat(it.cantidad)}</td>
                              <td style={{ ...e.td, color: '#1E3A5F' }}>
                                {it.precio_venta ? `$${parseFloat(it.precio_venta).toFixed(2)}` : '—'}
                              </td>
                              {tieneCostos && <td style={e.td}>{it.costo_unitario ? `$${parseFloat(it.costo_unitario).toFixed(2)}` : '—'}</td>}
                              {tieneCostos && <td style={{ ...e.td, fontWeight: 600 }}>
                                {it.costo_unitario ? `$${(parseFloat(it.cantidad) * parseFloat(it.costo_unitario)).toFixed(2)}` : '—'}
                              </td>}
                            </tr>
                          ))}
                        </tbody>
                        {tieneCostos && totalEntrada !== null && (
                          <tfoot>
                            <tr style={{ borderTop: '2px solid #e0e0e0' }}>
                              <td colSpan={tieneCostos ? 5 : 4} style={{ ...e.td, color: '#666', fontWeight: 700 }}>Total entrada</td>
                              <td style={{ ...e.td, fontWeight: 700, color: '#1E3A5F', fontSize: 14 }}>
                                ${totalEntrada.toFixed(2)}
                              </td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                      {detalle.notas && (
                        <p style={{ padding: '10px 12px', fontSize: 12, color: '#666', margin: 0 }}>
                          Notas: {detalle.notas}
                        </p>
                      )}
                    </>
                  )
                })()}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const e = {
  shell:       { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', background: '#fff', color: '#1a1a1a' },
  toolbar:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 14px', borderBottom: '1px solid #e0e0e0', background: '#fafaf8' },
  toolbarTxt:  { fontSize: 13, fontWeight: 600, color: '#333' },
  tablaWrap:   { flex: 1, overflowY: 'auto' },
  tabla:       { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th:          { padding: '4px 8px', background: '#f0ede5', color: '#333', fontWeight: 600, textAlign: 'center', borderBottom: '2px solid #d8d0c0', position: 'sticky', top: 0, zIndex: 1 },
  td:          { padding: '4px 8px', color: '#1a1a1a', borderBottom: '1px solid #eee', textAlign: 'center' },
  trImpar:     { background: '#fffff0' },
  centro:      { padding: 30, textAlign: 'center', color: '#999', fontSize: 13 },
  overlay:     { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  modal:       { background: '#fff', borderRadius: 6, width: 580, maxHeight: '80vh', overflow: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '12px 14px', borderBottom: '1px solid #e0e0e0' },
}
