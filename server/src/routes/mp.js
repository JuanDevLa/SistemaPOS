const { verifyJWT, verifyPermiso } = require('../middleware/auth')
const {
  listarDispositivos,
  crearIntentoPago,
  obtenerIntentoPago,
  cancelarIntentoPago,
  obtenerEstadoIntento,
  recibirWebhook,
} = require('../controllers/mpController')

async function mpRoutes(fastify) {
  fastify.get('/mp/devices', { preHandler: [verifyJWT] }, listarDispositivos)
  fastify.post('/mp/payment-intents', { preHandler: [verifyJWT, verifyPermiso('cobrar_ticket')] }, crearIntentoPago)
  fastify.get('/mp/payment-intents/:id', { preHandler: [verifyJWT] }, obtenerIntentoPago)
  fastify.get('/mp/payment-intents/:id/estado', { preHandler: [verifyJWT] }, obtenerEstadoIntento)
  fastify.delete('/mp/payment-intents', { preHandler: [verifyJWT, verifyPermiso('cobrar_ticket')] }, cancelarIntentoPago)

  // Webhook público — MP debe poder llegar sin auth.
  // La protección está en la validación de firma HMAC dentro del handler.
  fastify.post('/mp/webhook', {
    config: { rateLimit: { max: 300, timeWindow: '1 minute' } },
  }, recibirWebhook)
}

module.exports = mpRoutes
