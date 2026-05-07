const pool = require('../db/client')

// Abrir corte de caja
const abrir = async (request, reply) => {
  const { negocio_id, efectivo_inicial } = request.body
  const cajero_id = request.user.id

  if (!negocio_id || efectivo_inicial === undefined) {
    return reply.code(400).send({ error: 'negocio_id y efectivo_inicial son requeridos' })
  }

  try {
    // Solo 1 turno por negocio — admin puede saltarse la regla
    if (request.user.rol !== 'admin') {
      const abierto = await pool.query(
        "SELECT id FROM cortes_caja WHERE negocio_id = $1 AND estado = 'abierto'",
        [negocio_id]
      )
      if (abierto.rows.length > 0) {
        return reply.code(400).send({ error: 'Este negocio ya tiene un turno abierto', corte_id: abierto.rows[0].id })
      }
    }

    const result = await pool.query(
      `INSERT INTO cortes_caja (negocio_id, cajero_id, efectivo_inicial)
       VALUES ($1, $2, $3)
       RETURNING id, apertura, efectivo_inicial, estado`,
      [negocio_id, cajero_id, efectivo_inicial]
    )

    return reply.code(201).send(result.rows[0])
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al abrir corte' })
  }
}

// Cerrar corte de caja
const cerrar = async (request, reply) => {
  const { id } = request.params
  const { efectivo_contado, notas } = request.body

  if (efectivo_contado === undefined) {
    return reply.code(400).send({ error: 'efectivo_contado es requerido' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const corte = await client.query(
      'SELECT id, negocio_id, cajero_id, efectivo_inicial, estado FROM cortes_caja WHERE id = $1',
      [id]
    )

    if (corte.rows.length === 0) {
      await client.query('ROLLBACK')
      return reply.code(404).send({ error: 'Corte no encontrado' })
    }

    if (corte.rows[0].estado === 'cerrado') {
      await client.query('ROLLBACK')
      return reply.code(400).send({ error: 'El corte ya está cerrado' })
    }

    const { negocio_id, cajero_id, efectivo_inicial } = corte.rows[0]

    // Calcular total de ventas en efectivo durante este corte
    const ventas = await client.query(
      `SELECT COALESCE(SUM(
         CASE
           WHEN metodo_pago = 'efectivo' THEN total
           WHEN metodo_pago = 'mixto'    THEN COALESCE(efectivo_recibido, 0) - COALESCE(cambio, 0)
           ELSE 0
         END
       ), 0) AS total_efectivo
       FROM ventas
       WHERE corte_id = $1 AND estado = 'completada'`,
      [id]
    )

    const totalVentas = parseFloat(ventas.rows[0].total_efectivo)
    const efectivoEsperado = parseFloat(efectivo_inicial) + totalVentas
    const diferencia = parseFloat(efectivo_contado) - efectivoEsperado

    const result = await client.query(
      `UPDATE cortes_caja
       SET estado = 'cerrado', cierre = CURRENT_TIMESTAMP,
           efectivo_esperado = $1, efectivo_contado = $2, diferencia = $3, notas = $4
       WHERE id = $5
       RETURNING id, apertura, cierre, efectivo_inicial, efectivo_esperado, efectivo_contado, diferencia, estado`,
      [efectivoEsperado, efectivo_contado, diferencia, notas || null, id]
    )

    await client.query('COMMIT')
    return reply.send(result.rows[0])
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    return reply.code(500).send({ error: 'Error al cerrar corte' })
  } finally {
    client.release()
  }
}

// Forzar cierre de un corte huérfano (admin). No requiere efectivo_contado:
// cierra con efectivo_contado = efectivo_esperado y diferencia = 0, registrando
// el motivo en notas. Solo aplica a cortes con estado='abierto'.
const forzarCierre = async (request, reply) => {
  const { id } = request.params
  const { motivo } = request.body || {}

  if (request.user.rol !== 'admin') {
    return reply.code(403).send({ error: 'Solo admin puede forzar el cierre' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const corte = await client.query(
      'SELECT id, efectivo_inicial, estado FROM cortes_caja WHERE id = $1',
      [id]
    )
    if (corte.rows.length === 0) {
      await client.query('ROLLBACK')
      return reply.code(404).send({ error: 'Corte no encontrado' })
    }
    if (corte.rows[0].estado === 'cerrado') {
      await client.query('ROLLBACK')
      return reply.code(400).send({ error: 'El corte ya está cerrado' })
    }

    const ventas = await client.query(
      `SELECT COALESCE(SUM(
         CASE
           WHEN metodo_pago = 'efectivo' THEN total
           WHEN metodo_pago = 'mixto'    THEN COALESCE(efectivo_recibido, 0) - COALESCE(cambio, 0)
           ELSE 0
         END
       ), 0) AS total_efectivo
       FROM ventas
       WHERE corte_id = $1 AND estado = 'completada'`,
      [id]
    )

    const efectivoInicial = parseFloat(corte.rows[0].efectivo_inicial)
    const efectivoEsperado = efectivoInicial + parseFloat(ventas.rows[0].total_efectivo)
    const notasFinal = `[Cierre forzado por ${request.user.nombre || 'admin'}] ${motivo || 'Sin motivo especificado'}`

    const result = await client.query(
      `UPDATE cortes_caja
       SET estado = 'cerrado', cierre = CURRENT_TIMESTAMP,
           efectivo_esperado = $1, efectivo_contado = $1, diferencia = 0, notas = $2
       WHERE id = $3
       RETURNING id, apertura, cierre, efectivo_inicial, efectivo_esperado, efectivo_contado, diferencia, estado, notas`,
      [efectivoEsperado, notasFinal, id]
    )

    await client.query('COMMIT')
    return reply.send(result.rows[0])
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    return reply.code(500).send({ error: 'Error al forzar cierre' })
  } finally {
    client.release()
  }
}

// Listar cortes de un negocio
const listar = async (request, reply) => {
  const { negocio_id, cajero_id } = request.query

  if (!negocio_id) {
    return reply.code(400).send({ error: 'negocio_id requerido' })
  }

  let query = `
    SELECT c.id, c.apertura, c.cierre, c.efectivo_inicial, c.efectivo_esperado,
           c.efectivo_contado, c.diferencia, c.estado, u.nombre AS cajero
    FROM cortes_caja c
    LEFT JOIN usuarios u ON u.id = c.cajero_id
    WHERE c.negocio_id = $1`

  const params = [negocio_id]

  if (cajero_id) {
    params.push(cajero_id)
    query += ` AND c.cajero_id = $${params.length}`
  }

  query += ' ORDER BY c.apertura DESC LIMIT 50'

  try {
    const result = await pool.query(query, params)
    return reply.send(result.rows)
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al listar cortes' })
  }
}

// Ver detalle de un corte con sus ventas
const obtener = async (request, reply) => {
  const { id } = request.params

  try {
    const corte = await pool.query(
      `SELECT c.id, c.apertura, c.cierre, c.efectivo_inicial, c.efectivo_esperado,
              c.efectivo_contado, c.diferencia, c.estado, c.notas,
              u.nombre AS cajero, n.nombre AS negocio
       FROM cortes_caja c
       LEFT JOIN usuarios u ON u.id = c.cajero_id
       LEFT JOIN negocios n ON n.id = c.negocio_id
       WHERE c.id = $1`,
      [id]
    )

    if (corte.rows.length === 0) {
      return reply.code(404).send({ error: 'Corte no encontrado' })
    }

    const ventas = await pool.query(
      `SELECT id, fecha, total, metodo_pago, estado
       FROM ventas
       WHERE corte_id = $1
       ORDER BY fecha ASC`,
      [id]
    )

    const resumen = await pool.query(
      `SELECT metodo_pago, COUNT(*) AS cantidad, SUM(total) AS total
       FROM ventas
       WHERE corte_id = $1 AND estado = 'completada'
       GROUP BY metodo_pago`,
      [id]
    )

    const movimientos = await pool.query(
      `SELECT id, tipo, monto, motivo, creado_en
       FROM movimientos_caja
       WHERE corte_id = $1
       ORDER BY creado_en ASC`,
      [id]
    )

    const topProductos = await pool.query(
      `SELECT p.nombre, SUM(vi.cantidad) AS cantidad_vendida, SUM(vi.subtotal) AS total
       FROM venta_items vi
       JOIN ventas v ON v.id = vi.venta_id
       JOIN productos p ON p.id = vi.producto_id
       WHERE v.corte_id = $1 AND v.estado = 'completada'
       GROUP BY p.id, p.nombre
       ORDER BY cantidad_vendida DESC
       LIMIT 10`,
      [id]
    )

    return reply.send({
      ...corte.rows[0],
      ventas: ventas.rows,
      resumen_por_metodo: resumen.rows,
      movimientos_caja: movimientos.rows,
      top_productos: topProductos.rows
    })
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al obtener corte' })
  }
}

// Resumen consolidado del día
const corteDia = async (request, reply) => {
  const { negocio_id, fecha } = request.query

  if (!negocio_id) {
    return reply.code(400).send({ error: 'negocio_id requerido' })
  }

  const dia = fecha || new Date().toISOString().split('T')[0]

  try {
    const resumenCortes = await pool.query(
      `SELECT
        COUNT(*) AS turnos,
        COUNT(*) FILTER (WHERE estado = 'abierto') AS turnos_abiertos,
        SUM(efectivo_inicial) AS total_inicial,
        SUM(COALESCE(efectivo_esperado, 0)) AS total_esperado,
        SUM(COALESCE(efectivo_contado, 0)) AS total_contado,
        SUM(COALESCE(diferencia, 0)) AS total_diferencia
       FROM cortes_caja
       WHERE negocio_id = $1 AND DATE(apertura AT TIME ZONE 'America/Mexico_City') = $2`,
      [negocio_id, dia]
    )

    const resumenVentas = await pool.query(
      `SELECT metodo_pago, COUNT(*) AS cantidad, SUM(v.total) AS total
       FROM ventas v
       JOIN cortes_caja c ON c.id = v.corte_id
       WHERE c.negocio_id = $1
         AND DATE(v.fecha AT TIME ZONE 'America/Mexico_City') = $2
         AND v.estado = 'completada'
       GROUP BY metodo_pago
       ORDER BY total DESC`,
      [negocio_id, dia]
    )

    const totalVentas = resumenVentas.rows.reduce((s, r) => s + parseFloat(r.total), 0)

    return reply.send({
      fecha: dia,
      ...resumenCortes.rows[0],
      total_ventas: totalVentas,
      ventas_por_metodo: resumenVentas.rows,
    })
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al calcular corte del día' })
  }
}

// Turno abierto del cajero autenticado (admin ve cualquiera del negocio)
const turnoAbierto = async (request, reply) => {
  const { negocio_id, id: cajero_id, rol } = request.user

  try {
    const esAdmin = rol === 'admin'
    const result = await pool.query(
      `SELECT c.id, c.apertura, c.efectivo_inicial, c.estado,
              c.cajero_id, u.nombre AS cajero
       FROM cortes_caja c
       LEFT JOIN usuarios u ON u.id = c.cajero_id
       WHERE c.negocio_id = $1 AND c.estado = 'abierto'
         ${esAdmin ? '' : 'AND c.cajero_id = $2'}
       ORDER BY c.apertura DESC
       LIMIT 1`,
      esAdmin ? [negocio_id] : [negocio_id, cajero_id]
    )
    return reply.send(result.rows[0] || null)
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al verificar turno' })
  }
}

// Snapshot en vivo del turno actual (sin cerrarlo) o del día completo.
// Calcula todos los bloques de la pantalla de corte (estilo eleventa).
const snapshot = async (request, reply) => {
  const { negocio_id, cajero_id, tipo, fecha } = request.query
  const tipoSnap = tipo === 'dia' ? 'dia' : 'cajero'

  if (!negocio_id) {
    return reply.code(400).send({ error: 'negocio_id requerido' })
  }

  try {
    let corteIds = []
    let corteHeader = null
    let aperturaDesde = null

    if (tipoSnap === 'cajero') {
      // Prioridad: turno abierto del negocio (cualquier cajero) > turno del cajero filtrado > más reciente del negocio.
      // El filtro estricto por cajero_id rompía cuando la sesión actual y el corte abierto tenían cajero_ids distintos.
      const r = await pool.query(
        `SELECT c.id, c.apertura, c.efectivo_inicial, c.estado, c.cajero_id,
                u.nombre AS cajero, n.nombre AS negocio
         FROM cortes_caja c
         LEFT JOIN usuarios u ON u.id = c.cajero_id
         LEFT JOIN negocios n ON n.id = c.negocio_id
         WHERE c.negocio_id = $1
         ORDER BY
           (c.estado = 'abierto') DESC,
           (c.cajero_id = $2) DESC,
           c.apertura DESC
         LIMIT 1`,
        [negocio_id, cajero_id || -1]
      )
      if (r.rows.length === 0) return reply.send(null)
      corteHeader = r.rows[0]
      corteIds = [corteHeader.id]
      aperturaDesde = corteHeader.apertura
    } else {
      // Día completo
      const dia = fecha || new Date().toISOString().split('T')[0]
      const r = await pool.query(
        `SELECT c.id, n.nombre AS negocio
         FROM cortes_caja c
         LEFT JOIN negocios n ON n.id = c.negocio_id
         WHERE c.negocio_id = $1
           AND DATE(c.apertura AT TIME ZONE 'America/Mexico_City') = $2`,
        [negocio_id, dia]
      )
      if (r.rows.length === 0) return reply.send(null)
      corteIds = r.rows.map(x => x.id)
      corteHeader = {
        negocio: r.rows[0].negocio,
        cajero: 'Todos',
        apertura: dia,
        estado: 'dia',
        efectivo_inicial: 0,
      }
      aperturaDesde = dia
    }

    if (corteIds.length === 0) return reply.send(null)
    const inList = corteIds.map((_, i) => `$${i + 1}`).join(',')

    // Sumas por método (ventas completadas).
    // Los pagos 'mixto' se desglosan: su porción tarjeta se suma a 'tarjeta'.
    // La porción efectivo ya está cubierta en ventas_efectivo vía CASE WHEN mixto.
    const ventasMetodo = await pool.query(
      `SELECT metodo_pago, COUNT(*) AS cantidad, COALESCE(SUM(total_norm), 0) AS total
       FROM (
         SELECT metodo_pago, total AS total_norm
         FROM ventas
         WHERE corte_id IN (${inList}) AND estado = 'completada' AND metodo_pago != 'mixto'
         UNION ALL
         SELECT 'tarjeta' AS metodo_pago, COALESCE(monto_tarjeta, 0) AS total_norm
         FROM ventas
         WHERE corte_id IN (${inList}) AND estado = 'completada' AND metodo_pago = 'mixto'
       ) sub
       GROUP BY metodo_pago
       ORDER BY total DESC`,
      corteIds
    )

    // Total ventas + impuestos (de la tabla ventas, sin joinear items)
    const totalesVentas = await pool.query(
      `SELECT COALESCE(SUM(total),0) AS total_ventas,
              COALESCE(SUM(iva_total),0) AS impuestos
       FROM ventas
       WHERE corte_id IN (${inList}) AND estado = 'completada'`,
      corteIds
    )

    // Ganancia: requiere joinear items (venta_items × productos.costo)
    const totalesGanancia = await pool.query(
      `SELECT COALESCE(SUM((vi.precio_unitario - COALESCE(p.costo,0)) * vi.cantidad),0) AS ganancia
       FROM venta_items vi
       JOIN ventas v        ON v.id = vi.venta_id
       LEFT JOIN productos p ON p.id = vi.producto_id
       WHERE v.corte_id IN (${inList}) AND v.estado = 'completada'`,
      corteIds
    )

    const totales = {
      rows: [{
        total_ventas: totalesVentas.rows[0].total_ventas,
        impuestos:    totalesVentas.rows[0].impuestos,
        ganancia:     totalesGanancia.rows[0].ganancia,
      }]
    }

    // Efectivo inicial sumado de los cortes (día) o el del turno
    const efIni = await pool.query(
      `SELECT COALESCE(SUM(efectivo_inicial),0) AS total FROM cortes_caja WHERE id IN (${inList})`,
      corteIds
    )

    // Ventas en efectivo (efectivo + porción de mixto)
    const ventasEfectivo = await pool.query(
      `SELECT COALESCE(SUM(
         CASE
           WHEN metodo_pago = 'efectivo' THEN total
           WHEN metodo_pago = 'mixto' THEN COALESCE(efectivo_recibido,0) - COALESCE(cambio,0)
           ELSE 0
         END
       ),0) AS total
       FROM ventas WHERE corte_id IN (${inList}) AND estado = 'completada'`,
      corteIds
    )

    // Movimientos de caja (entradas/salidas)
    const movimientos = await pool.query(
      `SELECT id, tipo, monto, motivo, creado_en
       FROM movimientos_caja
       WHERE corte_id IN (${inList})
       ORDER BY creado_en ASC`,
      corteIds
    )

    // Abonos a crédito durante el corte
    const abonos = await pool.query(
      `SELECT a.id, a.monto, a.metodo_pago, a.creado_en, c.nombre AS cliente
       FROM abonos a
       LEFT JOIN clientes c ON c.id = a.cliente_id
       WHERE a.negocio_id = $1
         AND a.creado_en >= $2
       ORDER BY a.creado_en ASC`,
      [negocio_id, aperturaDesde]
    )

    // Devoluciones (ventas canceladas en el corte)
    const devoluciones = await pool.query(
      `SELECT metodo_pago, COALESCE(SUM(total),0) AS total
       FROM ventas
       WHERE corte_id IN (${inList}) AND estado IN ('cancelada','devolucion')
       GROUP BY metodo_pago`,
      corteIds
    )

    // Ventas por departamento
    const porDepto = await pool.query(
      `SELECT COALESCE(d.nombre,'(Sin departamento)') AS departamento,
              COALESCE(SUM(vi.subtotal),0) AS total
       FROM venta_items vi
       JOIN ventas v ON v.id = vi.venta_id
       LEFT JOIN productos p ON p.id = vi.producto_id
       LEFT JOIN departamentos d ON d.id = p.departamento_id
       WHERE v.corte_id IN (${inList}) AND v.estado = 'completada'
       GROUP BY d.nombre
       ORDER BY total DESC`,
      corteIds
    )

    // Top clientes (vía créditos vinculados a ventas del corte)
    const topVentas = await pool.query(
      `SELECT cl.nombre, COALESCE(SUM(v.total),0) AS total
       FROM ventas v
       JOIN creditos cr ON cr.venta_id = v.id
       JOIN clientes cl ON cl.id = cr.cliente_id
       WHERE v.corte_id IN (${inList}) AND v.estado = 'completada'
       GROUP BY cl.id, cl.nombre
       ORDER BY total DESC
       LIMIT 5`,
      corteIds
    )

    const topGanancia = await pool.query(
      `SELECT cl.nombre,
              COALESCE(SUM((vi.precio_unitario - COALESCE(p.costo,0)) * vi.cantidad),0) AS ganancia
       FROM ventas v
       JOIN creditos cr ON cr.venta_id = v.id
       JOIN clientes cl ON cl.id = cr.cliente_id
       JOIN venta_items vi ON vi.venta_id = v.id
       LEFT JOIN productos p ON p.id = vi.producto_id
       WHERE v.corte_id IN (${inList}) AND v.estado = 'completada'
       GROUP BY cl.id, cl.nombre
       ORDER BY ganancia DESC
       LIMIT 5`,
      corteIds
    )

    return reply.send({
      tipo: tipoSnap,
      corte_id: tipoSnap === 'cajero' ? corteIds[0] : null,
      negocio: corteHeader.negocio,
      cajero: corteHeader.cajero,
      cajero_id: corteHeader.cajero_id || null,
      apertura: corteHeader.apertura,
      estado: corteHeader.estado,
      hasta: new Date().toISOString(),
      efectivo_inicial: parseFloat(efIni.rows[0].total),
      total_ventas: parseFloat(totales.rows[0].total_ventas),
      ganancia: parseFloat(totales.rows[0].ganancia),
      impuestos: parseFloat(totales.rows[0].impuestos),
      ventas_efectivo: parseFloat(ventasEfectivo.rows[0].total),
      ventas_por_metodo: ventasMetodo.rows,
      movimientos_caja: movimientos.rows,
      abonos: abonos.rows,
      devoluciones: devoluciones.rows,
      ventas_por_departamento: porDepto.rows,
      top_clientes_ventas: topVentas.rows,
      top_clientes_ganancia: topGanancia.rows,
    })
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al calcular snapshot' })
  }
}

module.exports = { abrir, cerrar, forzarCierre, listar, obtener, corteDia, turnoAbierto, snapshot }
