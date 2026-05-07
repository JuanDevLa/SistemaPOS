const os = require('os')
const crypto = require('crypto')
const fs = require('fs')

// ─── Clave maestra ────────────────────────────────────────────────────────────
// Esta clave siempre funciona, incluso sin servidor ni internet.
// Úsala para demos, instalaciones propias y clientes VIP.
// CAMBIA ESTE VALOR antes de distribuir al público.
const PDV_MASTER_KEY = 'Noriega-Dev-99$Master'

// Días sin conexión antes de mostrar advertencia / bloquear
const GRACE_WARN  = 3
const GRACE_BLOCK = 7

let _db         = null
let _getApiUrl  = null
let _configPath = null

const init = (db, getApiUrlFn, configPath) => {
  _db        = db
  _getApiUrl = getApiUrlFn
  _configPath = configPath
}

// ─── Hardware ID ─────────────────────────────────────────────────────────────
// SHA256 de MAC + hostname — estable mientras no cambies la tarjeta de red.
const getHardwareId = () => {
  const ifaces = os.networkInterfaces()
  let mac = ''
  outer: for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (!iface.internal && iface.mac && iface.mac !== '00:00:00:00:00:00') {
        mac = iface.mac
        break outer
      }
    }
  }
  return crypto.createHash('sha256')
    .update(`${mac}|${os.hostname()}`)
    .digest('hex')
    .substring(0, 32)
}

// ─── Config (clave guardada en config.json) ───────────────────────────────────
const loadClave = () => {
  try {
    if (fs.existsSync(_configPath)) {
      return JSON.parse(fs.readFileSync(_configPath, 'utf8')).licencia_clave || null
    }
  } catch {}
  return null
}

const saveClave = (clave) => {
  try {
    let cfg = {}
    if (fs.existsSync(_configPath)) cfg = JSON.parse(fs.readFileSync(_configPath, 'utf8'))
    cfg.licencia_clave = clave
    fs.writeFileSync(_configPath, JSON.stringify(cfg, null, 2), 'utf8')
  } catch (err) {
    console.error('[licencia] Error guardando clave:', err.message)
  }
}

// ─── Caché SQLite ─────────────────────────────────────────────────────────────
const loadCache = () => {
  try { return _db.prepare('SELECT * FROM licencia_cache WHERE id = 1').get() || null }
  catch { return null }
}

const saveCache = (data) => {
  try {
    _db.prepare(`
      INSERT OR REPLACE INTO licencia_cache
        (id, clave, hardware_id, plan_tipo, max_maquinas, dias_restantes, estado, validado_en, expira_segun_servidor)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.clave,
      data.hardware_id,
      data.plan?.tipo   || 'basico',
      data.plan?.max_maquinas || 1,
      data.diasRestantes ?? null,
      data.estado        || 'activa',
      new Date().toISOString(),
      data.fecha_expiracion || null
    )
  } catch (err) {
    console.error('[licencia] Error guardando caché:', err.message)
  }
}

// ─── Verificar ────────────────────────────────────────────────────────────────
const verificar = async () => {
  const clave = loadClave()
  if (!clave) return { ok: false, estado: 'sin_licencia' }

  // Clave maestra: acceso total sin servidor
  if (clave === PDV_MASTER_KEY) {
    return { ok: true, estado: 'master', plan: { tipo: 'master', max_maquinas: 999 }, diasRestantes: null }
  }

  const hwId = getHardwareId()

  // Intento online (timeout 5s)
  try {
    const apiUrl = _getApiUrl()
    const res = await fetch(`${apiUrl}/licencias/validar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clave, hardware_id: hwId }),
      signal: AbortSignal.timeout(5000),
    })

    if (res.ok) {
      const data = await res.json()
      saveCache({ ...data, clave, hardware_id: hwId })
      if (data.diasRestantes !== null && data.diasRestantes <= 7) {
        data.advertencia = `Licencia vence en ${data.diasRestantes} día(s). Contacta a soporte para renovar.`
      }
      return data
    }

    const err = await res.json().catch(() => ({}))
    if (res.status === 402) return { ok: false, estado: 'expirada',    mensaje: err.error }
    if (res.status === 403) return { ok: false, estado: 'no_autorizada', mensaje: err.error }
    // 4xx/5xx inesperado: caer al caché
  } catch {
    console.log('[licencia] Sin conexión, verificando caché local')
  }

  // Fallback offline
  const cache = loadCache()
  if (!cache || cache.clave !== clave) return { ok: false, estado: 'sin_licencia' }

  // Si el servidor nos dijo que expiraba, respetar esa fecha aunque estemos offline
  if (cache.expira_segun_servidor && new Date(cache.expira_segun_servidor) < new Date()) {
    return { ok: false, estado: 'expirada', mensaje: 'Licencia vencida. Necesitas internet para continuar.' }
  }

  const diasOffline = (Date.now() - new Date(cache.validado_en).getTime()) / 86_400_000
  const plan = { tipo: cache.plan_tipo, max_maquinas: cache.max_maquinas }

  if (diasOffline <= GRACE_WARN) {
    return { ok: true, estado: 'activa', plan, offline: true, diasRestantes: cache.dias_restantes }
  }

  if (diasOffline <= GRACE_BLOCK) {
    const diasGracia = Math.ceil(GRACE_BLOCK - diasOffline)
    return {
      ok: true,
      estado: 'gracia_offline',
      plan,
      offline: true,
      diasRestantes: cache.dias_restantes,
      diasGracia,
      advertencia: `Sin verificación de licencia. El sistema se bloqueará en ${diasGracia} día(s) si no hay internet.`,
    }
  }

  return {
    ok: false,
    estado: 'gracia_expirada',
    mensaje: `No fue posible verificar la licencia por más de ${GRACE_BLOCK} días. Conecta el POS a internet para continuar.`,
  }
}

// ─── Activar (primera vez) ────────────────────────────────────────────────────
const activar = async (clave) => {
  if (!clave?.trim()) return { ok: false, mensaje: 'Ingresa una clave válida' }

  const claveNorm = clave.trim().toUpperCase()

  if (claveNorm === PDV_MASTER_KEY) {
    saveClave(claveNorm)
    return { ok: true, estado: 'master', plan: { tipo: 'master', max_maquinas: 999 } }
  }

  const hwId = getHardwareId()

  try {
    const apiUrl = _getApiUrl()
    const res = await fetch(`${apiUrl}/licencias/activar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clave: claveNorm, hardware_id: hwId, hostname: os.hostname() }),
      signal: AbortSignal.timeout(10000),
    })

    const data = await res.json()
    if (res.ok && data.ok) {
      saveClave(claveNorm)
      saveCache({ ...data, clave: claveNorm, hardware_id: hwId })
      return data
    }
    return { ok: false, mensaje: data.error || 'Error al activar la licencia' }
  } catch {
    return { ok: false, mensaje: 'Sin conexión. Necesitas internet para activar la licencia por primera vez.' }
  }
}

module.exports = { init, verificar, activar, getHardwareId }
