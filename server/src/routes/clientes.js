const { buscar, estadoCuenta, detalleVenta, reporteSaldos, listar, crear, editar, desactivar } = require('../controllers/clientesController')
const { registrar } = require('../controllers/abonosController')
const { crear: crearCredito } = require('../controllers/creditosController')
const { verifyJWT, verifyPermiso } = require('../middleware/auth')

async function clientesRoutes(fastify) {
  // Estáticas primero (antes de /:id)
  fastify.get('/clientes/buscar',         { preHandler: verifyJWT }, buscar)
  fastify.get('/clientes/reporte-saldos', { preHandler: [verifyJWT, verifyPermiso('ver_cuentas_credito')] }, reporteSaldos)

  fastify.get('/clientes',        { preHandler: verifyJWT }, listar)
  fastify.post('/clientes',       { preHandler: [verifyJWT, verifyPermiso('clientes_crud')]   }, crear)
  fastify.put('/clientes/:id',    { preHandler: [verifyJWT, verifyPermiso('clientes_crud')]   }, editar)
  fastify.delete('/clientes/:id', { preHandler: [verifyJWT, verifyPermiso('clientes_crud')]   }, desactivar)

  fastify.get('/clientes/:id/estado-cuenta',        { preHandler: [verifyJWT, verifyPermiso('cobrar_credito')] }, estadoCuenta)
  fastify.get('/clientes/venta/:venta_id/detalle',  { preHandler: [verifyJWT, verifyPermiso('cobrar_credito')] }, detalleVenta)

  fastify.post('/abonos',   { preHandler: [verifyJWT, verifyPermiso('cobrar_credito')] }, registrar)
  fastify.post('/creditos', { preHandler: [verifyJWT, verifyPermiso('credito_clientes')]    }, crearCredito)
}

module.exports = clientesRoutes
