import { X } from 'lucide-react'

export default function TablaCarrito({ carrito, filaSeleccionada, onSeleccionar, onCambiarCantidad, onQuitarItem }) {
  return (
    <div className="venta-tabla-wrap">
      <table className="pos-table" style={{ tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '13%' }} />
          <col style={{ width: '35%' }} />
          <col style={{ width: '11%' }} />
          <col style={{ width: '10%' }} />
          <col style={{ width: '13%' }} />
          <col style={{ width: '10%' }} />
          <col style={{ width: '8%'  }} />
        </colgroup>
        <thead>
          <tr>
            <th>Cód. Barras</th>
            <th style={{ textAlign: 'left', paddingLeft: 10 }}>Descripción del Producto</th>
            <th>Precio Venta</th>
            <th>Cant.</th>
            <th>Importe</th>
            <th>Existencia</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {carrito.length === 0 ? (
            <tr>
              <td colSpan={7} style={{ padding: '32px 0', color: '#bbb', fontSize: 13 }}>
                Sin productos en la venta
              </td>
            </tr>
          ) : (
            carrito.map(item => {
              const sel = filaSeleccionada === item.producto_id
              const stockBajo = item.stock_actual !== null && item.stock_actual <= 5
              return (
                <tr
                  key={item.producto_id}
                  className={sel ? 'selected' : ''}
                  onClick={() => onSeleccionar(item.producto_id)}
                >
                  <td style={{ fontFamily: 'monospace', fontSize: 11, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.codigo_barras || '—'}
                  </td>
                  <td style={{ textAlign: 'left', paddingLeft: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                    {item.nombre}
                  </td>
                  <td style={{ color: '#1e3a5f', fontWeight: 600 }}>
                    ${item.precio_venta.toFixed(2)}
                  </td>
                  <td style={{ padding: '4px 4px' }}>
                    <span className="input-cantidad" style={{ display: 'block', textAlign: 'center', userSelect: 'none', cursor: 'default' }}>
                      {item.cantidad}
                    </span>
                  </td>
                  <td style={{ color: '#1e8040', fontWeight: 700, paddingRight: 8, textAlign: 'right' }}>
                    ${item.importe.toFixed(2)}
                  </td>
                  <td style={{ color: stockBajo ? '#c02020' : '#777', fontWeight: stockBajo ? 700 : 400 }}>
                    {item.stock_actual !== null ? item.stock_actual : '—'}
                  </td>
                  <td>
                    <button
                      className="pos-btn pos-btn-danger"
                      style={{ padding: '2px 7px', fontSize: 11 }}
                      onClick={e => { e.stopPropagation(); onQuitarItem(item.producto_id) }}
                      tabIndex={-1}
                    >
                      <X size={11} />
                    </button>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
