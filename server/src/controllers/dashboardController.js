const pool = require('../db/client')

// Resumen del día para el dashboard
const resumen = async (request, reply) => {
  try {
    const esAdmin = request.user.rol === 'admin'
    const userNegocio = request.user.negocio_id
    const filtroNegocio = esAdmin ? '' : ' AND n.id = $1'
    const params = esAdmin ? [] : [userNegocio]

    // Ventas de hoy por negocio
    const ventasPorNegocio = await pool.query(`
      SELECT
        n.id AS negocio_id,
        n.nombre AS negocio,
        COUNT(v.id)::int AS num_ventas,
        COALESCE(SUM(v.total), 0)::float AS total_ventas,
        COALESCE(SUM(CASE WHEN v.metodo_pago = 'efectivo' THEN v.total ELSE 0 END), 0)::float AS total_efectivo,
        COALESCE(SUM(CASE WHEN v.metodo_pago = 'tarjeta' THEN v.total ELSE 0 END), 0)::float AS total_tarjeta,
        COALESCE(SUM(CASE WHEN v.metodo_pago = 'transferencia' THEN v.total ELSE 0 END), 0)::float AS total_transferencia
      FROM negocios n
      LEFT JOIN ventas v ON v.negocio_id = n.id
        AND v.estado = 'completada'
        AND v.fecha >= CURRENT_DATE
        AND v.fecha < CURRENT_DATE + INTERVAL '1 day'
      WHERE n.activo = true${filtroNegocio}
      GROUP BY n.id, n.nombre
      ORDER BY n.id
    `, params)

    // Total consolidado del día
    const totales = await pool.query(`
      SELECT
        COUNT(id)::int AS num_ventas,
        COALESCE(SUM(total), 0)::float AS total_ventas
      FROM ventas
      WHERE estado = 'completada'
        AND fecha >= CURRENT_DATE
        AND fecha < CURRENT_DATE + INTERVAL '1 day'
        ${esAdmin ? '' : ' AND negocio_id = $1'}
    `, params)

    // Cortes activos (turnos abiertos)
    const cortesActivos = await pool.query(`
      SELECT c.id, n.id AS negocio_id, n.nombre AS negocio, u.nombre AS cajero, c.apertura, c.efectivo_inicial
      FROM cortes_caja c
      JOIN negocios n ON n.id = c.negocio_id
      JOIN usuarios u ON u.id = c.cajero_id
      WHERE c.estado = 'abierto'${esAdmin ? '' : ' AND n.id = $1'}
      ORDER BY c.apertura ASC
    `, params)

    // Productos con stock bajo (top 10)
    const stockBajo = await pool.query(`
      SELECT p.nombre, p.codigo_barras, n.nombre AS negocio,
             i.cantidad, i.alerta_minima
      FROM inventario i
      JOIN productos p ON p.id = i.producto_id
      JOIN negocios n ON n.id = i.negocio_id
      WHERE p.activo = true AND i.cantidad <= i.alerta_minima${esAdmin ? '' : ' AND n.id = $1'}
      ORDER BY i.cantidad ASC
      LIMIT 10
    `, params)

    return reply.send({
      fecha: new Date().toISOString(),
      negocios: ventasPorNegocio.rows,
      totales: totales.rows[0],
      cortes_activos: cortesActivos.rows,
      stock_bajo: stockBajo.rows,
    })
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al obtener resumen' })
  }
}

module.exports = { resumen }
