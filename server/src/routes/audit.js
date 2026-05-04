const { listar } = require('../controllers/auditController')
const { verifyJWT, verifyAdminOrSupervisor } = require('../middleware/auth')

async function auditRoutes(fastify) {
  fastify.get('/audit-logs', { preHandler: [verifyJWT, verifyAdminOrSupervisor] }, listar)
}

module.exports = auditRoutes
