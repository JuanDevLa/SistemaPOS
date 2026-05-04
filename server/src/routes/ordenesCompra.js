const { listar, detalle, crear, recibir, cancelar } = require('../controllers/ordenesCompraController')
const { verifyJWT, verifyPermiso } = require('../middleware/auth')

module.exports = async (fastify) => {
  fastify.get('/ordenes-compra',               { preHandler: [verifyJWT, verifyPermiso('crear_ordenes_compra')]   }, listar)
  fastify.get('/ordenes-compra/:id',           { preHandler: [verifyJWT, verifyPermiso('crear_ordenes_compra')]   }, detalle)
  fastify.post('/ordenes-compra',              { preHandler: [verifyJWT, verifyPermiso('crear_ordenes_compra')]   }, crear)
  fastify.put('/ordenes-compra/:id/recibir',   { preHandler: [verifyJWT, verifyPermiso('recibir_ordenes_compra')] }, recibir)
  fastify.put('/ordenes-compra/:id/cancelar',  { preHandler: [verifyJWT, verifyPermiso('crear_ordenes_compra')]   }, cancelar)
}
