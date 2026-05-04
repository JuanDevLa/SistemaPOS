const pool = require('../db/client')

const listar = async (request, reply) => {
  const { negocio_id } = request.query
  if (!negocio_id) return reply.code(400).send({ error: 'negocio_id requerido' })

  try {
    const res = await pool.query(
      `SELECT pr.id, pr.nombre, pr.cantidad_desde, pr.cantidad_hasta, pr.precio_promo,
              p.codigo_barras, p.nombre AS producto_nombre, p.precio AS precio_normal, p.costo AS precio_costo
       FROM promociones pr
       JOIN productos p ON p.id = pr.producto_id
       WHERE pr.negocio_id = $1 AND pr.activo = true
       ORDER BY pr.creado_en DESC`,
      [negocio_id]
    )
    return reply.send(res.rows.map(r => ({
      id:              r.id,
      nombre:          r.nombre,
      codigo_barras:   r.codigo_barras || '',
      producto_nombre: r.producto_nombre,
      cantidad_desde:  parseFloat(r.cantidad_desde),
      cantidad_hasta:  parseFloat(r.cantidad_hasta),
      precio_promo:    parseFloat(r.precio_promo),
      precio_normal:   parseFloat(r.precio_normal),
      precio_costo:    parseFloat(r.precio_costo || 0),
    })))
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al listar promociones' })
  }
}

const crear = async (request, reply) => {
  const { negocio_id, nombre, producto_id, cantidad_desde, cantidad_hasta, precio_promo } = request.body

  if (!negocio_id || !nombre || !producto_id || precio_promo == null) {
    return reply.code(400).send({ error: 'negocio_id, nombre, producto_id y precio_promo son requeridos' })
  }

  try {
    const res = await pool.query(
      `INSERT INTO promociones (negocio_id, nombre, producto_id, cantidad_desde, cantidad_hasta, precio_promo)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [negocio_id, nombre.trim(), producto_id, cantidad_desde || 0, cantidad_hasta || 0, precio_promo]
    )
    return reply.code(201).send({ id: res.rows[0].id })
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al crear promocion' })
  }
}

const eliminar = async (request, reply) => {
  const { id } = request.params
  try {
    await pool.query('UPDATE promociones SET activo = false WHERE id = $1', [id])
    return reply.send({ ok: true })
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al eliminar promocion' })
  }
}

module.exports = { listar, crear, eliminar }
