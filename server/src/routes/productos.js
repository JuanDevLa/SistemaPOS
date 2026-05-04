const { listar, buscar, obtener, crear, editar, desactivar, importar, catalogo } = require('../controllers/productosController')
const { verifyJWT, verifyPermiso } = require('../middleware/auth')

async function productosRoutes(fastify) {
  // Todos los cajeros necesitan buscar y ver catálogo para vender
  fastify.get('/productos/catalogo', { preHandler: verifyJWT }, catalogo)
  fastify.get('/productos/buscar',   { preHandler: verifyJWT }, buscar)

  fastify.get('/productos',     { preHandler: [verifyJWT, verifyPermiso('modificar_productos')] }, listar)
  fastify.get('/productos/:id', { preHandler: [verifyJWT, verifyPermiso('modificar_productos')] }, obtener)
  fastify.post('/productos',    { preHandler: [verifyJWT, verifyPermiso('crear_productos')]     }, crear)
  fastify.put('/productos/:id', { preHandler: [verifyJWT, verifyPermiso('modificar_productos')] }, editar)
  fastify.delete('/productos/:id',     { preHandler: [verifyJWT, verifyPermiso('eliminar_productos')] }, desactivar)
  fastify.post('/productos/importar',  { preHandler: [verifyJWT, verifyPermiso('crear_productos')]    }, importar)
}

module.exports = productosRoutes
