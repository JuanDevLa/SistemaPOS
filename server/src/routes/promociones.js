const { listar, crear, eliminar } = require('../controllers/promocionesController')
const { verifyJWT, verifyPermiso } = require('../middleware/auth')

async function promocionesRoutes(fastify) {
  fastify.get('/promociones',        { preHandler: [verifyJWT, verifyPermiso('crear_promociones')] }, listar)
  fastify.post('/promociones',       { preHandler: [verifyJWT, verifyPermiso('crear_promociones')] }, crear)
  fastify.delete('/promociones/:id', { preHandler: [verifyJWT, verifyPermiso('crear_promociones')] }, eliminar)
}

module.exports = promocionesRoutes
