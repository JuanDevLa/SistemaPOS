const bcrypt = require('bcrypt')
const crypto = require('crypto')
const pool = require('../db/client')
const auditService = require('../services/auditService')
const tokenRevokeService = require('../services/tokenRevokeService')

const ATTEMPT_WINDOW_MS = 15 * 60 * 1000
const LOCKOUT_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 5
const GENERIC_ERROR = 'Credenciales incorrectas'

const isLocked = (user) => user.bloqueado_hasta && new Date(user.bloqueado_hasta) > new Date()

const registerFailedAttempt = async (user) => {
  const now = new Date()
  const windowStart = user.intentos_inicio ? new Date(user.intentos_inicio) : null
  const windowExpired = !windowStart || (now - windowStart) > ATTEMPT_WINDOW_MS
  const newAttempts = windowExpired ? 1 : (user.intentos_fallidos || 0) + 1
  const newWindowStart = windowExpired ? now : windowStart
  const newLockoutUntil = newAttempts >= MAX_ATTEMPTS ? new Date(now.getTime() + LOCKOUT_MS) : null

  await pool.query(
    'UPDATE usuarios SET intentos_fallidos = $1, intentos_inicio = $2, bloqueado_hasta = $3 WHERE id = $4',
    [newAttempts, newWindowStart, newLockoutUntil, user.id]
  )
  return { newAttempts, newLockoutUntil }
}

const resetAttempts = async (userId) => {
  await pool.query(
    'UPDATE usuarios SET intentos_fallidos = 0, intentos_inicio = NULL, bloqueado_hasta = NULL WHERE id = $1',
    [userId]
  )
}

const auditLoginFail = async (user, request, motivo, extra = {}) => {
  await auditService.registrar(pool, {
    usuario_id: user.id,
    negocio_id: user.negocio_id || null,
    accion: 'login_fallido',
    tabla: 'usuarios',
    referencia_id: user.id,
    antes: null,
    despues: { motivo, ip: request.ip, user_agent: request.headers['user-agent'] || null, ...extra },
  })
}

// Login dueña: usuario + contraseña
const loginAdmin = async (request, reply, fastify) => {
  const { usuario, password } = request.body

  if (!usuario || !password) {
    return reply.code(400).send({ error: 'Usuario y contraseña requeridos' })
  }

  try {
    const result = await pool.query(
      `SELECT id, nombre, rol, password_hash, negocio_id,
              intentos_fallidos, intentos_inicio, bloqueado_hasta
       FROM usuarios WHERE nombre = $1 AND rol = $2`,
      [usuario, 'admin']
    )

    if (result.rows.length === 0) {
      return reply.code(401).send({ error: GENERIC_ERROR })
    }

    const user = result.rows[0]

    if (isLocked(user)) {
      await auditLoginFail(user, request, 'cuenta_bloqueada')
      return reply.code(401).send({ error: GENERIC_ERROR })
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash)

    if (!passwordMatch) {
      const { newAttempts, newLockoutUntil } = await registerFailedAttempt(user)
      await auditLoginFail(user, request, 'password_incorrecto', { intentos: newAttempts, bloqueado: !!newLockoutUntil })
      return reply.code(401).send({ error: GENERIC_ERROR })
    }

    await resetAttempts(user.id)

    const token = fastify.jwt.sign(
      { id: user.id, nombre: user.nombre, rol: user.rol, jti: crypto.randomUUID() },
      { expiresIn: '7d' }
    )

    return reply.send({
      token,
      usuario: { id: user.id, nombre: user.nombre, rol: user.rol }
    })
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error en el servidor' })
  }
}

// Login cajero: usuario + pin (por negocio)
const loginCajero = async (request, reply, fastify) => {
  const { usuario, pin, negocio_id } = request.body

  if (!usuario || !pin || !negocio_id) {
    return reply.code(400).send({ error: 'Usuario, PIN y negocio requeridos' })
  }

  try {
    const result = await pool.query(
      `SELECT u.id, u.nombre, u.pin, u.pin_hash, u.rol,
              u.intentos_fallidos, u.intentos_inicio, u.bloqueado_hasta,
              COALESCE(u.permisos, '{}') AS permisos,
              n.id AS negocio_id, n.nombre AS negocio_nombre,
              n.ticket_nombre, n.ticket_slogan, n.ticket_telefono, n.ticket_pie
       FROM usuarios u
       JOIN negocios n ON n.id = $2
       WHERE u.nombre = $1
         AND u.activo = true
         AND (
           (u.rol = 'cajero' AND u.negocio_id = $2) OR
           (u.rol = 'admin'  AND (u.pin IS NOT NULL OR u.pin_hash IS NOT NULL))
         )`,
      [usuario, negocio_id]
    )

    if (result.rows.length === 0) {
      return reply.code(401).send({ error: GENERIC_ERROR })
    }

    const user = result.rows[0]

    if (isLocked(user)) {
      await auditLoginFail(user, request, 'cuenta_bloqueada')
      return reply.code(401).send({ error: GENERIC_ERROR })
    }

    let pinMatch = false
    if (user.pin_hash) {
      pinMatch = await bcrypt.compare(pin, user.pin_hash)
    } else if (user.pin) {
      pinMatch = user.pin === pin
      if (pinMatch) {
        const hash = await bcrypt.hash(pin, 10)
        await pool.query('UPDATE usuarios SET pin_hash = $1, pin = NULL WHERE id = $2', [hash, user.id])
      }
    }

    if (!pinMatch) {
      const { newAttempts, newLockoutUntil } = await registerFailedAttempt(user)
      await auditLoginFail(user, request, 'pin_incorrecto', { intentos: newAttempts, bloqueado: !!newLockoutUntil })
      return reply.code(401).send({ error: GENERIC_ERROR })
    }

    await resetAttempts(user.id)

    const token = fastify.jwt.sign(
      { id: user.id, nombre: user.nombre, rol: user.rol, negocio_id: user.negocio_id, permisos: user.permisos, jti: crypto.randomUUID() },
      { expiresIn: '8h' }
    )

    return reply.send({
      token,
      usuario: {
        id: user.id,
        nombre: user.nombre,
        rol: user.rol,
        negocio_id: user.negocio_id,
        negocio_nombre: user.negocio_nombre,
        permisos: user.permisos,
        ticket_nombre: user.ticket_nombre,
        ticket_slogan: user.ticket_slogan,
        ticket_telefono: user.ticket_telefono,
        ticket_pie: user.ticket_pie,
      }
    })
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error en el servidor' })
  }
}

