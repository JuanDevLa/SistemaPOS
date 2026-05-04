import { useState, useRef, useEffect } from 'react'
import { X, Check } from 'lucide-react'

export default function ModalMayoreo({ carrito, onAplicarMayoreo, onCerrar }) {
  const [tipoDescuento, setTipoDescuento] = useState('porcentaje') // 'porcentaje' | 'monto'
  const [porcentajeDesc, setPorcentajeDesc] = useState('10')
  const [montoDesc, setMontoDesc] = useState('')
  const [productoSeleccionado, setProductoSeleccionado] = useState(null)
  const [aplicarATodos, setAplicarATodos] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef()

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const calcularPrecioMayoreo = (precio, descuento) => {
    return precio * (1 - descuento / 100)
  }

  const calcularTotalCarrito = () => {
    return carrito.reduce((sum, item) => sum + item.importe, 0)
  }

  const aplicar = () => {
    let desc = 0

    if (tipoDescuento === 'porcentaje') {
      desc = parseFloat(porcentajeDesc) || 0
      if (desc < 0 || desc > 100) {
        setError('Descuento debe estar entre 0 y 100%')
        return
      }
    } else {
      const monto = parseFloat(montoDesc) || 0
      const total = calcularTotalCarrito()
      if (monto < 0 || monto > total) {
        setError(`Monto debe estar entre $0 y $${total.toFixed(2)}`)
        return
      }
      desc = (monto / total) * 100
    }

    onAplicarMayoreo(desc, aplicarATodos ? null : productoSeleccionado)
    onCerrar()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      aplicar()
    }
  }

  const hayProductos = carrito && carrito.length > 0

  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal-dialog" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Mayoreo - Descuento (F11)</h3>
          <button className="close-btn" onClick={onCerrar}><X size={16} /></button>
        </div>

        <div className="modal-body">
          {!hayProductos ? (
            <p className="error-msg">No hay productos en el carrito</p>
          ) : (
            <>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', flex: 1 }}>
                  <input
                    type="radio"
                    checked={tipoDescuento === 'porcentaje'}
                    onChange={() => setTipoDescuento('porcentaje')}
                  />
                  <span>Por %</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', flex: 1 }}>
                  <input
                    type="radio"
                    checked={tipoDescuento === 'monto'}
                    onChange={() => setTipoDescuento('monto')}
                  />
                  <span>Por monto ($)</span>
                </label>
              </div>

              <div className="form-group">
                <label>{tipoDescuento === 'porcentaje' ? 'Descuento (%)' : 'Descuento ($)'}</label>
                <input
                  ref={inputRef}
                  type="number"
                  value={tipoDescuento === 'porcentaje' ? porcentajeDesc : montoDesc}
                  onChange={e => tipoDescuento === 'porcentaje' ? setPorcentajeDesc(e.target.value) : setMontoDesc(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={tipoDescuento === 'porcentaje' ? '10' : '0.00'}
                  min="0"
                  step={tipoDescuento === 'porcentaje' ? '0.5' : '0.01'}
                  autoComplete="off"
                />
                <p style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                  {tipoDescuento === 'porcentaje' ? 'Ejemplo: 10% de descuento' : `Total: $${calcularTotalCarrito().toFixed(2)}`}
                </p>
              </div>

              <div style={{ marginTop: '16px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={aplicarATodos}
                      onChange={e => {
                        setAplicarATodos(e.target.checked)
                        setProductoSeleccionado(null)
                      }}
                    />
                    <span style={{ fontSize: '13px', fontWeight: '600' }}>Aplicar a TODO el carrito</span>
                  </label>
                </div>

                {!aplicarATodos && carrito.length > 0 && (
                  <div className="form-group">
                    <label>Producto específico</label>
                    <select
                      value={productoSeleccionado || ''}
                      onChange={e => setProductoSeleccionado(e.target.value || null)}
                      style={{
                        padding: '6px 8px',
                        border: '1px solid #c0c0c0',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontFamily: 'inherit'
                      }}
                    >
                      {carrito.map(item => (
                        <option key={item.producto_id} value={item.producto_id}>
                          {item.nombre} - ${item.precio_venta.toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {(tipoDescuento === 'porcentaje' ? porcentajeDesc : montoDesc) && (
                <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#e0f2fe', borderRadius: '4px' }}>
                  <p style={{ fontSize: '12px', margin: '0' }}>
                    <strong>Vista previa:</strong> {tipoDescuento === 'porcentaje' ? `${porcentajeDesc}% de descuento` : `$${montoDesc} de descuento`}
                  </p>
                </div>
              )}

              {error && <p className="error-msg">{error}</p>}
            </>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onCerrar} className="btn-cancel">Cancelar</button>
          <button
            onClick={aplicar}
            className="btn-confirm"
            disabled={!hayProductos}
            style={{ opacity: !hayProductos ? 0.5 : 1 }}
          >
            {tipoDescuento === 'porcentaje' ? `Aplicar ${porcentajeDesc || '0'}% descuento` : `Aplicar $${montoDesc || '0.00'} descuento`}
          </button>
        </div>
      </div>
    </div>
  )
}
