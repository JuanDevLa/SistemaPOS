import { RefreshCw, PauseCircle, Trash2, UserPlus, Printer, ClipboardList, Receipt } from 'lucide-react'

export default function ZonaTotales({ total, subtotal, descuentoMonto, nProductos, pagoCon, cambio, onChangePago, onCobrar, onReimprimir, onVentasDia, onCambiarTicket, onPendiente, onEliminar, onAsignarCliente, onDescuento }) {
  return (
    <div className="venta-inferior">

      {/* COLUMNA IZQUIERDA */}
      <div className="venta-inferior-izq">
        <div style={s.contador}>
          <span style={s.contadorNum}>{nProductos}</span>
          <span style={s.contadorTxt}> producto{nProductos !== 1 ? 's' : ''} en la venta actual</span>
        </div>

        <div style={s.botonesIzq}>
          <button className="pos-btn" style={s.btn} tabIndex={-1} title="F5 — Cambiar ticket" onClick={onCambiarTicket}>
            <RefreshCw size={12} strokeWidth={2} /> F5 Cambiar
          </button>
          <button className="pos-btn" style={s.btn} tabIndex={-1} title="F6 — Poner en espera" onClick={onPendiente}>
            <PauseCircle size={12} strokeWidth={2} /> F6 Pendiente
          </button>
          <button className="pos-btn" style={s.btn} tabIndex={-1} title="Eliminar producto seleccionado" onClick={onEliminar}>
            <Trash2 size={12} strokeWidth={2} /> Eliminar
          </button>
          <button className="pos-btn" style={s.btn} tabIndex={-1} title="Asignar cliente a esta venta" onClick={onAsignarCliente}>
            <UserPlus size={12} strokeWidth={2} /> Asignar cliente
          </button>
        </div>

        {descuentoMonto > 0 && (
          <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>
            Subtotal: ${subtotal.toFixed(2)} &nbsp;|&nbsp; Descuento: <span style={{ color: '#c02020' }}>-${descuentoMonto.toFixed(2)}</span>
          </div>
        )}

        <div className="venta-totales-row">
          <span className="venta-totales-label">Total:</span>
          <span className="venta-totales-valor">${total.toFixed(2)}</span>
          <span className="venta-totales-label" style={{ marginLeft: 10 }}>Pagó Con:</span>
          <input
            className="venta-totales-input"
            type="number"
            value={pagoCon}
            onChange={e => onChangePago(e.target.value)}
            placeholder="0.00"
            tabIndex={-1}
          />
          <span className="venta-totales-label" style={{ marginLeft: 10 }}>Cambio:</span>
          <span className="venta-totales-valor" style={{ color: cambio >= 0 ? '#1a7a3a' : '#c02020' }}>
            ${cambio.toFixed(2)}
          </span>
        </div>
      </div>

      {/* COLUMNA DERECHA */}
      <div style={{ display: 'flex', gap: 0 }}>
        <div className="venta-inferior-der">
          <button
            className="pos-btn"
            style={{ padding: '12px 48px', fontSize: '16px', fontWeight: 'bold', width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            onClick={onCobrar}
            disabled={nProductos === 0}
            title="F12 - Cobrar"
          >
            <Receipt size={18} strokeWidth={2} /> F12 - Cobrar
          </button>
          <button
            className="pos-btn"
            style={{ width: '100%', fontSize: 11, padding: '4px 8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
            onClick={onReimprimir}
            tabIndex={-1}
          >
            <Printer size={12} strokeWidth={1.8} /> Reimprimir Último Ticket
          </button>
        </div>

        <div className="venta-inferior-der">
          <div className="precio-grande">${total.toFixed(2)}</div>

          <button
            className="pos-btn"
            style={{ width: '100%', fontSize: 11, padding: '4px 8px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
            onClick={onVentasDia}
            tabIndex={-1}
          >
            <ClipboardList size={12} strokeWidth={1.8} /> Ventas del día y Devoluciones
          </button>
        </div>
      </div>

    </div>
  )
}

const s = {
  contador:    { display: 'flex', alignItems: 'baseline', gap: 3 },
  contadorNum: { fontSize: 22, fontWeight: 800, color: '#2563a8', lineHeight: 1 },
  contadorTxt: { fontSize: 12, color: '#666' },
  botonesIzq:  { display: 'flex', gap: 5, flexWrap: 'wrap' },
  btn:         { padding: '5px 10px', fontSize: 11.5, display: 'inline-flex', alignItems: 'center', gap: 5 }
}
