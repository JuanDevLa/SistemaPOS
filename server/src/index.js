require('dotenv').config()

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET ausente o muy corto (<32 chars). Aborta.')
  process.exit(1)
}

const fastify = require('fastify')({ logger: true, trustProxy: true })

const NODE_ENV = process.env.NODE_ENV || 'development'
const DEV_ORIGINS = ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173']
const corsOriginsEnv = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)
const allowedOrigins = NODE_ENV === 'production' ? corsOriginsEnv : [...corsOriginsEnv, ...DEV_ORIGINS]

if (NODE_ENV === 'production' && allowedOrigins.length === 0) {
  console.error('CORS_ORIGINS no configurada en producción. Define la lista blanca antes de arrancar.')
  process.exit(1)
}

fastify.register(require('@fastify/helmet'), {
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
})

fastify.register(require('@fastify/cors'), {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true)
    if (allowedOrigins.includes(origin)) return cb(null, true)
    return cb(new Error(`Origen no permitido: ${origin}`), false)
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
})

fastify.register(require('@fastify/jwt'), {
  secret: process.env.JWT_SECRET
})

// Rate limit dimensionado para el uso real del POS:
// - polling MP cada 2s durante un cobro (~30/min)
// - cache productos al login
// - dashboard, inventario bajo, recargas, etc.
// 1500/min deja margen cómodo para 1-2 cajas activas + admin web por la misma IP pública.
fastify.register(require('@fastify/rate-limit'), {
  global: true,
  max: 1500,
  timeWindow: '1 minute',
  allowList: NODE_ENV !== 'production' ? ['127.0.0.1', '::1'] : []
})

fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

fastify.register(require('./routes/auth'))
fastify.register(require('./routes/dashboard'))
fastify.register(require('./routes/usuarios'))
fastify.register(require('./routes/productos'))
fastify.register(require('./routes/inventario'))
fastify.register(require('./routes/ventas'))
fastify.register(require('./routes/cortes'))
fastify.register(require('./routes/historialCortes'))
fastify.register(require('./routes/entradas'))
fastify.register(require('./routes/movimientosCaja'))
fastify.register(require('./routes/clientes'))
fastify.register(require('./routes/departamentos'))
fastify.register(require('./routes/negocios'))
fastify.register(require('./routes/reportes'))
fastify.register(require('./routes/proveedores'))
fastify.register(require('./routes/recargas'))
fastify.register(require('./routes/promociones'))
fastify.register(require('./routes/listaCompras'))
fastify.register(require('./routes/ordenesCompra'))
fastify.register(require('./routes/audit'))
fastify.register(require('./routes/unidades'))
fastify.register(require('./routes/lotes'))
fastify.register(require('./routes/licencias'))
fastify.register(require('./routes/mp'))

const tokenRevokeService = require('./services/tokenRevokeService')

const start = async () => {
  try {
    await tokenRevokeService.start()
    await fastify.listen({ port: process.env.PORT || 3000, host: '0.0.0.0' })
    console.log('Servidor corriendo en puerto', process.env.PORT || 3000)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
