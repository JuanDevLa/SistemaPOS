const pool = require('../db/client')

const listar = async (request, reply) => {
  const { negocio_id } = request.query
  if (!negocio_id) return reply.code(400).send({ error: 'negocio_id requerido' })

  try {
    const res = await pool.query(
      `SELECT
         lc.id, lc.cantidad, lc.creado_en,
         p.id AS producto_id, p.codigo_barras, p.nombre,
         COALESCE(p.costo, 0) AS costo,
         COALESCE(d.nombre, '- Sin Departamento -') AS departamento,
         lc.proveedor_id,
         COALESCE(pv.nombre, '') AS proveedor
       FROM lista_compras lc
       JOIN productos p ON p.id = lc.producto_id
       LEFT JOIN departamentos d ON d.id = p.departamento_id
       LEFT JOIN proveedores pv ON pv.id = lc.proveedor_id
       WHERE lc.negocio_id = $1
       ORDER BY lc.creado_en DESC`,
      [negocio_id]
    )
    return reply.send(res.rows.map(r => ({
      ...r,
      cantidad: parseFloat(r.cantidad),
      costo:    parseFloat(r.costo),
      importe:  parseFloat(r.cantidad) * parseFloat(r.costo),
    })))
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al listar lista de compras' })
  }
}

const agregar = async (request, reply) => {
  const { negocio_id, producto_id, proveedor_id, cantidad } = request.body
  if (!negocio_id || !producto_id) return reply.code(400).send({ error: 'negocio_id y producto_id requeridos' })

  try {
    const res = await pool.query(
      `INSERT INTO lista_compras (negocio_id, producto_id, proveedor_id, cantidad)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (negocio_id, producto_id)
       DO UPDATE SET cantidad = $4, proveedor_id = COALESCE($3, lista_compras.proveedor_id)
       RETURNING id`,
      [negocio_id, producto_id, proveedor_id || null, cantidad || 1]
    )
    return reply.code(201).send({ id: res.rows[0].id })
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al agregar producto' })
  }
}

const actualizar = async (request, reply) => {
  const { id } = request.params
  const { cantidad, proveedor_id } = request.body

  try {
    await pool.query(
      `UPDATE lista_compras SET
         cantidad     = COALESCE($1, cantidad),
         proveedor_id = COALESCE($2, proveedor_id)
       WHERE id = $3`,
      [cantidad ?? null, proveedor_id ?? null, id]
    )
    return reply.send({ ok: true })
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al actualizar' })
  }
}

const eliminar = async (request, reply) => {
  const { id } = request.params
  try {
    await pool.query('DELETE FROM lista_compras WHERE id = $1', [id])
    return reply.send({ ok: true })
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al eliminar' })
  }
}

module.exports = { listar, agregar, actualizar, eliminar }
