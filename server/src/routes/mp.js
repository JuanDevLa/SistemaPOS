const { verifyJWT } = require('../middleware/auth')
const {
  listarDispositivos,
  crearIntentoPago,
  obtenerIntentoPago,
  cancelarIntentoPago,
} = require('../controllers/mpController')

async function mpRoutes(fastify) {
  fastify.get('/mp/devices', { preHandler: [verifyJWT] }, listarDispositivos)
  fastify.post('/mp/payment-intents', { preHandler: [verifyJWT] }, crearIntentoPago)
  fastify.get('/mp/payment-intents/:id', { preHandler: [verifyJWT] }, obtenerIntentoPago)
  fastify.delete('/mp/payment-intents', { preHandler: [verifyJWT] }, cancelarIntentoPago)
}

module.exports = mpRoutes
