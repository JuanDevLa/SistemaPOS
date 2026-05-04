const { crear, listar, obtener } = require('../controllers/historialCortesController')
const { verifyJWT, verifyPermiso } = require('../middleware/auth')

module.exports = async (fastify) => {
  fastify.post('/historial-cortes',     { preHandler: [verifyJWT, verifyPermiso('corte_propio')] }, crear)
  fastify.get('/historial-cortes',      { preHandler: [verifyJWT, verifyPermiso('corte_propio')] }, listar)
  fastify.get('/historial-cortes/:id',  { preHandler: [verifyJWT, verifyPermiso('corte_propio')] }, obtener)
}
