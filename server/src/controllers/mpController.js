const MP_API = 'https://api.mercadopago.com'

function mpHeaders() {
  return {
    Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  }
}

async function listarDispositivos(req, reply) {
  const res = await fetch(`${MP_API}/point/integration-api/devices`, {
    headers: mpHeaders(),
  })
  const data = await res.json()
  if (!res.ok) return reply.status(res.status).send(data)
  return reply.send(data)
}

async function crearIntentoPago(req, reply) {
  const { monto, referencia_externa, descripcion } = req.body ?? {}
  const device_id = process.env.MP_DEVICE_ID

  if (!monto || isNaN(monto) || monto <= 0) return reply.status(400).send({ error: 'monto es requerido y debe ser mayor a 0' })
  if (!device_id) return reply.status(500).send({ error: 'MP_DEVICE_ID no configurado' })

  const amountCents = Math.round(monto * 100)
  const body = {
    amount: amountCents,
    additional_info: {
      external_reference: referencia_externa || `PDV-${Date.now()}`,
      print_on_terminal: true,
      items: [{
        title: descripcion || 'Punto de Venta',
        quantity: 1,
        unit_price: amountCents,
      }],
    },
  }

  const res = await fetch(
    `${MP_API}/point/integration-api/devices/${device_id}/payment-intents`,
    { method: 'POST', headers: mpHeaders(), body: JSON.stringify(body) }
  )
  const data = await res.json()
  if (!res.ok) return reply.status(res.status).send(data)
  return reply.send(data)
}

async function obtenerIntentoPago(req, reply) {
  const { id } = req.params
  const res = await fetch(`${MP_API}/point/integration-api/payment-intents/${id}`, {
    headers: mpHeaders(),
  })
  const data = await res.json()
  if (!res.ok) return reply.status(res.status).send(data)
  return reply.send(data)
}

async function cancelarIntentoPago(req, reply) {
  const device_id = process.env.MP_DEVICE_ID
  if (!device_id) return reply.status(500).send({ error: 'MP_DEVICE_ID no configurado' })

  const res = await fetch(
    `${MP_API}/point/integration-api/devices/${device_id}/payment-intents`,
    { method: 'DELETE', headers: mpHeaders() }
  )
  // MP devuelve 204 sin body al cancelar exitosamente
  if (res.status === 204) return reply.status(204).send()
  const data = await res.json()
  if (!res.ok) return reply.status(res.status).send(data)
  return reply.send(data)
}

module.exports = { listarDispositivos, crearIntentoPago, obtenerIntentoPago, cancelarIntentoPago }
