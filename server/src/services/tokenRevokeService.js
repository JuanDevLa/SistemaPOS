// Cache en memoria de JTIs revocados, refrescada desde BD cada 60s.
// El verifyJWT consulta la cache (sync, O(1)) en vez de pegarle a la BD en cada request.
// Al revocar (logout), se inserta en BD y en la cache de inmediato para no esperar al refresh.

const pool = require('../db/client')

const REFRESH_INTERVAL_MS = 60 * 1000
const revokedJtis = new Set()
let refreshTimer = null

const refresh = async () => {
  try {
    const { rows } = await pool.query(
      'SELECT jti FROM tokens_revocados WHERE expira_en > NOW()'
    )
    revokedJtis.clear()
    for (const r of rows) revokedJtis.add(r.jti)
  } catch (err) {
    console.error('[tokenRevokeService] refresh fail:', err.message)
  }
}

const start = async () => {
  await refresh()
  refreshTimer = setInterval(refresh, REFRESH_INTERVAL_MS)
  refreshTimer.unref?.()
}

const isRevoked = (jti) => !!jti && revokedJtis.has(jti)

const revoke = async ({ jti, usuario_id, expira_en }) => {
  if (!jti || !expira_en) return
  await pool.query(
    `INSERT INTO tokens_revocados (jti, usuario_id, expira_en) VALUES ($1, $2, $3)
     ON CONFLICT (jti) DO NOTHING`,
    [jti, usuario_id || null, expira_en]
  )
  revokedJtis.add(jti)
}

module.exports = { start, refresh, isRevoked, revoke }
