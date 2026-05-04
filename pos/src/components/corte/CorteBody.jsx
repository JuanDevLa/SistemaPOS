import SeccionLista from './SeccionLista'

// Réplica del cuerpo del corte estilo eleventa (2 columnas + secciones inferiores).
// Recibe el snapshot calculado por GET /cortes/snapshot.
export default function CorteBody({ snapshot }) {
  if (!snapshot) {
    return <div style={{ padding: 30, color: '#6B7280' }}>Sin datos del corte.</div>
  }

  const num = (n) => `$${parseFloat(n || 0).toFixed(2)}`

  // Helpers para extraer ventas por método (bloque "Dinero en Caja" y "Ventas")
  const metodos = snapshot.ventas_por_metodo || []
  const porMetodo = (m) => {
    const row = metodos.find(x => x.metodo_pago === m)
    return row ? parseFloat(row.total) : 0
  }
  const ventasEfectivo = snapshot.ventas_efectivo || 0
  const tarjeta        = porMetodo('tarjeta')
  const transferencia  = porMetodo('transferencia')
  const cheque         = porMetodo('cheque')
  const vales          = porMetodo('vales')
  const credito        = porMetodo('credito')

  // Movimientos
  const entradas = (snapshot.movimientos_caja || []).filter(m => m.tipo === 'entrada')
  const salidas  = (snapshot.movimientos_caja || []).filter(m => m.tipo === 'salida')
  const totalEntradas = entradas.reduce((s, m) => s + parseFloat(m.monto), 0)
  const totalSalidas  = salidas.reduce((s, m) => s + parseFloat(m.monto), 0)

  // Devoluciones
  const devs = snapshot.devoluciones || []
  const devolucionesEfectivo = devs.find(d => d.metodo_pago === 'efectivo')?.total || 0
  const totalDevoluciones    = devs.reduce((s, d) => s + parseFloat(d.total || 0), 0)

  // Abonos
  const abonosEfectivo = (snapshot.abonos || [])
    .filter(a => (a.metodo_pago || 'efectivo') === 'efectivo')
    .reduce((s, a) => s + parseFloat(a.monto), 0)
  const totalAbonos = (snapshot.abonos || []).reduce((s, a) => s + parseFloat(a.monto), 0)

  // Dinero en caja (estilo eleventa)
  const dineroEnCaja =
    parseFloat(snapshot.efectivo_inicial || 0) +
    parseFloat(ventasEfectivo) +
    parseFloat(abonosEfectivo) +
    totalEntradas -
    totalSalidas -
    parseFloat(devolucionesEfectivo)

  return (
    <div style={s.body}>
      {/* Cabecera totales */}
      <div style={s.gridCabecera}>
        <div style={s.tarjetaTotal}>
          <div style={s.tituloTotal}>Ventas Totales</div>
          <div style={s.montoTotal}>{num(snapshot.total_ventas)}</div>
        </div>
        <div style={s.tarjetaTotal}>
          <div style={s.tituloTotal}>Ganancia</div>
          <div style={{ ...s.montoTotal, color: '#15803D' }}>{num(snapshot.ganancia)}</div>
        </div>
      </div>

      {/* 2 columnas */}
      <div style={s.dosColumnas}>
        <div>
          <SeccionLista
            titulo="Dinero en Caja"
            filas={[
              { label: 'Fondo de caja',          monto: snapshot.efectivo_inicial },
              { label: 'Ventas en Efectivo',     monto: ventasEfectivo,       signo: '+ ', color: '#15803D' },
              { label: 'Abonos en efectivo',     monto: abonosEfectivo,       signo: '+ ', color: '#15803D' },
              { label: 'Entradas',               monto: totalEntradas,        signo: '+ ', color: '#15803D' },
              { label: 'Salidas',                monto: totalSalidas,         signo: '- ', color: '#DC2626' },
              { label: 'Devoluciones en efectivo', monto: devolucionesEfectivo, signo: '- ', color: '#DC2626' },
            ]}
            total={dineroEnCaja}
          />

          <SeccionLista
            titulo="Entradas de efectivo"
            filas={entradas.map(e => ({ label: e.motivo || 'Entrada', monto: e.monto, signo: '+ ', color: '#15803D' }))}
            vacio="— No hubo Entradas en Efectivo —"
          />

          <SeccionLista
            titulo="Ventas por Departamento"
            filas={(snapshot.ventas_por_departamento || []).map(d => ({ label: d.departamento, monto: d.total }))}
            vacio="— No se registró ninguna venta —"
          />

          <SeccionLista
            titulo="Impuestos"
            filas={parseFloat(snapshot.impuestos || 0) > 0 ? [{ label: 'IVA', monto: snapshot.impuestos }] : []}
            vacio="— No hubo impuestos —"
          />
        </div>

        <div>
          <SeccionLista
            titulo="Ventas"
            filas={[
              { label: 'En Efectivo',           monto: ventasEfectivo,    signo: '+ ', color: '#15803D' },
              { label: 'Con Tarjeta de Crédito',monto: tarjeta,           signo: '+ ', color: '#15803D' },
              { label: 'Con Vales de Despensa', monto: vales,             signo: '+ ', color: '#15803D' },
              { label: 'Con Transferencia',     monto: transferencia,     signo: '+ ', color: '#15803D' },
              { label: 'Con Cheque',            monto: cheque,            signo: '+ ', color: '#15803D' },
              { label: 'A Crédito',             monto: credito,           signo: '+ ', color: '#15803D' },
              { label: 'Devoluciones de Ventas',monto: totalDevoluciones, signo: '- ', color: '#DC2626' },
            ]}
            total={snapshot.total_ventas}
          />

          <SeccionLista
            titulo="Ingresos de contado"
            filas={[]}
            vacio="— No hubo ingresos de contado —"
          />

          <SeccionLista
            titulo="Salidas de Efectivo"
            filas={salidas.map(e => ({ label: e.motivo || 'Salida', monto: e.monto, signo: '- ', color: '#DC2626' }))}
            vacio="— No hubo Salidas en Efectivo —"
          />

          <SeccionLista
            titulo="Pagos de Créditos"
            filas={(snapshot.abonos || []).map(a => ({ label: a.cliente || 'Cliente', monto: a.monto, signo: '+ ', color: '#15803D' }))}
            vacio="— No se recibieron pagos de crédito —"
            total={totalAbonos > 0 ? totalAbonos : undefined}
          />

          <SeccionLista
            titulo="Clientes con más ventas"
            filas={(snapshot.top_clientes_ventas || []).map(c => ({ label: c.nombre, monto: c.total }))}
            vacio="— No hubo ventas a clientes —"
          />

          <SeccionLista
            titulo="Clientes con más ganancia"
            filas={(snapshot.top_clientes_ganancia || []).map(c => ({ label: c.nombre, monto: c.ganancia }))}
            vacio="— No hubo ganancias por cliente —"
          />
        </div>
      </div>
    </div>
  )
}

const s = {
  body: { padding: '20px 24px', color: '#1a1a1a' },
  gridCabecera: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 },
  tarjetaTotal: { background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 8, padding: '12px 18px' },
  tituloTotal: { fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  montoTotal:  { fontSize: 22, fontWeight: 800, color: '#1E3A5F', marginTop: 4 },
  dosColumnas: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 },
}
