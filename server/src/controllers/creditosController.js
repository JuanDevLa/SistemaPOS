const pool = require('../db/client')

const crear = async (request, reply) => {
  const { cliente_id, venta_id, negocio_id, monto } = request.body
  if (!cliente_id || !venta_id || !monto) {
    return reply.code(400).send({ error: 'Faltan datos requeridos' })
  }
  try {
    const res = await pool.query(
      `INSERT INTO creditos (cliente_id, venta_id, negocio_id, monto_original, saldo_pendiente, estado)
       VALUES ($1, $2, $3, $4, $4, 'pendiente')
       RETURNING id`,
      [cliente_id, venta_id, negocio_id, monto]
    )
    return reply.send({ credito_id: res.rows[0].id })
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al crear crédito' })
  }
}

module.exports = { crear }
