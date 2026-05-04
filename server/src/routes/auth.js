const { loginAdmin, loginCajero, me, logout, autorizacionTemporal } = require('../controllers/authController')
const { verifyJWT } = require('../middleware/auth')

async function authRoutes(fastify) {
  const loginRateLimit = { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }

  fastify.post('/auth/admin', loginRateLimit, async (request, reply) => {
    return loginAdmin(request, reply, fastify)
  })

  fastify.post('/auth/cajero', loginRateLimit, async (request, reply) => {
    return loginCajero(request, reply, fastify)
  })

  fastify.get('/auth/me', { preHandler: verifyJWT }, me)
  fastify.post('/auth/logout', { preHandler: verifyJWT }, logout)

  // Autorización temporal por PIN admin: 5 req/min/IP para frenar fuerza bruta del PIN.
  fastify.post(
    '/auth/autorizacion-temporal',
    { preHandler: verifyJWT, config: { rateLimit: { max: 5, timeWindow: '1 minute' } } },
    async (request, reply) => autorizacionTemporal(request, reply, fastify)
  )
}

module.exports = authRoutes
