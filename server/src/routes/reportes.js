const { ventasReporte, productosVendidos } = require('../controllers/reportesController')
const { verifyJWT, verifyPermiso } = require('../middleware/auth')

async function reportesRoutes(fastify) {
  fastify.get('/reportes/ventas',             { preHandler: [verifyJWT, verifyPermiso('ver_reportes')]            }, ventasReporte)
  fastify.get('/reportes/productos-vendidos', { preHandler: [verifyJWT, verifyPermiso('ver_reporte_ventas')] }, productosVendidos)
}

module.exports = reportesRoutes
