import * as XLSX from 'xlsx'

const NEGOCIOS = {
  1: 'Farmacia Noriega',
  2: 'Crucero Independencia',
}

const formatFecha = (date) => new Date(date).toLocaleDateString('es-MX')
const formatHora = (date) => new Date(date).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
const formatFechaHora = (date) => new Date(date).toLocaleString('es-MX')

export function exportarVentas(ventas, negocioId, fechaInicio, fechaFin) {
  if (!ventas || ventas.length === 0) {
    alert('No hay ventas para exportar')
    return
  }

  const datos = ventas.map(v => ({
    '#ID': v.id,
    'Fecha': formatFecha(v.fecha),
    'Hora': formatHora(v.fecha),
    'Cajero': v.cajero,
    'Método de pago': v.metodo_pago,
    'Total': parseFloat(v.total).toFixed(2),
  }))

  const ws = XLSX.utils.json_to_sheet(datos)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Ventas')

  const hoy = new Date().toISOString().split('T')[0]
  XLSX.writeFile(wb, `Ventas_${NEGOCIOS[negocioId]}_${hoy}.xlsx`)
}

export function exportarInventario(inventario, negocioId) {
  if (!inventario || inventario.length === 0) {
    alert('No hay inventario para exportar')
    return
  }

  const datos = inventario.map(item => {
    const bajo = parseFloat(item.cantidad) <= parseFloat(item.alerta_minima)
    return {
      'Código': item.codigo_barras || '—',
      'Nombre': item.nombre,
      'Categoría': item.categoria || '—',
      'Unidad': item.unidad,
      'Precio': parseFloat(item.precio).toFixed(2),
      'Stock': parseFloat(item.cantidad),
      'Alerta mínima': parseFloat(item.alerta_minima),
      'Estado': bajo ? 'Stock bajo' : 'OK',
    }
  })

  const ws = XLSX.utils.json_to_sheet(datos)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Inventario')

  const hoy = new Date().toISOString().split('T')[0]
  XLSX.writeFile(wb, `Inventario_${NEGOCIOS[negocioId]}_${hoy}.xlsx`)
}

export function exportarCortes(cortes, negocioId) {
  if (!cortes || cortes.length === 0) {
    alert('No hay cortes para exportar')
    return
  }

  const datos = cortes.map(c => ({
    '#ID': c.id,
    'Cajero': c.cajero,
    'Apertura': formatFechaHora(c.apertura),
    'Cierre': c.cierre ? formatFechaHora(c.cierre) : '—',
    'Efectivo inicial': parseFloat(c.efectivo_inicial).toFixed(2),
    'Efectivo esperado': c.efectivo_esperado ? parseFloat(c.efectivo_esperado).toFixed(2) : '—',
    'Efectivo contado': c.efectivo_contado ? parseFloat(c.efectivo_contado).toFixed(2) : '—',
    'Diferencia': c.diferencia ? parseFloat(c.diferencia).toFixed(2) : '—',
    'Estado': c.estado,
  }))

  const ws = XLSX.utils.json_to_sheet(datos)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Cortes')

  const hoy = new Date().toISOString().split('T')[0]
  XLSX.writeFile(wb, `Cortes_${NEGOCIOS[negocioId]}_${hoy}.xlsx`)
}

export function exportarMovimientos(movimientos, negocioId) {
  if (!movimientos || movimientos.length === 0) {
    alert('No hay movimientos para exportar')
    return
  }

  const datos = movimientos.map(m => ({
    '#ID': m.id,
    'Fecha': formatFecha(m.creado_en),
    'Hora': formatHora(m.creado_en),
    'Producto': m.producto,
    'Tipo': m.tipo,
    'Cantidad': parseFloat(m.cantidad),
    'Usuario': m.usuario || '—',
    'Notas': m.notas || '—',
  }))

  const ws = XLSX.utils.json_to_sheet(datos)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Movimientos')

  const hoy = new Date().toISOString().split('T')[0]
  XLSX.writeFile(wb, `Movimientos_${NEGOCIOS[negocioId]}_${hoy}.xlsx`)
}

export function exportarReporte(data, negocioId, fechaInicio, fechaFin) {
  if (!data) return
  const wb = XLSX.utils.book_new()
  const negocio = NEGOCIOS[negocioId] || `Negocio ${negocioId}`

  // Resumen
  const resumenData = [
    { Métrica: 'Período', Valor: `${fechaInicio} — ${fechaFin}` },
    { Métrica: 'Negocio', Valor: negocio },
    { Métrica: 'Total vendido', Valor: data.resumen.total.toFixed(2) },
    { Métrica: 'Transacciones', Valor: data.resumen.num_ventas },
    { Métrica: 'Ticket promedio', Valor: data.resumen.ticket_promedio.toFixed(2) },
    { Métrica: 'Descuentos', Valor: data.resumen.descuentos.toFixed(2) },
    { Métrica: 'IVA', Valor: data.resumen.iva.toFixed(2) },
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumenData), 'Resumen')

  // Por método
  if (data.por_metodo?.length > 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      data.por_metodo.map(m => ({ Método: m.metodo, Ventas: m.num_ventas, Total: m.total.toFixed(2) }))
    ), 'Por método')
  }

  // Por cajero
  if (data.por_cajero?.length > 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      data.por_cajero.map(c => ({ Cajero: c.cajero, Ventas: c.num_ventas, Total: c.total.toFixed(2) }))
    ), 'Por cajero')
  }

  // Por departamento
  if (data.por_departamento?.length > 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      data.por_departamento.map(d => ({ Departamento: d.departamento, Ventas: d.num_ventas, Unidades: d.cantidad, Total: d.total.toFixed(2) }))
    ), 'Por departamento')
  }

  // Top productos
  if (data.top_productos?.length > 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      data.top_productos.map((p, i) => ({ '#': i + 1, Producto: p.producto, Unidades: p.cantidad, Total: p.total.toFixed(2) }))
    ), 'Top productos')
  }

  // Por día
  if (data.por_dia?.length > 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      data.por_dia.map(d => ({ Fecha: d.fecha, Ventas: d.num_ventas, Total: d.total.toFixed(2) }))
    ), 'Por día')
  }

  XLSX.writeFile(wb, `Reporte_${negocio}_${fechaInicio}_${fechaFin}.xlsx`)
}

