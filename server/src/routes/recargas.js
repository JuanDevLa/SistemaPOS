const {
  listarCompanias,
  procesarRecarga,
  consultarServicio,
  pagarServicio,
  listarHistorial,
  obtenerConfig,
  actualizarConfig
} = require('../controllers/recargasController')
const { verifyJWT, verifyPermiso } = require('../middleware/auth')

async function recargasRoutes(fastify) {
  // Catálogo de compañías: cualquier cajero autenticado puede listar (lo necesita la UI antes de saber si va a vender).
  fastify.get('/recargas/companias',           { preHandler: verifyJWT }, listarCompanias)
  fastify.post('/recargas/procesar',           { preHandler: verifyJWT }, procesarRecarga)
  fastify.post('/recargas/consultar-servicio', { preHandler: [verifyJWT, verifyPermiso('vender_servicios')]  }, consultarServicio)
  fastify.post('/recargas/pagar-servicio',     { preHandler: [verifyJWT, verifyPermiso('vender_servicios')]  }, pagarServicio)
  fastify.get('/recargas/historial',           { preHandler: [verifyJWT, verifyPermiso('vender_recargas')]   }, listarHistorial)
  fastify.get('/recargas/config',              { preHandler: [verifyJWT, verifyPermiso('cambiar_config')]    }, obtenerConfig)
  fastify.put('/recargas/config',              { preHandler: [verifyJWT, verifyPermiso('cambiar_config')]    }, actualizarConfig)
}

module.exports = recargasRoutes
