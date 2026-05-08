import { useState, useRef, useEffect, useMemo } from 'react'
import { X } from 'lucide-react'
import { api } from '../../api'

// Default y aviso según el método de pago original. Editable siempre — esto solo
// afecta el valor pre-llenado y la nota informativa al cajero.
const AVISOS_METODO = {
  efectivo:      { defaultMonto: 'total',   nota: '' },
  tarjeta:       { defaultMonto: 'cero',    nota: 'Pagado con tarjeta — el reembolso a la tarjeta debe procesarse desde la app de Mercado Pago.' },
  mixto:         { defaultMonto: 'total',   nota: 'Venta mixta (efectivo + tarjeta) — captura solo el monto que devuelves en efectivo.' },
  transferencia: { defaultMonto: 'cero',    nota: 'Pagado por transferencia — el reembolso debe hacerse por el banco, no en efectivo.' },
  credito:       { defaultMonto: 'cero',    nota: 'Venta a crédito — ajusta el saldo del cliente manualmente, no se devuelve efectivo.' },
}

// Redondeo seguro a 2 decimales para evitar 0.30000000000000004 de IEEE-754.
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100

export default function ModalDevoluciones({ onCancelar }) {
  const [folio, setFolio] = useState('')
  const [venta, setVenta] = useState(null)
  const [devolucion, setDevolucion] = useState({})
  const [montoEfectivoDevuelto, setMontoEfectivoDevuelto] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  const inputFolioRef = useRef()

  useEffect(() => { inputFolioRef.current?.focus() }, [])

  // Total real a reembolsar: usa subtotal/cantidad por item para respetar descuentos por línea.
  // Redondea al final para evitar acumulación de errores de punto flotante.
  const totalReembolsar = useMemo(() => {
    if (!venta) return 0
    let acc = 0
    for (const item of venta.items) {
      const cantDev = parseFloat(devolucion[item.producto_id]) || 0
      if (cantDev <= 0) continue
      const cantVendida = parseFloat(item.cantidad) || 0
      const subtotal   = parseFloat(item.subtotal) || 0
      if (cantVendida <= 0) continue
      acc += (subtotal / cantVendida) * cantDev
    }
    return round2(acc)
  }, [venta, devolucion])

  // Pre-llenar el monto en efectivo según el método de pago original cada vez que
  // cambia el total a reembolsar.
  useEffect(() => {
    if (!venta) return
    const cfg = AVISOS_METODO[venta.metodo_pago] || AVISOS_METODO.efectivo
    const valor = cfg.defaultMonto === 'total' ? totalReembolsar : 0
    setMontoEfectivoDevuelto(valor > 0 ? valor.toFixed(2) : '')
  }, [venta, totalReembolsar])

  const buscarVenta = async () => {
    if (!folio.trim()) { setError('Ingresa el folio'); return }
    setCargando(true); setError('')
    try {
      const res = await api.obtenerVenta(folio)
      if (res && res.items) {
        setVenta(res)
        const devDict = {}
        res.items.forEach(item => { devDict[item.producto_id] = 0 })
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
    const cantidadMax = item ? parseFloat(item.cantidad) : 0
    const cantNum = Math.min(Math.max(0, cantidad), cantidadMax)
    setDevolucion(prev => ({ ...prev, [productoId]: cantNum }))
  }

  const procesarDevolucion = async () => {
    const itemsDevueltos = venta.items.filter(item => devolucion[item.producto_id] > 0)
    if (itemsDevueltos.length === 0) {
      setError('Selecciona al menos un producto para devolver')
      return
    }

    const montoNum = round2(parseFloat(montoEfectivoDevuelto) || 0)
    if (montoNum < 0) {
      setError('El monto no puede ser negativo')
      return
    }
    if (montoNum > totalReembolsar) {
      setError(`El monto en efectivo (${montoNum.toFixed(2)}) excede el total a reembolsar (${totalReembolsar.toFixed(2)})`)
      return
    }

    setCargando(true); setError('')
    try {
      const res = await api.registrarDevolucion({
        venta_id: venta.id,
        monto_efectivo_devuelto: montoNum,
        items: itemsDevueltos.map(item => ({
          producto_id: item.producto_id,
          cantidad: devolucion[item.producto_id]
        }))
      })
      setExito(`Devolución registrada (#${res.devolucion_id})${montoNum > 0 ? ` — entregar $${montoNum.toFixed(2)} en efectivo al cliente` : ''}`)
      setTimeout(() => onCancelar(), 1800)
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

  const aviso = venta ? (AVISOS_METODO[venta.metodo_pago] || AVISOS_METODO.efectivo).nota : ''

  return (
    <div className="modal-overlay" onClick={onCancelar}>
      <div className="modal-dialog" onClick={e => e.stopPropagation()} style={{ width: '90%', maxWidth: '640px' }}>
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
              <p style={{ fontSize: 12, color: '#1a1a1a', marginBottom: 12 }}>
                Folio: <strong>{venta.folio}</strong>
                {venta.metodo_pago && <> · Pago original: <strong style={{ textTransform: 'capitalize' }}>{venta.metodo_pago}</strong></>}
              </p>

              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', marginBottom: 12, color: '#1a1a1a' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #ddd' }}>
                    <th style={{ textAlign: 'left',  padding: 6 }}>Producto</th>
                    <th style={{ textAlign: 'right', padding: 6 }}>P. unit.</th>
                    <th style={{ textAlign: 'right', padding: 6 }}>Vendido</th>
                    <th style={{ textAlign: 'right', padding: 6 }}>Devolver</th>
                  </tr>
                </thead>
                <tbody>
                  {venta.items.map(item => {
                    const cant = parseFloat(item.cantidad) || 0
                    const sub  = parseFloat(item.subtotal) || 0
                    const precioReal = cant > 0 ? round2(sub / cant) : 0
                    return (
                      <tr key={item.producto_id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: 6 }}>{item.nombre}</td>
                        <td style={{ textAlign: 'right', padding: 6 }}>${precioReal.toFixed(2)}</td>
                        <td style={{ textAlign: 'right', padding: 6 }}>{item.cantidad}</td>
                        <td style={{ textAlign: 'right', padding: 6 }}>
                          <input
                            type="number"
                            value={devolucion[item.producto_id] || 0}
                            onChange={e => handleCantidadDevolucion(item.producto_id, parseFloat(e.target.value) || 0)}
                            min="0"
                            max={item.cantidad}
                            step="any"
                            style={{ width: 60, textAlign: 'center', padding: 4 }}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Total a reembolsar */}
              <div style={{ background: '#f7f9fc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '10px 12px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: '#1a1a1a' }}>Total a reembolsar:</span>
                <span style={{ fontWeight: 700, fontSize: 16, color: '#1a7a3a' }}>${totalReembolsar.toFixed(2)}</span>
              </div>

              {/* Monto en efectivo a devolver — registra salida de caja */}
              <div className="form-group" style={{ marginBottom: 8 }}>
                <label style={{ fontWeight: 600, fontSize: 12, color: '#1a1a1a' }}>Monto en efectivo a devolver al cliente</label>
                <input
                  type="number"
                  value={montoEfectivoDevuelto}
                  onChange={e => setMontoEfectivoDevuelto(e.target.value)}
                  min="0"
                  max={totalReembolsar}
                  step="0.01"
                  placeholder="0.00"
                  style={{ width: '100%', padding: 8, fontSize: 14, color: '#1a1a1a' }}
                />
                <p style={{ fontSize: 11, color: '#555', marginTop: 4, marginBottom: 0 }}>
                  Este monto se registrará como salida de caja. Déjalo en 0 si no entregas efectivo al cliente.
                </p>
              </div>

              {aviso && (
                <p style={{ fontSize: 12, color: '#7a5a00', background: '#fff8dc', border: '1px solid #f0d97f', padding: '8px 10px', borderRadius: 4, marginBottom: 8 }}>
                  ⓘ {aviso}
                </p>
              )}

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
              <button onClick={() => { setVenta(null); setDevolucion({}); setMontoEfectivoDevuelto(''); setError(''); setExito('') }} className="btn-neutral">Nueva búsqueda</button>
              <button
                onClick={procesarDevolucion}
                className="btn-confirm"
                disabled={cargando || totalReembolsar <= 0}
                style={{ opacity: (cargando || totalReembolsar <= 0) ? 0.5 : 1 }}
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
