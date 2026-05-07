const ctrl = require('../controllers/licenciasController')

const verifyMasterKey = async (request, reply) => {
  const key = request.headers['x-master-key']
  if (!key || key !== process.env.MASTER_ADMIN_KEY) {
    return reply.code(401).send({ error: 'No autorizado' })
  }
}

module.exports = async (fastify) => {
  // Endpoints públicos (la clave actúa como token)
  fastify.post('/licencias/activar',  { schema: { body: { type: 'object', required: ['clave', 'hardware_id'], properties: { clave: { type: 'string' }, hardware_id: { type: 'string' }, hostname: { type: 'string' } } } } }, ctrl.activar)
  fastify.post('/licencias/validar',  { schema: { body: { type: 'object', required: ['clave', 'hardware_id'], properties: { clave: { type: 'string' }, hardware_id: { type: 'string' } } } } }, ctrl.validar)

  // Endpoints de administración (requieren X-Master-Key)
  fastify.post('/licencias/admin/crear',           { preHandler: [verifyMasterKey] }, ctrl.crear)
  fastify.get('/licencias/admin/lista',            { preHandler: [verifyMasterKey] }, ctrl.listar)
  fastify.delete('/licencias/admin/maquina/:id',   { preHandler: [verifyMasterKey] }, ctrl.desactivarMaquina)
}
