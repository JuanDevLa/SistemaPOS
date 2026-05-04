const { listar, crear, editar, eliminar } = require('../controllers/proveedoresController')
const { verifyJWT, verifyPermiso } = require('../middleware/auth')

async function proveedoresRoutes(fastify) {
  // GET abierto: lo consume el form de entradas/órdenes de compra.
  fastify.get('/proveedores',        { preHandler: verifyJWT }, listar)
  fastify.post('/proveedores',       { preHandler: [verifyJWT, verifyPermiso('modificar_varios')] }, crear)
  fastify.put('/proveedores/:id',    { preHandler: [verifyJWT, verifyPermiso('modificar_varios')] }, editar)
  fastify.delete('/proveedores/:id', { preHandler: [verifyJWT, verifyPermiso('modificar_varios')] }, eliminar)
}

module.exports = proveedoresRoutes
