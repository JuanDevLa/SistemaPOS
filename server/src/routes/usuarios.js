const { listar, crear, editar, toggleActivo } = require('../controllers/usuariosController')
const { verifyJWT, verifyAdmin, verifyAdminOrSupervisor } = require('../middleware/auth')

async function usuariosRoutes(fastify) {
  fastify.get('/usuarios',              { preHandler: [verifyJWT, verifyAdminOrSupervisor] }, listar)
  fastify.post('/usuarios',             { preHandler: [verifyJWT, verifyAdminOrSupervisor] }, crear)
  fastify.put('/usuarios/:id',          { preHandler: [verifyJWT, verifyAdminOrSupervisor] }, editar)
  fastify.patch('/usuarios/:id/toggle', { preHandler: [verifyJWT, verifyAdminOrSupervisor] }, toggleActivo)
}

module.exports = usuariosRoutes
