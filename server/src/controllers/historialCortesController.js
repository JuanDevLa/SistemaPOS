const pool = require('../db/client')

// Crear entrada en historial. Valida límite max_cortes_cajero_dia (admin lo salta).
const crear = async (request, reply) => {
  const { tipo, snapshot } = request.body
  const cajero_id = request.user.id
  const negocio_id = request.user.negocio_id || (snapshot && snapshot.negocio_id)
  const esAdmin = request.user.rol === 'admin'

  if (!tipo || !['cajero', 'dia', 'cierre'].includes(tipo)) {
    return reply.code(400).send({ error: 'tipo inválido (cajero | dia | cierre)' })
  }
  if (!snapshot || typeof snapshot !== 'object') {
    return reply.code(400).send({ error: 'snapshot requerido' })
  }
  if (!negocio_id) {
    return reply.code(400).send({ error: 'negocio_id requerido' })
  }

  try {
    if (tipo === 'cajero' && !esAdmin) {
      const limite = await pool.query(
        'SELECT COALESCE(max_cortes_cajero_dia, 3) AS max FROM negocios WHERE id = $1',
        [negocio_id]
      )
      const max = parseInt(limite.rows[0]?.max || 3, 10)
      const usados = await pool.query(
        `SELECT COUNT(*)::int AS n FROM historial_cortes
         WHERE cajero_id = $1 AND tipo = 'cajero'
           AND DATE(creado_en AT TIME ZONE 'America/Mexico_City') = CURRENT_DATE`,
        [cajero_id]
      )
      if (usados.rows[0].n >= max) {
        return reply.code(400).send({
          error: `Límite de cortes diarios alcanzado (${max}). Pide al admin que lo ajuste en Configuración → Cortes.`
        })
      }
    }

    const r = await pool.query(
      `INSERT INTO historial_cortes
         (corte_id, tipo, cajero_id, cajero_nombre, negocio_id, total_ventas, diferencia, snapshot)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, tipo, cajero_nombre, total_ventas, diferencia, creado_en`,
      [
        snapshot.corte_id || null,
        tipo,
        cajero_id,
        snapshot.cajero || request.user.nombre || 'Desconocido',
        negocio_id,
        snapshot.total_ventas || 0,
        snapshot.diferencia ?? null,
        snapshot,
      ]
    )
    return reply.code(201).send(r.rows[0])
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al guardar en historial' })
  }
}

const listar = async (request, reply) => {
  const { negocio_id, cajero_id, desde, hasta, tipo } = request.query
  if (!negocio_id) return reply.code(400).send({ error: 'negocio_id requerido' })

  const params = [negocio_id]
  let where = 'negocio_id = $1'
  if (cajero_id) { params.push(cajero_id); where += ` AND cajero_id = $${params.length}` }
  if (tipo)      { params.push(tipo);      where += ` AND tipo = $${params.length}` }
  if (desde)     { params.push(desde);     where += ` AND creado_en >= $${params.length}` }
  if (hasta)     { params.push(hasta);     where += ` AND creado_en <= $${params.length}` }

  try {
    const r = await pool.query(
      `SELECT id, corte_id, tipo, cajero_id, cajero_nombre, total_ventas, diferencia, creado_en
       FROM historial_cortes WHERE ${where}
       ORDER BY creado_en DESC LIMIT 200`,
      params
    )
    return reply.send(r.rows)
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al listar historial' })
  }
}

const obtener = async (request, reply) => {
  const { id } = request.params
  try {
    const r = await pool.query('SELECT * FROM historial_cortes WHERE id = $1', [id])
    if (r.rows.length === 0) return reply.code(404).send({ error: 'No encontrado' })
    return reply.send(r.rows[0])
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al obtener historial' })
  }
}

module.exports = { crear, listar, obtener }
