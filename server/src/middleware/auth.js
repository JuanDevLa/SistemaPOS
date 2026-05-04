const tokenRevokeService = require('../services/tokenRevokeService')

const verifyJWT = async (request, reply) => {
  try {
    await request.jwtVerify()
    if (request.user?.jti && tokenRevokeService.isRevoked(request.user.jti)) {
      return reply.code(401).send({ error: 'Token revocado' })
    }
  } catch (err) {
    return reply.code(401).send({ error: 'Token inválido o expirado' })
  }
}

// Factory: devuelve un preHandler que requiere el permiso dado.
// Siempre aplicar DESPUÉS de verifyJWT en el array de preHandlers.
//
// Header opcional `X-Auth-Override`: JWT temporal emitido por /auth/autorizacion-temporal.
// Si llega válido, no autenticado y temporal, desbloquea el permiso solicitado SIN reemplazar
// `request.user` — el cajero original sigue siendo el actor para auditoría.
const verifyPermiso = (clave) => async (request, reply) => {
  const user = request.user
  if (!user) return reply.code(401).send({ error: 'No autenticado' })
  if (user.rol === 'admin') return
  if (user.permisos?.[clave] === true) return

  const override = request.headers['x-auth-override']
  if (override) {
    try {
      const payload = await request.server.jwt.verify(override)
      if (payload?.temporal === true && payload?.permisos?.[clave] === true) {
        if (payload.jti && tokenRevokeService.isRevoked(payload.jti)) {
          return reply.code(403).send({ error: `Sin permiso: ${clave}` })
        }
        if (payload.negocio_id !== user.negocio_id) {
          return reply.code(403).send({ error: `Sin permiso: ${clave}` })
        }
        request.adminOverride = { autorizado_por: payload.autorizado_por, permiso: clave }
        return
      }
    } catch (_) {
      // override inválido: cae al 403 normal
    }
  }

  return reply.code(403).send({ error: `Sin permiso: ${clave}` })
}

// Rutas exclusivas de administrador (gestión de usuarios, etc.)
const verifyAdmin = async (request, reply) => {
  try { await request.jwtVerify() } catch { return reply.code(401).send({ error: 'No autenticado' }) }
  if (request.user?.rol !== 'admin') return reply.code(403).send({ error: 'Solo administradores' })
}

// Admin o supervisor pueden gestionar cajeros
const verifyAdminOrSupervisor = async (request, reply) => {
  try { await request.jwtVerify() } catch { return reply.code(401).send({ error: 'No autenticado' }) }
  if (request.user?.rol !== 'admin' && request.user?.rol !== 'supervisor') {
    return reply.code(403).send({ error: 'Se requiere rol administrador o supervisor' })
  }
}

module.exports = { verifyJWT, verifyPermiso, verifyAdmin, verifyAdminOrSupervisor }
