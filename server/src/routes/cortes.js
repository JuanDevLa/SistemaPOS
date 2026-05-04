const { abrir, cerrar, forzarCierre, listar, obtener, corteDia, turnoAbierto, snapshot } = require('../controllers/cortesController')
const { verifyJWT, verifyPermiso } = require('../middleware/auth')

async function cortesRoutes(fastify) {
  fastify.post('/cortes',           { preHandler: [verifyJWT, verifyPermiso('corte_propio')] }, abrir)
  fastify.put('/cortes/:id/cerrar', { preHandler: [verifyJWT, verifyPermiso('corte_propio')] }, cerrar)
  fastify.post('/cortes/:id/forzar-cierre', { preHandler: [verifyJWT] }, forzarCierre)
  fastify.get('/cortes',            { preHandler: [verifyJWT, verifyPermiso('corte_propio')] }, listar)
  fastify.get('/cortes/snapshot',   { preHandler: [verifyJWT, verifyPermiso('corte_propio')] }, snapshot)
  fastify.get('/cortes/dia',        { preHandler: [verifyJWT, verifyPermiso('corte_dia')]    }, corteDia)
  fastify.get('/cortes/abierto',    { preHandler: [verifyJWT, verifyPermiso('corte_propio')] }, turnoAbierto)
  fastify.get('/cortes/:id',        { preHandler: [verifyJWT, verifyPermiso('corte_propio')] }, obtener)
}

module.exports = cortesRoutes
