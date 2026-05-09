const crypto = require('crypto')
const pool = require('../db/client')

const MP_API = 'https://api.mercadopago.com'
const ESTADOS_TERMINALES = new Set(['FINISHED', 'CANCELED', 'ERROR'])

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
  if (monto > 30000) return reply.status(400).send({ error: 'No es posible procesar un pago mayor a $30,000 con terminal. Divide el pago o usa otro método.' })
  if (!device_id) return reply.status(500).send({ error: 'MP_DEVICE_ID no configurado' })

  const body = {
    amount: Math.round(monto * 100),
    additional_info: {
      external_reference: referencia_externa || `PDV-${Date.now()}`,
      print_on_terminal: true,
    },
  }

  if (process.env.MP_WEBHOOK_URL) {
    body.notification_url = process.env.MP_WEBHOOK_URL
  }

  const res = await fetch(
    `${MP_API}/point/integration-api/devices/${device_id}/payment-intents`,
    { method: 'POST', headers: mpHeaders(), body: JSON.stringify(body) }
  )
  const data = await res.json()
  if (!res.ok) return reply.status(res.status).send(data)

  // Persistimos el intent recién creado para que el POS pueda pollear /estado
  // y para que el webhook tenga una fila que actualizar.
  if (data?.id) {
    try {
      await pool.query(
        `INSERT INTO mp_intent_estados (intent_id, estado, monto, raw)
         VALUES ($1, 'OPEN', $2, $3)
         ON CONFLICT (intent_id) DO UPDATE SET monto = EXCLUDED.monto`,
        [String(data.id), monto, data]
      )
    } catch (e) { req.log?.error({ err: e }, 'No se pudo persistir mp_intent_estados') }
  }

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

// Estado autoritativo del intent: lee primero la tabla local (alimentada por webhook),
// y si aún no tiene estado terminal, hace fallback a la API de MP.
async function obtenerEstadoIntento(req, reply) {
  const { id } = req.params

  try {
    const local = await pool.query(
      'SELECT intent_id, estado, payment_id, payment_state, raw FROM mp_intent_estados WHERE intent_id = $1',
      [id]
    )
    if (local.rows.length > 0 && ESTADOS_TERMINALES.has(local.rows[0].estado)) {
      const r = local.rows[0]
      return reply.send({
        id: r.intent_id,
        status: r.estado,
        payment: r.payment_id ? { id: r.payment_id, state: r.payment_state } : null,
        fuente: 'webhook',
      })
    }

    // Fallback: la fuente local todavía no tiene estado terminal → preguntar a MP
    const res = await fetch(`${MP_API}/point/integration-api/payment-intents/${id}`, {
      headers: mpHeaders(),
    })
    const data = await res.json()
    if (!res.ok) {
      // Si MP devuelve 404 pero tenemos algo local, devolvemos lo local como mejor info disponible
      if (local.rows.length > 0) {
        const r = local.rows[0]
        return reply.send({
          id: r.intent_id,
          status: r.estado,
          payment: r.payment_id ? { id: r.payment_id, state: r.payment_state } : null,
          fuente: 'local',
        })
      }
      return reply.status(res.status).send(data)
    }

    // Refrescamos la tabla con el estado actual reportado por MP
    if (data?.id) {
      await pool.query(
        `INSERT INTO mp_intent_estados (intent_id, estado, payment_id, payment_state, raw)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (intent_id) DO UPDATE SET
           estado        = EXCLUDED.estado,
           payment_id    = COALESCE(EXCLUDED.payment_id,    mp_intent_estados.payment_id),
           payment_state = COALESCE(EXCLUDED.payment_state, mp_intent_estados.payment_state),
           raw           = EXCLUDED.raw`,
        [String(data.id), data.status || null, data.payment?.id ? String(data.payment.id) : null, data.payment?.state || null, data]
      ).catch(e => req.log?.error({ err: e }, 'No se pudo refrescar mp_intent_estados'))
    }

    return reply.send({ ...data, fuente: 'mp' })
  } catch (err) {
    req.log?.error({ err }, 'Error en obtenerEstadoIntento')
    return reply.code(500).send({ error: 'Error al consultar estado de pago' })
  }
}