export function exportarCorteDetalle(corte, negocioId) {
  if (!corte) return
  const wb = XLSX.utils.book_new()

  // Hoja: resumen
  const resumenData = [
    { Campo: 'Corte #', Valor: corte.id },
    { Campo: 'Cajero', Valor: corte.cajero },
    { Campo: 'Apertura', Valor: formatFechaHora(corte.apertura) },
    { Campo: 'Cierre', Valor: corte.cierre ? formatFechaHora(corte.cierre) : '—' },
    { Campo: 'Efectivo inicial', Valor: parseFloat(corte.efectivo_inicial).toFixed(2) },
    { Campo: 'Efectivo esperado', Valor: corte.efectivo_esperado ? parseFloat(corte.efectivo_esperado).toFixed(2) : '—' },
    { Campo: 'Efectivo contado', Valor: corte.efectivo_contado ? parseFloat(corte.efectivo_contado).toFixed(2) : '—' },
    { Campo: 'Diferencia', Valor: corte.diferencia ? parseFloat(corte.diferencia).toFixed(2) : '—' },
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumenData), 'Resumen')

  // Hoja: ventas por método
  if (corte.resumen_por_metodo?.length > 0) {
    const metodosData = corte.resumen_por_metodo.map(r => ({
      'Método': r.metodo_pago,
      'Ventas': r.cantidad,
      'Total': parseFloat(r.total).toFixed(2),
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(metodosData), 'Por método')
  }

  // Hoja: top productos
  if (corte.top_productos?.length > 0) {
    const topData = corte.top_productos.map(p => ({
      'Producto': p.nombre,
      'Cantidad vendida': parseFloat(p.cantidad_vendida),
      'Total': parseFloat(p.total).toFixed(2),
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(topData), 'Top productos')
  }

  XLSX.writeFile(wb, `Corte_${corte.id}_${NEGOCIOS[negocioId]}_${new Date().toISOString().split('T')[0]}.xlsx`)
}

export function exportarTodo(ventasPorNegocio, inventarioPorNegocio, cortesPorNegocio) {
  const wb = XLSX.utils.book_new()

  // Agregar hojas de ventas
  for (const [negocioId, ventas] of Object.entries(ventasPorNegocio)) {
    const datos = (ventas || []).map(v => ({
      '#ID': v.id,
      'Fecha': formatFecha(v.fecha),
      'Hora': formatHora(v.fecha),
      'Cajero': v.cajero,
      'Método': v.metodo_pago,
      'Total': parseFloat(v.total).toFixed(2),
    }))
    const ws = XLSX.utils.json_to_sheet(datos)
    XLSX.utils.book_append_sheet(wb, ws, `Ventas - ${NEGOCIOS[negocioId]}`)
  }

  // Agregar hojas de inventario
  for (const [negocioId, inventario] of Object.entries(inventarioPorNegocio)) {
    const datos = (inventario || []).map(item => {
      const bajo = parseFloat(item.cantidad) <= parseFloat(item.alerta_minima)
      return {
        'Código': item.codigo_barras || '—',
        'Producto': item.nombre,
        'Categoría': item.categoria || '—',
        'Unidad': item.unidad,
        'Precio': parseFloat(item.precio).toFixed(2),
        'Stock': parseFloat(item.cantidad),
        'Mínimo': parseFloat(item.alerta_minima),
        'Estado': bajo ? 'Bajo' : 'OK',
      }
    })
    const ws = XLSX.utils.json_to_sheet(datos)
    XLSX.utils.book_append_sheet(wb, ws, `Inventario - ${NEGOCIOS[negocioId]}`)
  }

  // Agregar hojas de cortes
  for (const [negocioId, cortes] of Object.entries(cortesPorNegocio)) {
    const datos = (cortes || []).map(c => ({
      '#ID': c.id,
      'Cajero': c.cajero,
      'Apertura': formatFechaHora(c.apertura),
      'Cierre': c.cierre ? formatFechaHora(c.cierre) : '—',
      'Efectivo inicial': parseFloat(c.efectivo_inicial).toFixed(2),
      'Esperado': c.efectivo_esperado ? parseFloat(c.efectivo_esperado).toFixed(2) : '—',
      'Contado': c.efectivo_contado ? parseFloat(c.efectivo_contado).toFixed(2) : '—',
      'Diferencia': c.diferencia ? parseFloat(c.diferencia).toFixed(2) : '—',
      'Estado': c.estado,
    }))
    const ws = XLSX.utils.json_to_sheet(datos)
    XLSX.utils.book_append_sheet(wb, ws, `Cortes - ${NEGOCIOS[negocioId]}`)
  }

  const hoy = new Date().toISOString().split('T')[0]
  XLSX.writeFile(wb, `Reporte_Completo_${hoy}.xlsx`)
}
