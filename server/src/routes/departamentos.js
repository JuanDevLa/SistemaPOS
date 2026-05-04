const { listar, crear, editar, desactivar } = require('../controllers/departamentosController')
const { verifyJWT, verifyPermiso } = require('../middleware/auth')

module.exports = async (fastify) => {
  // GET solo requiere autenticación: el form de productos lo necesita.
  fastify.get('/departamentos',        { preHandler: verifyJWT }, listar)
  fastify.post('/departamentos',       { preHandler: [verifyJWT, verifyPermiso('modificar_varios')] }, crear)
  fastify.put('/departamentos/:id',    { preHandler: [verifyJWT, verifyPermiso('modificar_varios')] }, editar)
  fastify.delete('/departamentos/:id', { preHandler: [verifyJWT, verifyPermiso('modificar_varios')] }, desactivar)
}
