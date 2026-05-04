const pool = require('../db/client')
const mock = require('../services/recargasMock')

// ─── Helpers ────────────────────────────────────────────────────────────────

async function getServicio(negocio_id) {
  const res = await pool.query(
    `SELECT modo FROM config_recargas WHERE negocio_id = $1`,
    [negocio_id]
  )
  // Por ahora solo existe mock; cuando haya producción, importar el adapter real aquí
  return mock
}

// ─── Controladores ──────────────────────────────────────────────────────────

const listarCompanias = async (request, reply) => {
  const { tipo } = request.query
  const params = []
  let where = 'WHERE activo = true'
  if (tipo) {
    params.push(tipo)
    where += ` AND tipo = $${params.length}`
  }
  const res = await pool.query(
    `SELECT id, nombre, tipo, montos, comision_porcentaje, comision_fija, orden
     FROM companias_recarga ${where} ORDER BY orden`,
    params
  )
  return reply.send(res.rows)
}

const procesarRecarga = async (request, reply) => {
  const { negocio_id, compania_id, numero, monto, corte_id } = request.body
  const cajero_id = request.user.id

  if (!negocio_id || !compania_id || !numero || !monto) {
    return reply.code(400).send({ error: 'negocio_id, compania_id, numero y monto son requeridos' })
  }

  const compRes = await pool.query(
    `SELECT nombre, tipo, comision_porcentaje, comision_fija FROM companias_recarga WHERE id = $1 AND activo = true`,
    [compania_id]
  )
  if (compRes.rows.length === 0) return reply.code(404).send({ error: 'Compañía no encontrada' })
  const comp = compRes.rows[0]

  const comision = parseFloat(
    (parseFloat(monto) * comp.comision_porcentaje / 100 + parseFloat(comp.comision_fija)).toFixed(2)
  )

  let referencia = null
  let estado = 'completada'
  let error_mensaje = null

  try {
    const svc = await getServicio(negocio_id)
    const res = await svc.procesarRecarga({ compania: comp.nombre, numero, monto: parseFloat(monto) })
    referencia = res.referencia
  } catch (err) {
    estado = 'fallida'
    error_mensaje = err.message
  }

  const ins = await pool.query(
    `INSERT INTO recargas (negocio_id, cajero_id, corte_id, compania_id, tipo, numero_destino, monto, comision, estado, referencia_proveedor, error_mensaje)
     VALUES ($1,$2,$3,$4,'recarga',$5,$6,$7,$8,$9,$10) RETURNING *`,
    [negocio_id, cajero_id, corte_id || null, compania_id, numero, parseFloat(monto), comision, estado, referencia, error_mensaje]
  )

  if (estado === 'fallida') {
    return reply.code(502).send({ error: error_mensaje, recarga: ins.rows[0] })
  }
  return reply.send({ recarga: ins.rows[0], compania: comp.nombre })
}

const consultarServicio = async (request, reply) => {
  const { negocio_id, compania_id, numero } = request.body
  if (!negocio_id || !compania_id || !numero) {
    return reply.code(400).send({ error: 'negocio_id, compania_id y numero son requeridos' })
  }
  const compRes = await pool.query(
    `SELECT nombre FROM companias_recarga WHERE id = $1 AND activo = true AND tipo = 'servicio'`,
    [compania_id]
  )
  if (compRes.rows.length === 0) return reply.code(404).send({ error: 'Compañía de servicio no encontrada' })

  try {
    const svc = await getServicio(negocio_id)
    const resultado = await svc.consultarServicio({ compania: compRes.rows[0].nombre, numero })
    return reply.send(resultado)
  } catch (err) {
    return reply.code(502).send({ error: err.message })
  }
}

