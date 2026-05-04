const { resumen } = require('../controllers/dashboardController')
const { verifyJWT, verifyPermiso } = require('../middleware/auth')

async function dashboardRoutes(fastify) {
  fastify.get('/dashboard', { preHandler: [verifyJWT, verifyPermiso('ver_reportes')] }, resumen)
}

module.exports = dashboardRoutes
