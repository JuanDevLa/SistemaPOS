const pool = require('../db/client')

const registrar = async (req, reply) => {
  const { negocio_id, tipo, monto, motivo, corte_id } = req.body
  const usuario_id = req.user?.id || null
  if (!negocio_id || !tipo || !monto) return reply.code(400).send({ error: 'Faltan datos' })
  if (!['entrada', 'salida'].includes(tipo)) return reply.code(400).send({ error: 'Tipo inválido' })
  if (req.user?.rol !== 'admin') {
    const claveRequerida = tipo === 'entrada' ? 'entrada_efectivo' : 'salida_efectivo'
    if (req.user?.permisos?.[claveRequerida] !== true) {
      return reply.code(403).send({ error: `Sin permiso: ${claveRequerida}` })
    }
  }
  const res = await pool.query(
    `INSERT INTO movimientos_caja (negocio_id, usuario_id, corte_id, tipo, monto, motivo)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [negocio_id, usuario_id, corte_id || null, tipo, monto, motivo || null]
  )
  reply.send(res.rows[0])
}

const listar = async (req, reply) => {
  const { negocio_id, corte_id } = req.query
  let q = `SELECT m.*, u.nombre as cajero FROM movimientos_caja m
           LEFT JOIN usuarios u ON m.usuario_id = u.id
           WHERE m.negocio_id = $1`
  const params = [negocio_id]
  if (corte_id) { q += ` AND m.corte_id = $2`; params.push(corte_id) }
  q += ` ORDER BY m.creado_en DESC`
  const res = await pool.query(q, params)
  reply.send(res.rows)
}

module.exports = { registrar, listar }
