const pool = require('../db/client')

const listar = async (request, reply) => {
  const { negocio_id, producto_id } = request.query
  if (!negocio_id) return reply.code(400).send({ error: 'negocio_id requerido' })
  try {
    const params = [negocio_id]
    let extra = ''
    if (producto_id) { params.push(producto_id); extra = `AND pl.producto_id = $${params.length}` }
    const res = await pool.query(
      `SELECT pl.id, pl.lote, pl.fecha_caducidad, pl.cantidad, pl.creado_en,
              p.id AS producto_id, p.nombre AS producto, p.codigo_barras
       FROM producto_lotes pl
       JOIN productos p ON p.id = pl.producto_id
       WHERE pl.negocio_id = $1 AND pl.cantidad > 0 ${extra}
       ORDER BY pl.fecha_caducidad ASC NULLS LAST, p.nombre ASC`,
      params
    )
    return reply.send(res.rows)
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al listar lotes' })
  }
}

const caducidades = async (request, reply) => {
  const { negocio_id, dias = 30 } = request.query
  if (!negocio_id) return reply.code(400).send({ error: 'negocio_id requerido' })
  try {
    const res = await pool.query(
      `SELECT
         pl.id, pl.lote, pl.fecha_caducidad, pl.cantidad,
         p.id AS producto_id, p.nombre AS producto, p.codigo_barras,
         CASE
           WHEN pl.fecha_caducidad < CURRENT_DATE THEN 'vencido'
           ELSE 'proximo'
         END AS estado,
         (pl.fecha_caducidad - CURRENT_DATE) AS dias_restantes
       FROM producto_lotes pl
       JOIN productos p ON p.id = pl.producto_id
       WHERE pl.negocio_id = $1
         AND pl.cantidad > 0
         AND pl.fecha_caducidad IS NOT NULL
         AND pl.fecha_caducidad <= CURRENT_DATE + ($2::int * INTERVAL '1 day')
       ORDER BY pl.fecha_caducidad ASC, p.nombre ASC`,
      [negocio_id, parseInt(dias, 10)]
    )
    return reply.send(res.rows)
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al consultar caducidades' })
  }
}

const crearInicial = async (request, reply) => {
  const { producto_id, negocio_id, lote, fecha_caducidad, cantidad } = request.body
  if (!producto_id || !negocio_id || !lote) {
    return reply.code(400).send({ error: 'producto_id, negocio_id y lote son requeridos' })
  }
  try {
    const res = await pool.query(
      `INSERT INTO producto_lotes (producto_id, negocio_id, lote, fecha_caducidad, cantidad)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (producto_id, negocio_id, lote)
       DO UPDATE SET cantidad = producto_lotes.cantidad + EXCLUDED.cantidad
       RETURNING *`,
      [producto_id, negocio_id, lote, fecha_caducidad || null, cantidad || 0]
    )
    return reply.code(201).send(res.rows[0])
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al crear lote' })
  }
}

module.exports = { listar, caducidades, crearInicial }
