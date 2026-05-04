const { listar, stockBajo, ajustar, cargaInicial, movimientos, inversion } = require('../controllers/inventarioController')
const { verifyJWT, verifyPermiso } = require('../middleware/auth')

async function inventarioRoutes(fastify) {
  fastify.get('/inventario',              { preHandler: verifyJWT }, listar)
  fastify.get('/inventario/bajo',         { preHandler: verifyJWT }, stockBajo)
  fastify.get('/inventario/movimientos',  { preHandler: verifyJWT }, movimientos)
  fastify.put('/inventario/ajustar',      { preHandler: [verifyJWT, verifyPermiso('ajustar_inventario')] }, ajustar)
  fastify.post('/inventario/carga-inicial', { preHandler: [verifyJWT, verifyPermiso('agregar_mercancia')] }, cargaInicial)
  fastify.get('/inventario/inversion',    { preHandler: [verifyJWT, verifyPermiso('ver_reportes')]       }, inversion)
}

module.exports = inventarioRoutes
