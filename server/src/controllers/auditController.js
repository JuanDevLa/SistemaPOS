const pool = require('../db/client')

const listar = async (request, reply) => {
  const requester = request.user
  let { negocio_id, usuario_id, accion, desde, hasta, page = 1, limit = 50 } = request.query

  // Supervisor solo ve logs de su negocio
  if (requester.rol === 'supervisor') {
    negocio_id = requester.negocio_id
  }

  const params = []
  const conds = []

  if (negocio_id) {
    params.push(negocio_id)
    conds.push(`al.negocio_id = $${params.length}`)
  }
  if (usuario_id) {
    params.push(usuario_id)
    conds.push(`al.usuario_id = $${params.length}`)
  }
  if (accion) {
    params.push(`%${accion}%`)
    conds.push(`al.accion ILIKE $${params.length}`)
  }
  if (desde) {
    params.push(desde)
    conds.push(`al.creado_en >= $${params.length}`)
  }
  if (hasta) {
    params.push(hasta)
    conds.push(`al.creado_en <= $${params.length}`)
  }

  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : ''
  const offset = (parseInt(page) - 1) * parseInt(limit)

  params.push(parseInt(limit))
  params.push(offset)

  const query = `
    SELECT al.id, al.accion, al.tabla, al.referencia_id, al.notas,
           al.datos_antes, al.datos_despues, al.creado_en,
           u.nombre AS usuario, u.rol AS usuario_rol,
           n.nombre AS negocio
    FROM audit_logs al
    LEFT JOIN usuarios u ON u.id = al.usuario_id
    LEFT JOIN negocios n ON n.id = al.negocio_id
    ${where}
    ORDER BY al.creado_en DESC
    LIMIT $${params.length - 1} OFFSET $${params.length}
  `

  try {
    const [rows, total] = await Promise.all([
      pool.query(query, params),
      pool.query(`SELECT COUNT(*) FROM audit_logs al ${where}`, params.slice(0, -2)),
    ])
    return reply.send({ logs: rows.rows, total: parseInt(total.rows[0].count) })
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al listar audit logs' })
  }
}

module.exports = { listar }
