const { verifyJWT } = require('../middleware/auth')
const {
  listarDispositivos,
  crearIntentoPago,
  obtenerIntentoPago,
  cancelarIntentoPago,
} = require('../controllers/mpController')

async function mpRoutes(fastify) {
  fastify.get('/api/mp/devices', { preHandler: [verifyJWT] }, listarDispositivos)

  fastify.post('/api/mp/payment-intents', { preHandler: [verifyJWT] }, crearIntentoPago)

  fastify.get('/api/mp/payment-intents/:id', { preHandler: [verifyJWT] }, obtenerIntentoPago)

  fastify.delete('/api/mp/payment-intents', { preHandler: [verifyJWT] }, cancelarIntentoPago)
}

module.exports = mpRoutes