// Valida la firma HMAC-SHA256 que MP envía en x-signature.
// Manifest oficial: id:<dataId>;request-id:<requestId>;ts:<timestamp>;
function validarFirmaMP(headers, dataId) {
  const signatureHeader = headers['x-signature']
  const requestId = headers['x-request-id']
  const secret = process.env.MP_WEBHOOK_SECRET

  if (!secret) return { ok: false, motivo: 'MP_WEBHOOK_SECRET no configurado' }
  if (!signatureHeader || !requestId) return { ok: false, motivo: 'Faltan headers de firma' }

  // Formato: "ts=1704899999,v1=abc123..."
  const parts = String(signatureHeader).split(',').reduce((acc, part) => {
    const [k, v] = part.split('=')
    if (k && v) acc[k.trim()] = v.trim()
    return acc
  }, {})
  const ts = parts.ts
  const v1 = parts.v1
  if (!ts || !v1) return { ok: false, motivo: 'Firma malformada' }

  // Anti-replay: rechazar timestamps de hace más de 5 minutos
  const ageMs = Math.abs(Date.now() - Number(ts) * 1000)
  if (Number.isFinite(ageMs) && ageMs > 5 * 60 * 1000) {
    return { ok: false, motivo: 'Timestamp fuera de ventana' }
  }

  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`
  const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex')

  try {
    const a = Buffer.from(v1, 'hex')
    const b = Buffer.from(expected, 'hex')
    if (a.length !== b.length) return { ok: false, motivo: 'Firma no coincide' }
    if (!crypto.timingSafeEqual(a, b)) return { ok: false, motivo: 'Firma no coincide' }
    return { ok: true }
  } catch {
    return { ok: false, motivo: 'Firma inválida' }
  }
}

// Webhook público: MP nos avisa cuando un intent finaliza.
// 1) Validamos firma. 2) Consultamos a MP para no confiar en el payload.
// 3) UPSERT en mp_intent_estados. 4) 200 OK rápido (MP reintenta si tarda).
async function recibirWebhook(req, reply) {
  const body = req.body || {}
  const dataId = body?.data?.id ? String(body.data.id) : null
  const tipo = body?.type || body?.action || null

  if (!dataId) {
    req.log?.warn({ body, headers: req.headers }, 'Webhook MP sin data.id')
    return reply.code(400).send({ error: 'data.id requerido' })
  }

  // Validar firma sólo si tenemos el secret configurado.
  // En un futuro podríamos hacer obligatorio fallar si no hay secret.
  if (process.env.MP_WEBHOOK_SECRET) {
    const verif = validarFirmaMP(req.headers, dataId)
    if (!verif.ok) {
      req.log?.warn({ motivo: verif.motivo, dataId, tipo }, 'Webhook MP firma inválida')
      return reply.code(401).send({ error: 'Firma inválida' })
    }
  }

  try {
    // El campo data.id puede ser intent_id (point_integration_wh) o payment_id (payment).
    // Para Point Smart usamos el endpoint de payment-intents; es lo que el POS espera.
    const isIntent = String(tipo).includes('point_integration') || String(tipo).includes('integration')

    let intentData = null
    if (isIntent) {
      const res = await fetch(`${MP_API}/point/integration-api/payment-intents/${dataId}`, {
        headers: mpHeaders(),
      })
      if (res.ok) intentData = await res.json()
    }

    if (intentData?.id) {
      await pool.query(
        `INSERT INTO mp_intent_estados (intent_id, estado, payment_id, payment_state, raw)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (intent_id) DO UPDATE SET
           estado        = EXCLUDED.estado,
           payment_id    = COALESCE(EXCLUDED.payment_id,    mp_intent_estados.payment_id),
           payment_state = COALESCE(EXCLUDED.payment_state, mp_intent_estados.payment_state),
           raw           = EXCLUDED.raw`,
        [
          String(intentData.id),
          intentData.status || null,
          intentData.payment?.id ? String(intentData.payment.id) : null,
          intentData.payment?.state || null,
          intentData,
        ]
      )
    } else {
      // Notificación de pago (no Point) o intent no recuperable: dejar registro mínimo
      // para diagnóstico. No bloqueamos al POS — el endpoint /estado seguirá pollando MP.
      await pool.query(
        `INSERT INTO mp_intent_estados (intent_id, estado, raw)
         VALUES ($1, 'WEBHOOK_RECIBIDO', $2)
         ON CONFLICT (intent_id) DO UPDATE SET raw = EXCLUDED.raw`,
        [dataId, body]
      )
    }

    return reply.code(200).send({ ok: true })
  } catch (err) {
    req.log?.error({ err }, 'Error procesando webhook MP')
    // Devolvemos 200 igualmente para que MP no reintente en bucle por errores nuestros.
    // El log queda para diagnóstico.
    return reply.code(200).send({ ok: false })
  }
}

module.exports = {
  listarDispositivos,
  crearIntentoPago,
  obtenerIntentoPago,
  cancelarIntentoPago,
  obtenerEstadoIntento,
  recibirWebhook,
}
