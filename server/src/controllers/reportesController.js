const pool = require('../db/client')

const ventasReporte = async (request, reply) => {
  const { fecha_inicio, fecha_fin } = request.query
  let { negocio_id } = request.query

  if (!negocio_id || !fecha_inicio || !fecha_fin) {
    return reply.code(400).send({ error: 'negocio_id, fecha_inicio y fecha_fin son requeridos' })
  }

  if (request.user.rol !== 'admin' && parseInt(negocio_id) !== request.user.negocio_id) {
    return reply.code(403).send({ error: 'No puedes consultar otro negocio' })
  }

  const TZ = 'America/Mexico_City'

  try {
    const [resumenRes, metodosRes, cajerosRes, productosRes, porDiaRes, porDeptoRes] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) AS num_ventas,
                COALESCE(SUM(total), 0) AS total,
                COALESCE(SUM(subtotal), 0) AS subtotal,
                COALESCE(SUM(descuento), 0) AS descuentos,
                COALESCE(SUM(iva_total), 0) AS iva,
                COALESCE(AVG(total), 0) AS ticket_promedio
         FROM ventas
         WHERE negocio_id = $1 AND estado = 'completada'
           AND DATE(fecha AT TIME ZONE $4) BETWEEN $2 AND $3`,
        [negocio_id, fecha_inicio, fecha_fin, TZ]
      ),
      pool.query(
        `SELECT metodo_pago AS metodo,
                COUNT(*) AS num_ventas,
                COALESCE(SUM(total), 0) AS total
         FROM ventas
         WHERE negocio_id = $1 AND estado = 'completada'
           AND DATE(fecha AT TIME ZONE $4) BETWEEN $2 AND $3
         GROUP BY metodo_pago ORDER BY total DESC`,
        [negocio_id, fecha_inicio, fecha_fin, TZ]
      ),
      pool.query(
        `SELECT u.nombre AS cajero,
                COUNT(*) AS num_ventas,
                COALESCE(SUM(v.total), 0) AS total
         FROM ventas v
         JOIN usuarios u ON u.id = v.cajero_id
         WHERE v.negocio_id = $1 AND v.estado = 'completada'
           AND DATE(v.fecha AT TIME ZONE $4) BETWEEN $2 AND $3
         GROUP BY u.nombre ORDER BY total DESC`,
        [negocio_id, fecha_inicio, fecha_fin, TZ]
      ),
      pool.query(
        `SELECT p.nombre AS producto,
                SUM(vi.cantidad) AS cantidad,
                COALESCE(SUM(vi.subtotal), 0) AS total
         FROM venta_items vi
         JOIN ventas v ON v.id = vi.venta_id
         JOIN productos p ON p.id = vi.producto_id
         WHERE v.negocio_id = $1 AND v.estado = 'completada'
           AND DATE(v.fecha AT TIME ZONE $4) BETWEEN $2 AND $3
         GROUP BY p.nombre ORDER BY total DESC LIMIT 10`,
        [negocio_id, fecha_inicio, fecha_fin, TZ]
      ),
      pool.query(
        `SELECT DATE(v.fecha AT TIME ZONE $4) AS fecha,
                COUNT(*) AS num_ventas,
                COALESCE(SUM(v.total), 0) AS total
         FROM ventas v
         WHERE v.negocio_id = $1 AND v.estado = 'completada'
           AND DATE(v.fecha AT TIME ZONE $4) BETWEEN $2 AND $3
         GROUP BY DATE(v.fecha AT TIME ZONE $4) ORDER BY fecha ASC`,
        [negocio_id, fecha_inicio, fecha_fin, TZ]
      ),
      pool.query(
        `SELECT COALESCE(d.nombre, 'Sin departamento') AS departamento,
                COUNT(DISTINCT v.id) AS num_ventas,
                SUM(vi.cantidad) AS cantidad,
                COALESCE(SUM(vi.subtotal), 0) AS total
         FROM venta_items vi
         JOIN ventas v ON v.id = vi.venta_id
         JOIN productos p ON p.id = vi.producto_id
         LEFT JOIN departamentos d ON d.id = p.departamento_id
         WHERE v.negocio_id = $1 AND v.estado = 'completada'
           AND DATE(v.fecha AT TIME ZONE $4) BETWEEN $2 AND $3
         GROUP BY d.nombre ORDER BY total DESC`,
        [negocio_id, fecha_inicio, fecha_fin, TZ]
      ),
    ])

    const r = resumenRes.rows[0]
    return reply.send({
      resumen: {
        num_ventas:     parseInt(r.num_ventas),
        total:          parseFloat(r.total),
        subtotal:       parseFloat(r.subtotal),
        descuentos:     parseFloat(r.descuentos),
        iva:            parseFloat(r.iva),
        ticket_promedio: parseFloat(r.ticket_promedio),
      },
      por_metodo:       metodosRes.rows.map(m => ({ ...m, num_ventas: parseInt(m.num_ventas), total: parseFloat(m.total) })),
      por_cajero:       cajerosRes.rows.map(c => ({ ...c, num_ventas: parseInt(c.num_ventas), total: parseFloat(c.total) })),
      top_productos:    productosRes.rows.map(p => ({ ...p, cantidad: parseFloat(p.cantidad), total: parseFloat(p.total) })),
      por_dia:          porDiaRes.rows.map(d => ({ ...d, num_ventas: parseInt(d.num_ventas), total: parseFloat(d.total) })),
      por_departamento: porDeptoRes.rows.map(d => ({ ...d, num_ventas: parseInt(d.num_ventas), cantidad: parseFloat(d.cantidad), total: parseFloat(d.total) })),
    })
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al generar reporte' })
  }
}

const productosVendidos = async (request, reply) => {
  const { fecha_inicio, fecha_fin } = request.query
  let { negocio_id } = request.query

  if (!negocio_id || !fecha_inicio || !fecha_fin) {
    return reply.code(400).send({ error: 'negocio_id, fecha_inicio y fecha_fin son requeridos' })
  }

  if (request.user.rol !== 'admin' && parseInt(negocio_id) !== request.user.negocio_id) {
    return reply.code(403).send({ error: 'No puedes consultar otro negocio' })
  }

  try {
    const result = await pool.query(
      `SELECT
         COALESCE(p.codigo_barras, '') AS codigo,
         p.nombre AS descripcion,
         SUM(vi.cantidad) AS cantidad,
         AVG(vi.precio_unitario) AS precio_venta,
         COALESCE(d.nombre, 'Sin departamento') AS departamento,
         COALESCE(SUM(vi.subtotal), 0) AS total
       FROM venta_items vi
       JOIN ventas v ON v.id = vi.venta_id
       JOIN productos p ON p.id = vi.producto_id
       LEFT JOIN departamentos d ON d.id = p.departamento_id
       WHERE v.negocio_id = $1 AND v.estado = 'completada'
         AND DATE(v.fecha AT TIME ZONE 'America/Mexico_City') BETWEEN $2 AND $3
       GROUP BY p.id, p.codigo_barras, p.nombre, d.nombre
       ORDER BY SUM(vi.subtotal) DESC`,
      [negocio_id, fecha_inicio, fecha_fin]
    )

    const productos = result.rows.map(r => ({
      codigo:      r.codigo,
      descripcion: r.descripcion,
      cantidad:    parseFloat(r.cantidad),
      precio_venta: parseFloat(r.precio_venta),
      departamento: r.departamento,
      total:       parseFloat(r.total),
    }))

    const total_vendido = productos.reduce((s, r) => s + r.total, 0)
    return reply.send({ productos, total_vendido })
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al generar reporte' })
  }
}

module.exports = { ventasReporte, productosVendidos }
