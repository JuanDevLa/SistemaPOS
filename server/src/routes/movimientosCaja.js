const { registrar, listar } = require('../controllers/movimientosCajaController')
const { verifyJWT, verifyPermiso } = require('../middleware/auth')

async function movimientosCajaRoutes(fastify) {
  // POST: el controller decide la clave de permiso según tipo (entrada_efectivo / salida_efectivo)
  fastify.post('/movimientos-caja', { preHandler: verifyJWT }, registrar)
  fastify.get('/movimientos-caja',  { preHandler: [verifyJWT, verifyPermiso('ver_reportes')] }, listar)
}

module.exports = movimientosCajaRoutes
