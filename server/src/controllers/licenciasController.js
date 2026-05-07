const pool = require('../db/client')
const crypto = require('crypto')

const generarClave = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const g = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `PDV-${g()}-${g()}-${g()}`
}

// Primera activación: registra la máquina si hay cupo en el plan
const activar = async (request, reply) => {
  const { clave, hardware_id, hostname } = request.body
  if (!clave || !hardware_id) {
    return reply.code(400).send({ error: 'clave y hardware_id son requeridos' })
  }

  const claveNorm = clave.trim().toUpperCase()

  const { rows } = await pool.query(
    `SELECT * FROM licencias WHERE clave = $1 AND activa = true`,
    [claveNorm]
  )
  if (!rows.length) return reply.code(404).send({ error: 'Licencia no encontrada o inactiva' })

  const lic = rows[0]

  // Verificar expiración
  if (lic.fecha_expiracion && new Date(lic.fecha_expiracion) < new Date()) {
    return reply.code(402).send({ error: 'Licencia vencida', estado: 'expirada' })
  }

  // Máquina ya registrada → actualizar timestamp y devolver ok
  const { rows: maq } = await pool.query(
    `SELECT id FROM licencia_maquinas WHERE licencia_id = $1 AND hardware_id = $2`,
    [lic.id, hardware_id]
  )
  if (maq.length) {
    await pool.query(
      `UPDATE licencia_maquinas SET ultima_validacion = NOW(), activa = true WHERE id = $1`,
      [maq[0].id]
    )
    return reply.send(buildRespuesta(lic, 'reactivada'))
  }

  // Máquina nueva: verificar límite
  const { rows: activas } = await pool.query(
    `SELECT COUNT(*) AS cnt FROM licencia_maquinas WHERE licencia_id = $1 AND activa = true`,
    [lic.id]
  )
  if (parseInt(activas[0].cnt) >= lic.max_maquinas) {
    return reply.code(403).send({
      error: `Límite de ${lic.max_maquinas} máquina(s) alcanzado para este plan. Contacta a soporte.`
    })
  }

  await pool.query(
    `INSERT INTO licencia_maquinas (licencia_id, hardware_id, hostname) VALUES ($1, $2, $3)`,
    [lic.id, hardware_id, hostname || '']
  )

  return reply.send(buildRespuesta(lic, 'activada'))
}

// Validación periódica (cada 24h desde el POS)
const validar = async (request, reply) => {
  const { clave, hardware_id } = request.body
  if (!clave || !hardware_id) {
    return reply.code(400).send({ error: 'clave y hardware_id son requeridos' })
  }

  const { rows } = await pool.query(
    `SELECT l.*, lm.id AS maquina_id
     FROM licencias l
     JOIN licencia_maquinas lm ON lm.licencia_id = l.id AND lm.hardware_id = $2 AND lm.activa = true
     WHERE l.clave = $1 AND l.activa = true`,
    [clave.trim().toUpperCase(), hardware_id]
  )

  if (!rows.length) {
    return reply.code(403).send({ error: 'Licencia inválida o máquina no registrada' })
  }

  const lic = rows[0]

  if (lic.fecha_expiracion && new Date(lic.fecha_expiracion) < new Date()) {
    return reply.code(402).send({ error: 'Licencia vencida', estado: 'expirada', fecha_expiracion: lic.fecha_expiracion })
  }

  await pool.query(
    `UPDATE licencia_maquinas SET ultima_validacion = NOW() WHERE id = $1`,
    [lic.maquina_id]
  )

  return reply.send(buildRespuesta(lic, 'activa'))
}

// Admin: crear nueva licencia
const crear = async (request, reply) => {
  const { cliente_nombre, email, plan, max_maquinas, fecha_expiracion, notas } = request.body

  const planValido = ['basico', 'pyme', 'corporativo'].includes(plan) ? plan : 'basico'
  const maxMaq = plan === 'corporativo' ? 999 : (parseInt(max_maquinas) || 1)
  const clave = generarClave()

  const { rows } = await pool.query(
    `INSERT INTO licencias (clave, cliente_nombre, email, plan, max_maquinas, fecha_expiracion, notas)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, clave`,
    [clave, cliente_nombre || '', email || '', planValido, maxMaq, fecha_expiracion || null, notas || '']
  )

  return reply.code(201).send({ ok: true, clave: rows[0].clave, licencia_id: rows[0].id })
}

// Admin: listar licencias con conteo de máquinas
const listar = async (request, reply) => {
  const { rows } = await pool.query(`
    SELECT l.*, COUNT(lm.id) FILTER (WHERE lm.activa) AS maquinas_activas
    FROM licencias l
    LEFT JOIN licencia_maquinas lm ON lm.licencia_id = l.id
    GROUP BY l.id
    ORDER BY l.creado_en DESC
  `)
  return reply.send(rows)
}

// Admin: desactivar una máquina registrada
const desactivarMaquina = async (request, reply) => {
  const { id } = request.params
  await pool.query(`UPDATE licencia_maquinas SET activa = false WHERE id = $1`, [id])
  return reply.send({ ok: true })
}

// Helpers
const buildRespuesta = (lic, mensaje) => {
  let diasRestantes = null
  if (lic.fecha_expiracion) {
    diasRestantes = Math.ceil((new Date(lic.fecha_expiracion) - new Date()) / (1000 * 60 * 60 * 24))
  }
  return {
    ok: true,
    estado: 'activa',
    mensaje,
    plan: { tipo: lic.plan, max_maquinas: lic.max_maquinas },
    diasRestantes,
    fecha_expiracion: lic.fecha_expiracion || null,
    validado_en: new Date().toISOString(),
  }
}

module.exports = { activar, validar, crear, listar, desactivarMaquina }
