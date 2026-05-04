const {
  listar, actualizarFolios, actualizarTicket,
  obtenerConfig, actualizarConfig,
  listarFormasPago, guardarFormasPago,
  crear, actualizar, eliminar,
  exportarBackup,
} = require('../controllers/negociosController')
const { verifyJWT, verifyPermiso } = require('../middleware/auth')

module.exports = async (fastify) => {
  fastify.get('/negocios',            { preHandler: verifyJWT }, listar)
  fastify.post('/negocios',           { preHandler: [verifyJWT, verifyPermiso('cambiar_config')] }, crear)
  fastify.put('/negocios/:id',        { preHandler: [verifyJWT, verifyPermiso('cambiar_config')] }, actualizar)
  fastify.delete('/negocios/:id',     { preHandler: [verifyJWT, verifyPermiso('cambiar_config')] }, eliminar)
  fastify.get('/negocios/:id/config', { preHandler: verifyJWT }, obtenerConfig)
  fastify.put('/negocios/:id/config', { preHandler: [verifyJWT, verifyPermiso('cambiar_config')] }, actualizarConfig)
  fastify.put('/negocios/:id/folios', { preHandler: [verifyJWT, verifyPermiso('cambiar_config')] }, actualizarFolios)
  fastify.put('/negocios/:id/ticket', { preHandler: [verifyJWT, verifyPermiso('cambiar_config')] }, actualizarTicket)
  fastify.get('/negocios/:id/formas-pago', { preHandler: verifyJWT }, listarFormasPago)
  fastify.put('/negocios/:id/formas-pago', { preHandler: [verifyJWT, verifyPermiso('cambiar_config')] }, guardarFormasPago)
  fastify.get('/admin/exportar',           { preHandler: [verifyJWT, verifyPermiso('cambiar_config')] }, exportarBackup)
}
