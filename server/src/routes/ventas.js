const { crear, obtener, listar, cancelar, devolucion } = require('../controllers/ventasController')
const { verifyJWT, verifyPermiso } = require('../middleware/auth')

async function ventasRoutes(fastify) {
  fastify.post('/ventas',                 { preHandler: [verifyJWT, verifyPermiso('cobrar_ticket')]    }, crear)
  fastify.get('/ventas',                  { preHandler: [verifyJWT, verifyPermiso('historial_ventas')] }, listar)
  fastify.get('/ventas/:id',              { preHandler: [verifyJWT, verifyPermiso('historial_ventas')] }, obtener)
  fastify.put('/ventas/:id/cancelar',     { preHandler: [verifyJWT, verifyPermiso('cancelar_devolver')] }, cancelar)
  fastify.post('/ventas/:id/devolucion',  { preHandler: [verifyJWT, verifyPermiso('cancelar_devolver')] }, devolucion)
}

module.exports = ventasRoutes