// Usuario actual con permisos frescos de BD
const me = async (request, reply) => {
  const { id, negocio_id: tokenNegocioId } = request.user
  try {
    const result = await pool.query(
      `SELECT u.id, u.nombre, u.rol, u.activo,
              COALESCE(u.negocio_id, $2) AS negocio_id,
              COALESCE(u.permisos, '{}') AS permisos,
              n.nombre AS negocio_nombre,
              n.ticket_nombre, n.ticket_slogan, n.ticket_telefono, n.ticket_pie
       FROM usuarios u
       LEFT JOIN negocios n ON n.id = COALESCE(u.negocio_id, $2)
       WHERE u.id = $1`,
      [id, tokenNegocioId]
    )
    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'Usuario no encontrado' })
    }
    const u = result.rows[0]
    if (!u.activo) {
      return reply.code(403).send({ error: 'Usuario desactivado' })
    }
    return reply.send(u)
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al obtener usuario' })
  }
}

// Autorización temporal: admin teclea su PIN para autorizar una acción puntual al cajero.
// Devuelve un JWT de 5min con sólo el permiso solicitado y flag `temporal`.
// Quien ejecuta la acción sigue siendo el cajero — el override sólo desbloquea el permiso.
const autorizacionTemporal = async (request, reply, fastify) => {
  const { admin_usuario, admin_pin, permiso, negocio_id } = request.body || {}

  if (!admin_usuario || !admin_pin || !permiso || !negocio_id) {
    return reply.code(400).send({ error: 'admin_usuario, admin_pin, permiso y negocio_id requeridos' })
  }

  try {
    const result = await pool.query(
      `SELECT id, nombre, rol, pin, pin_hash,
              intentos_fallidos, intentos_inicio, bloqueado_hasta
       FROM usuarios
       WHERE nombre = $1 AND rol = 'admin' AND activo = true
         AND (pin IS NOT NULL OR pin_hash IS NOT NULL)`,
      [admin_usuario]
    )

    if (result.rows.length === 0) {
      return reply.code(401).send({ error: GENERIC_ERROR })
    }

    const admin = result.rows[0]

    if (isLocked(admin)) {
      await auditLoginFail(admin, request, 'cuenta_bloqueada', { contexto: 'autorizacion_temporal' })
      return reply.code(401).send({ error: GENERIC_ERROR })
    }

    let pinMatch = false
    if (admin.pin_hash) {
      pinMatch = await bcrypt.compare(admin_pin, admin.pin_hash)
    } else if (admin.pin) {
      pinMatch = admin.pin === admin_pin
      if (pinMatch) {
        const hash = await bcrypt.hash(admin_pin, 10)
        await pool.query('UPDATE usuarios SET pin_hash = $1, pin = NULL WHERE id = $2', [hash, admin.id])
      }
    }

    if (!pinMatch) {
      const { newAttempts, newLockoutUntil } = await registerFailedAttempt(admin)
      await auditLoginFail(admin, request, 'pin_incorrecto', {
        contexto: 'autorizacion_temporal',
        intentos: newAttempts,
        bloqueado: !!newLockoutUntil,
      })
      return reply.code(401).send({ error: GENERIC_ERROR })
    }

    await resetAttempts(admin.id)

    const cajero = request.user
    const token = fastify.jwt.sign(
      {
        id: admin.id,
        nombre: admin.nombre,
        rol: 'admin',
        negocio_id: Number(negocio_id),
        permisos: { [permiso]: true },
        temporal: true,
        autorizado_por: admin.id,
        cajero_id: cajero?.id || null,
        jti: crypto.randomUUID(),
      },
      { expiresIn: '5m' }
    )

    await auditService.registrar(pool, {
      usuario_id: admin.id,
      negocio_id: Number(negocio_id),
      accion: 'autorizacion_temporal',
      tabla: 'usuarios',
      referencia_id: cajero?.id || null,
      antes: null,
      despues: { permiso, cajero_id: cajero?.id || null, ip: request.ip },
    })

    return reply.send({ token, expira_en: 5 * 60, permiso })
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error en el servidor' })
  }
}

// Logout: revoca el JWT actual hasta su expiración natural.
const logout = async (request, reply) => {
  try {
    const { jti, exp, id } = request.user || {}
    if (!jti || !exp) {
      return reply.code(400).send({ error: 'Token sin jti/exp' })
    }
    await tokenRevokeService.revoke({
      jti,
      usuario_id: id,
      expira_en: new Date(exp * 1000),
    })
    return reply.send({ ok: true })
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al cerrar sesión' })
  }
}

module.exports = { loginAdmin, loginCajero, me, logout, autorizacionTemporal }
