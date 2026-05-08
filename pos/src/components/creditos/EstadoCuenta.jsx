import { Check } from 'lucide-react'

export default function EstadoCuenta({ estadoCuenta, busqueda, onBuscar, busquedaRef, resultados, creditoSeleccionado, onSeleccionarCredito, detalleVenta, onAbonar, onLimpiar, onSeleccionarCliente }) {
  return (
    <div style={s.estadoWrap}>
      {!estadoCuenta && (
        <div style={s.buscadorWrap}>
          <h3 style={s.buscadorTitulo}>Estado de Cuenta</h3>
          <p style={s.buscadorSub}>Ingresa el folio o nombre del cliente</p>
          <div style={{ position: 'relative' }}>
            <input
              ref={busquedaRef}
              style={s.buscadorInput}
              type="text"
              value={busqueda}
              onChange={e => onBuscar(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && resultados[0] && onSeleccionarCliente(resultados[0])}
              placeholder="Buscar por nombre, teléfono o folio..."
              autoComplete="off"
            />
            {busqueda.trim() && resultados.length > 0 && (
              <div style={s.listaResultados}>
                {resultados.map((c, i) => (
                  <div key={c.id}
                    style={{ ...s.filaCliente, ...(i % 2 === 0 ? {} : { background: '#f9f9f9' }) }}
                    onClick={() => onSeleccionarCliente(c)}
                  >
                    <div style={s.avatar}>{c.nombre.slice(0, 2).toUpperCase()}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#1a1a1a' }}>{c.nombre} {c.apellidos || ''}</div>
                      <div style={{ fontSize: 11, color: '#888' }}>{c.telefono || c.email || `Folio: ${c.id}`}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button style={s.btnAceptar} onClick={() => resultados[0] && onSeleccionarCliente(resultados[0])}>
            <Check size={14} style={{ marginRight: 4 }} />Aceptar
          </button>
        </div>
      )}

      {estadoCuenta && (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <div style={s.panelIzq}>
            <div style={s.clienteHeader}>
              <div style={s.avatarGrande}>{estadoCuenta.cliente.nombre.slice(0, 2).toUpperCase()}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>{estadoCuenta.cliente.nombre}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#1a7a3a' }}>
                  ${parseFloat(estadoCuenta.cliente.saldo_actual).toFixed(2)}
                </div>
                <div style={{ fontSize: 11, color: '#888' }}>
                  Límite: ${parseFloat(estadoCuenta.cliente.limite_credito).toFixed(2)}
                </div>
              </div>
            </div>

            <div style={s.botonesAccion}>
              <button style={s.btnAccion} onClick={onAbonar}>Abonar a deuda</button>
              <button style={s.btnAccion} onClick={onLimpiar}>Nueva búsqueda</button>
            </div>

            <div style={s.tablaWrap}>
              <table style={s.tabla}>
                <thead>
                  <tr>
                    <th style={s.th}>Fecha/Hora</th>
                    <th style={s.th}>Folio</th>
                    <th style={s.th}>Movimiento</th>
                    <th style={{ ...s.th, textAlign: 'right' }}>Monto</th>
                    <th style={{ ...s.th, textAlign: 'right' }}>Saldo</th>
                    <th style={s.th}>Cajero</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ...estadoCuenta.creditos.map(cr => ({ ...cr, _tipo: 'venta' })),
                    ...estadoCuenta.abonos.map(ab => ({ ...ab, _tipo: 'abono' })),
                  ]
                    .sort((a, b) => new Date(a.creado_en) - new Date(b.creado_en))
                    .map(mov => {
                      if (mov._tipo === 'venta') {
                        const activo = creditoSeleccionado?.id === mov.id
                        return (
                          <tr key={`cr-${mov.id}`}
                            style={{ ...s.tr, background: activo ? '#1e5f3a' : '', color: activo ? '#fff' : '', cursor: 'pointer' }}
                            onClick={() => onSeleccionarCredito(mov)}
                          >
                            <td style={s.td}>{new Date(mov.creado_en).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</td>
                            <td style={s.td}>{mov.venta_id}</td>
                            <td style={s.td}><span style={s.badgeVenta}>VENTA</span></td>
                            <td style={{ ...s.td, textAlign: 'right', color: activo ? '#fff' : '#1a7a3a', fontWeight: 700 }}>
                              +${parseFloat(mov.monto_original).toFixed(2)}
                            </td>
                            <td style={{ ...s.td, textAlign: 'right' }}>${parseFloat(mov.saldo_pendiente).toFixed(2)}</td>
                            <td style={s.td}>{mov.cajero || '—'}</td>
                          </tr>
                        )
                      }
                      return (
                        <tr key={`ab-${mov.id}`} style={s.tr}>
                          <td style={s.td}>{new Date(mov.creado_en).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</td>
                          <td style={s.td}>Ab.#{mov.credito_id}</td>
                          <td style={s.td}><span style={s.badgeAbono}>ABONO</span></td>
                          <td style={{ ...s.td, textAlign: 'right', color: '#1d4ed8', fontWeight: 700 }}>
                            -${parseFloat(mov.monto).toFixed(2)}
                          </td>
                          <td style={s.td}>—</td>
                          <td style={s.td}>{mov.cajero || '—'}</td>
                        </tr>
                      )
                    })
                  }
                  {estadoCuenta.creditos.length === 0 && estadoCuenta.abonos.length === 0 && (
                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20, color: '#999' }}>Sin movimientos</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div style={s.panelDer}>
            {detalleVenta ? (
              <>
                <div style={{ marginBottom: 10 }}>
                  <div style={s.detalleLinea}><span>Folio:</span><strong>{detalleVenta.id}</strong></div>
                  <div style={s.detalleLinea}><span>Cajero:</span><span>{detalleVenta.cajero}</span></div>
                  <div style={s.detalleLinea}><span>Cliente:</span><span>{detalleVenta.cliente_nombre}</span></div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                    {new Date(detalleVenta.fecha).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })}
                  </div>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 10 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #ddd' }}>
                      <th style={{ textAlign: 'left', padding: '4px 6px', color: '#1a1a1a' }}>Cant.</th>
                      <th style={{ textAlign: 'left', padding: '4px 6px', color: '#1a1a1a' }}>Descripción</th>
                      <th style={{ textAlign: 'right', padding: '4px 6px', color: '#1a1a1a' }}>Importe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalleVenta.items?.map((item, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '4px 6px', color: '#1a1a1a' }}>{item.cantidad}</td>
                        <td style={{ padding: '4px 6px', color: '#1a1a1a' }}>{item.nombre}</td>
                        <td style={{ padding: '4px 6px', textAlign: 'right', color: '#1a1a1a' }}>${parseFloat(item.subtotal).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={s.detalleLinea}><span>Total:</span><strong>${parseFloat(detalleVenta.total).toFixed(2)}</strong></div>
                <div style={s.detalleLinea}><span>Pago Con:</span><span>Crédito</span></div>
                <div style={{ ...s.detalleLinea, marginTop: 6 }}>
                  <span style={{ fontWeight: 600 }}>Monto Pendiente:</span>
                  <strong style={{ color: '#c02020' }}>${parseFloat(detalleVenta.monto_pendiente).toFixed(2)}</strong>
                </div>
              </>
            ) : (
              <p style={{ color: '#bbb', fontSize: 13, textAlign: 'center', marginTop: 40 }}>
                Selecciona una venta para ver el detalle
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  estadoWrap:   { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' },
  buscadorWrap: { maxWidth: 660, width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'center', flex: 1, padding: 32 },
  buscadorTitulo: { fontSize: 28, fontWeight: 800, textAlign: 'center', marginBottom: 6, color: '#1e3a5f' },
  buscadorSub:  { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 20 },
  buscadorInput:{ width: '100%', padding: '14px 18px', fontSize: 18, border: '2px solid #ccc', borderRadius: 8, boxSizing: 'border-box', outline: 'none', color: '#1a1a1a' },
  listaResultados: { position: 'absolute', left: 0, right: 0, background: '#fff', border: '1px solid #ddd', borderRadius: 4, zIndex: 10, maxHeight: 240, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
  filaCliente:  { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0' },
  avatar:       { width: 36, height: 36, borderRadius: '50%', background: '#1e8040', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 },
  btnAceptar:   { marginTop: 16, width: '100%', padding: 10, background: '#fff', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#1a1a1a' },
  panelIzq:     { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff', borderRadius: 6, marginRight: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  panelDer:     { width: 280, background: '#fff', borderRadius: 6, padding: 14, overflow: 'auto', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', fontSize: 13, color: '#1a1a1a' },
  clienteHeader:{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: '1px solid #eee' },
  avatarGrande: { width: 44, height: 44, borderRadius: '50%', background: '#1e8040', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, flexShrink: 0 },
  botonesAccion:{ display: 'flex', gap: 6, padding: '8px 14px', borderBottom: '1px solid #eee' },
  btnAccion:    { padding: '5px 12px', fontSize: 12, border: '1px solid #ccc', borderRadius: 4, background: '#fff', cursor: 'pointer', color: '#1a1a1a' },
  tablaWrap:    { flex: 1, overflow: 'auto' },
  tabla:        { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th:           { padding: '8px 10px', background: '#f5f5f5', textAlign: 'left', fontWeight: 600, color: '#555', borderBottom: '1px solid #e0e0e0', whiteSpace: 'nowrap' },
  tr:           { borderBottom: '1px solid #f0f0f0' },
  td:           { padding: '8px 10px', verticalAlign: 'middle', color: '#1a1a1a' },
  badgeVenta:   { background: '#1e8040', color: '#fff', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 },
  badgeAbono:   { background: '#1d4ed8', color: '#fff', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 },
  detalleLinea: { display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0', borderBottom: '1px solid #f0f0f0', color: '#1a1a1a' },
}
