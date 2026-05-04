const { listar, crear, actualizar, eliminar } = require('../controllers/unidadesController')
const { verifyJWT, verifyPermiso } = require('../middleware/auth')

module.exports = async (fastify) => {
  fastify.get('/unidades',     { preHandler: verifyJWT }, listar)
  fastify.post('/unidades',    { preHandler: [verifyJWT, verifyPermiso('cambiar_config')] }, crear)
  fastify.put('/unidades/:id', { preHandler: [verifyJWT, verifyPermiso('cambiar_config')] }, actualizar)
  fastify.delete('/unidades/:id', { preHandler: [verifyJWT, verifyPermiso('cambiar_config')] }, eliminar)
}
