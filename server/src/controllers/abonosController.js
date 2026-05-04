const pool = require('../db/client')

// Registrar un abono
const registrar = async (request, reply) => {
  const { cliente_id, credito_id, negocio_id, usuario_id, monto, comentarios, destino } = request.body
  // destino: 'seleccionado' | 'todos'

  if (!cliente_id || !monto || monto <= 0) {
    return reply.code(400).send({ error: 'Cliente y monto son requeridos' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    if (destino === 'todos') {
      // Distribuir el abono entre todos los créditos pendientes del cliente
      const creditosRes = await client.query(
        `SELECT id, saldo_pendiente FROM creditos
         WHERE cliente_id = $1 AND estado != 'liquidado' AND negocio_id = $2
         ORDER BY creado_en ASC`,
        [cliente_id, negocio_id]
      )

      let montoRestante = parseFloat(monto)
      for (const credito of creditosRes.rows) {
        if (montoRestante <= 0) break
        const saldo = parseFloat(credito.saldo_pendiente)
        const aplicar = Math.min(montoRestante, saldo)
        const nuevoSaldo = saldo - aplicar
        const nuevoEstado = nuevoSaldo <= 0 ? 'liquidado' : 'parcial'

        await client.query(
          `UPDATE creditos SET saldo_pendiente = $1, estado = $2 WHERE id = $3`,
          [nuevoSaldo, nuevoEstado, credito.id]
        )
        await client.query(
          `INSERT INTO abonos (credito_id, cliente_id, negocio_id, usuario_id, monto, comentarios)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [credito.id, cliente_id, negocio_id, usuario_id || null, aplicar, comentarios || null]
        )
        montoRestante -= aplicar
      }
    } else {
      // Solo al crédito seleccionado
      const creditoRes = await client.query(
        `SELECT id, saldo_pendiente FROM creditos WHERE id = $1 AND estado != 'liquidado'`,
        [credito_id]
      )
      if (creditoRes.rows.length === 0) {
        await client.query('ROLLBACK')
        return reply.code(404).send({ error: 'Crédito no encontrado o ya liquidado' })
      }
      const credito = creditoRes.rows[0]
      const nuevoSaldo = Math.max(0, parseFloat(credito.saldo_pendiente) - parseFloat(monto))
      const nuevoEstado = nuevoSaldo <= 0 ? 'liquidado' : 'parcial'

      await client.query(
        `UPDATE creditos SET saldo_pendiente = $1, estado = $2 WHERE id = $3`,
        [nuevoSaldo, nuevoEstado, credito_id]
      )
      await client.query(
        `INSERT INTO abonos (credito_id, cliente_id, negocio_id, usuario_id, monto, comentarios)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [credito_id, cliente_id, negocio_id, usuario_id || null, monto, comentarios || null]
      )
    }

    await client.query('COMMIT')
    return reply.send({ success: true })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    return reply.code(500).send({ error: 'Error al registrar abono' })
  } finally {
    client.release()
  }
}

module.exports = { registrar }