const pagarServicio = async (request, reply) => {
  const { negocio_id, compania_id, numero, monto, referencia_consulta, corte_id } = request.body
  const cajero_id = request.user.id

  if (!negocio_id || !compania_id || !numero || !monto) {
    return reply.code(400).send({ error: 'negocio_id, compania_id, numero y monto son requeridos' })
  }

  const compRes = await pool.query(
    `SELECT nombre, comision_fija FROM companias_recarga WHERE id = $1 AND activo = true AND tipo = 'servicio'`,
    [compania_id]
  )
  if (compRes.rows.length === 0) return reply.code(404).send({ error: 'Compañía de servicio no encontrada' })
  const comp = compRes.rows[0]
  const comision = parseFloat(comp.comision_fija)

  let referencia = null
  let estado = 'completada'
  let error_mensaje = null

  try {
    const svc = await getServicio(negocio_id)
    const res = await svc.pagarServicio({ compania: comp.nombre, numero, monto: parseFloat(monto), referencia_consulta })
    referencia = res.referencia
  } catch (err) {
    estado = 'fallida'
    error_mensaje = err.message
  }

  const ins = await pool.query(
    `INSERT INTO recargas (negocio_id, cajero_id, corte_id, compania_id, tipo, numero_destino, monto, comision, estado, referencia_proveedor, error_mensaje)
     VALUES ($1,$2,$3,$4,'servicio',$5,$6,$7,$8,$9,$10) RETURNING *`,
    [negocio_id, cajero_id, corte_id || null, compania_id, numero, parseFloat(monto), comision, estado, referencia, error_mensaje]
  )

  if (estado === 'fallida') {
    return reply.code(502).send({ error: error_mensaje, recarga: ins.rows[0] })
  }
  return reply.send({ recarga: ins.rows[0], compania: comp.nombre })
}

const listarHistorial = async (request, reply) => {
  const { negocio_id, tipo, desde, hasta, cajero_id, limit = 50, offset = 0 } = request.query
  if (!negocio_id) return reply.code(400).send({ error: 'negocio_id requerido' })

  const params = [negocio_id]
  const conds = ['r.negocio_id = $1']

  if (tipo) { params.push(tipo); conds.push(`r.tipo = $${params.length}`) }
  if (cajero_id) { params.push(cajero_id); conds.push(`r.cajero_id = $${params.length}`) }
  if (desde) { params.push(desde); conds.push(`r.creado_en >= $${params.length}`) }
  if (hasta) { params.push(hasta); conds.push(`r.creado_en <= $${params.length}`) }

  params.push(parseInt(limit), parseInt(offset))
  const res = await pool.query(
    `SELECT r.*, c.nombre AS compania_nombre, u.nombre AS cajero_nombre
     FROM recargas r
     JOIN companias_recarga c ON c.id = r.compania_id
     LEFT JOIN usuarios u ON u.id = r.cajero_id
     WHERE ${conds.join(' AND ')}
     ORDER BY r.creado_en DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  )
  return reply.send(res.rows)
}

const obtenerConfig = async (request, reply) => {
  const { negocio_id } = request.query
  if (!negocio_id) return reply.code(400).send({ error: 'negocio_id requerido' })

  const res = await pool.query(
    `SELECT activo, modo FROM config_recargas WHERE negocio_id = $1`,
    [negocio_id]
  )
  if (res.rows.length === 0) return reply.send({ activo: true, modo: 'mock', api_key: null })
  return reply.send(res.rows[0])
}

const actualizarConfig = async (request, reply) => {
  const { negocio_id, activo, api_key, api_secret, modo } = request.body
  if (!negocio_id) return reply.code(400).send({ error: 'negocio_id requerido' })

  await pool.query(
    `INSERT INTO config_recargas (negocio_id, activo, api_key, api_secret, modo, actualizado_en)
     VALUES ($1,$2,$3,$4,$5,NOW())
     ON CONFLICT (negocio_id) DO UPDATE SET activo=$2, api_key=$3, api_secret=$4, modo=$5, actualizado_en=NOW()`,
    [negocio_id, activo ?? true, api_key || null, api_secret || null, modo || 'mock']
  )
  return reply.send({ ok: true })
}

module.exports = {
  listarCompanias,
  procesarRecarga,
  consultarServicio,
  pagarServicio,
  listarHistorial,
  obtenerConfig,
  actualizarConfig
}
