const { listar, agregar, actualizar, eliminar } = require('../controllers/listaComprasController')
const { verifyJWT, verifyPermiso } = require('../middleware/auth')

async function listaComprasRoutes(fastify) {
  fastify.get('/lista-compras',        { preHandler: [verifyJWT, verifyPermiso('crear_ordenes_compra')] }, listar)
  fastify.post('/lista-compras',       { preHandler: [verifyJWT, verifyPermiso('crear_ordenes_compra')] }, agregar)
  fastify.put('/lista-compras/:id',    { preHandler: [verifyJWT, verifyPermiso('crear_ordenes_compra')] }, actualizar)
  fastify.delete('/lista-compras/:id', { preHandler: [verifyJWT, verifyPermiso('crear_ordenes_compra')] }, eliminar)
}

module.exports = listaComprasRoutes
