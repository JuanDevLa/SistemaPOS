import { useState, useRef, useEffect } from 'react'
import { X, Check } from 'lucide-react'
import { api } from '../../api'

export default function ModalDevoluciones({ onCancelar }) {
  const [folio, setFolio] = useState('')
  const [venta, setVenta] = useState(null)
  const [devolucion, setDevolucion] = useState({})
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  const inputFolioRef = useRef()

  useEffect(() => {
    inputFolioRef.current?.focus()
  }, [])

  const buscarVenta = async () => {
    if (!folio.trim()) {
      setError('Ingresa el folio')
      return
    }
    setCargando(true)
    setError('')
    try {
      const res = await api.obtenerVenta(folio)
      if (res && res.items) {
        setVenta(res)
        const devDict = {}
        res.items.forEach(item => {
          devDict[item.producto_id] = 0
        })
        setDevolucion(devDict)
      } else {
        setError('Venta no encontrada')
      }
    } catch (err) {
      setError('Error al buscar venta')
    }
    setCargando(false)
  }

  const handleCantidadDevolucion = (productoId, cantidad) => {
    const item = venta.items.find(i => i.producto_id === productoId)
    const cantidadMax = item ? item.cantidad : 0
    const cantNum = Math.min(Math.max(0, cantidad), cantidadMax)
    setDevolucion(prev => ({ ...prev, [productoId]: cantNum }))
  }

  const procesarDevolucion = async () => {
    const itemsDevueltos = venta.items.filter(item => devolucion[item.producto_id] > 0)
    if (itemsDevueltos.length === 0) {
      setError('Selecciona al menos un producto para devolver')
      return
    }
    setCargando(true)
    try {
      const res = await api.registrarDevolucion({
        venta_id: venta.id,
        items: itemsDevueltos.map(item => ({
          producto_id: item.producto_id,
          cantidad: devolucion[item.producto_id]
        }))
      })
      setExito(`Devolución registrada: ${res.devolucion_id}`)
      setTimeout(() => onCancelar(), 1500)
    } catch(e) {
      setError(e.message)
    }
    setCargando(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !venta) {
      e.preventDefault()
      buscarVenta()
    }
  }

  return (
    <div className="modal-overlay" onClick={onCancelar}>
      <div className="modal-dialog" onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: '600px' }}>
        <div className="modal-header">
          <h3>Devoluciones (CTRL+D)</h3>
          <button className="close-btn" onClick={onCancelar}><X size={16} /></button>
        </div>

        <div className="modal-body">
          {!venta ? (
            <>
              <div className="form-group">
                <label>Folio de Venta</label>
                <input
                  ref={inputFolioRef}
                  type="text"
                  value={folio}
                  onChange={e => setFolio(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ej: V-1234"
                  autoComplete="off"
                  disabled={cargando}
                />
              </div>
              {error && <p style={{ color: '#c02020', fontSize: 12 }}>{error}</p>}
            </>
          ) : (
            <>
              <p style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
                Folio: <strong>{venta.folio}</strong>
              </p>
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', marginBottom: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #ddd' }}>
                    <th style={{ textAlign: 'left', padding: 6 }}>Producto</th>
                    <th style={{ textAlign: 'right', padding: 6 }}>Vendido</th>
                    <th style={{ textAlign: 'right', padding: 6 }}>Devolver</th>
                  </tr>
                </thead>
                <tbody>
                  {venta.items.map(item => (
                    <tr key={item.producto_id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: 6 }}>{item.nombre}</td>
                      <td style={{ textAlign: 'right', padding: 6 }}>{item.cantidad}</td>
                      <td style={{ textAlign: 'right', padding: 6 }}>
                        <input
                          type="number"
                          value={devolucion[item.producto_id] || 0}
                          onChange={e => handleCantidadDevolucion(item.producto_id, parseInt(e.target.value) || 0)}
                          min="0"
                          max={item.cantidad}
                          style={{ width: 50, textAlign: 'center', padding: 4 }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {error && <p style={{ color: '#c02020', fontSize: 12, marginBottom: 8 }}>{error}</p>}
              {exito && <p style={{ color: '#1a7a3a', fontSize: 12, marginBottom: 8 }}>{exito}</p>}
            </>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onCancelar} className="btn-cancel">Cancelar</button>
          {!venta ? (
            <button
              onClick={buscarVenta}
              className="btn-confirm"
              disabled={cargando}
              style={{ opacity: cargando ? 0.5 : 1 }}
            >
              {cargando ? 'Buscando...' : 'Buscar'}
            </button>
          ) : (
            <>
              <button onClick={() => setVenta(null)} className="btn-neutral">Nueva búsqueda</button>
              <button
                onClick={procesarDevolucion}
                className="btn-confirm"
                disabled={cargando}
                style={{ opacity: cargando ? 0.5 : 1 }}
              >
                {cargando ? 'Procesando...' : 'Confirmar devolución'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
