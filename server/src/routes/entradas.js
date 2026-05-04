const { crear, obtener, listar, sugeridas } = require('../controllers/entradasController')
const { verifyJWT, verifyPermiso } = require('../middleware/auth')

async function entradasRoutes(fastify) {
  fastify.post('/entradas',           { preHandler: [verifyJWT, verifyPermiso('agregar_mercancia')] }, crear)
  fastify.get('/entradas',            { preHandler: [verifyJWT, verifyPermiso('agregar_mercancia')] }, listar)
  fastify.get('/entradas/sugeridas',  { preHandler: [verifyJWT, verifyPermiso('agregar_mercancia')] }, sugeridas)
  fastify.get('/entradas/:id',        { preHandler: [verifyJWT, verifyPermiso('agregar_mercancia')] }, obtener)
}

module.exports = entradasRoutes
