import { X } from 'lucide-react'

export default function ModalAlertasStock({ productosBaros, onClose, onIrAStock }) {
  if (!productosBaros || productosBaros.length === 0) {
    return (
      <div style={e.overlay} onClick={onClose}>
        <div style={e.modal} onClick={ev => ev.stopPropagation()}>
          <div style={e.header}>
            <div style={e.titulo}>⚠️ Sin Alertas de Stock</div>
            <button style={e.btnCerrar} onClick={onClose}><X size={18} /></button>
          </div>
          <div style={e.contenido}>
            <p style={{ color: '#666', textAlign: 'center' }}>Todos los productos tienen stock suficiente.</p>
          </div>
        </div>
      </div>
    )
  }

  const handleVerStock = () => {
    onClose()
    onIrAStock?.()
  }

  return (
    <div style={e.overlay} onClick={onClose}>
      <div style={e.modal} onClick={ev => ev.stopPropagation()}>
        <div style={e.header}>
          <div style={e.titulo}>⚠️ Productos con Stock Bajo</div>
          <button style={e.btnCerrar} onClick={onClose}><X size={18} /></button>
        </div>

        <div style={e.contenido}>
          <div style={e.stats}>
            <div style={e.stat}>
              <div style={e.statNum}>{productosBaros.length}</div>
              <div style={e.statLabel}>Productos</div>
            </div>
          </div>

          <div style={e.tabla}>
            <table style={e.tablaElement}>
              <thead>
                <tr style={e.thead}>
                  <th style={{ ...e.th, textAlign: 'left' }}>Producto</th>
                  <th style={e.th}>Departamento</th>
                  <th style={e.th}>Existencia</th>
                  <th style={e.th}>Mínimo</th>
                  <th style={e.th}>Faltante</th>
                </tr>
              </thead>
              <tbody>
                {productosBaros.map((p, idx) => {
                  const faltante = Math.max(0, p.alerta_minima - p.cantidad)
                  return (
                    <tr key={p.producto_id} style={{ background: idx % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                      <td style={{ ...e.td, textAlign: 'left', fontWeight: 500, color: '#1a1a1a' }}>{p.nombre}</td>
                      <td style={{ ...e.td, color: '#666', fontSize: 12 }}>{p.departamento || '—'}</td>
                      <td style={{ ...e.td, fontWeight: 700, color: '#c02020' }}>{p.cantidad}</td>
                      <td style={{ ...e.td, color: '#666' }}>{p.alerta_minima}</td>
                      <td style={{ ...e.td, fontWeight: 700, color: '#e07000' }}>-{faltante}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div style={e.footer}>
          <button style={e.btnCancelar} onClick={onClose}>
            Cerrar
          </button>
          <button className="pos-btn pos-btn-primary" style={e.btnVer} onClick={handleVerStock}>
            Ver Stock Bajo
          </button>
        </div>
      </div>
    </div>
  )
}

const e = {
  overlay:       { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
  modal:         { background: '#fff', borderRadius: 6, boxShadow: '0 10px 40px rgba(0,0,0,0.2)', maxWidth: 600, width: '90%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' },
  header:        { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #e0e0e0', flexShrink: 0 },
  titulo:        { fontSize: 16, fontWeight: 700, color: '#c02020' },
  btnCerrar:     { background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#666', display: 'flex', alignItems: 'center' },
  contenido:     { flex: 1, overflow: 'auto', padding: '16px 20px' },
  stats:         { display: 'flex', gap: 16, marginBottom: 16 },
  stat:          { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 20px', background: '#fff3cd', borderRadius: 6 },
  statNum:       { fontSize: 28, fontWeight: 800, color: '#e07000' },
  statLabel:     { fontSize: 12, color: '#666', marginTop: 4 },
  tabla:         { overflow: 'auto' },
  tablaElement:  { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  thead:         { background: '#f0f0f0' },
  th:            { padding: '8px 10px', textAlign: 'center', fontWeight: 600, color: '#333', borderBottom: '1px solid #e0e0e0' },
  td:            { padding: '8px 10px', borderBottom: '1px solid #eee', textAlign: 'center' },
  footer:        { display: 'flex', gap: 8, padding: '12px 20px', borderTop: '1px solid #e0e0e0', justifyContent: 'flex-end', flexShrink: 0 },
  btnCancelar:   { fontSize: 13, padding: '6px 16px', background: '#fff', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer', color: '#333' },
  btnVer:        { fontSize: 13, padding: '6px 16px' },
}
