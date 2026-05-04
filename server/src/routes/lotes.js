const { listar, caducidades, crearInicial } = require('../controllers/lotesController')
const { verifyJWT } = require('../middleware/auth')

module.exports = async (fastify) => {
  fastify.get('/lotes',             { preHandler: verifyJWT }, listar)
  fastify.get('/lotes/caducidades', { preHandler: verifyJWT }, caducidades)
  fastify.post('/lotes',            { preHandler: verifyJWT }, crearInicial)
}
