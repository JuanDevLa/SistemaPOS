const { app, BrowserWindow, ipcMain, safeStorage } = require('electron')
const path = require('path')
const fs = require('fs')
const Database = require('better-sqlite3')
const PrinterService = require('./printer-service')

const isDev = process.env.NODE_ENV !== 'production'
const printer = new PrinterService()

// SQLite Database
let db = null
const DB_PATH = path.join(app.getPath('userData'), 'pdv.db')
const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json')
const BACKUP_DIR = path.join(app.getPath('userData'), 'backups')
const TOKEN_PATH = path.join(app.getPath('userData'), 'token.enc')
const BACKUP_RETENTION_DAYS = 7

// Resolución de URL del backend (Sprint 2 / E6).
// Prioridad: env → config.json en userData → fallback localhost (solo dev).
// Cacheado para no leer el archivo en cada request.
let _apiUrlCache = null
const getApiUrl = () => {
  if (_apiUrlCache) return _apiUrlCache

  if (process.env.PDV_API_URL) {
    _apiUrlCache = process.env.PDV_API_URL
    return _apiUrlCache
  }

  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))
      if (cfg.api_url) {
        _apiUrlCache = cfg.api_url
        return _apiUrlCache
      }
    }
  } catch (err) {
    console.error('[config] No se pudo leer config.json:', err.message)
  }

  if (isDev) {
    _apiUrlCache = 'http://127.0.0.1:3001'
    return _apiUrlCache
  }

  // Producción sin URL configurada: error visible en lugar de silencioso fallback.
  throw new Error('PDV_API_URL no configurado. Define la URL del backend en config.json o como variable de entorno.')
}

// Helper idempotente: SQLite no soporta ADD COLUMN IF NOT EXISTS.
const addColumnIfMissing = (database, tabla, columna, definicion) => {
  const cols = database.prepare(`PRAGMA table_info(${tabla})`).all()
  if (!cols.some(c => c.name === columna)) {
    database.exec(`ALTER TABLE ${tabla} ADD COLUMN ${columna} ${definicion}`)
  }
}

// Sprint 2 / E8: migraciones idempotentes versionadas.
// Para agregar un cambio de schema: sumar una entrada al final con `version` consecutivo.
// Cada `up` corre dentro de una transacción y solo si la versión es mayor a la aplicada.
const MIGRATIONS = [
  {
    version: 1,
    name: 'schema_base',
    up: (database) => {
      database.exec(`
        CREATE TABLE IF NOT EXISTS productos_cache (
          id INTEGER PRIMARY KEY,
          codigo_barras TEXT,
          nombre TEXT,
          precio REAL,
          costo REAL,
          categoria TEXT,
          unidad TEXT,
          activo INTEGER DEFAULT 1,
          negocio_id INTEGER,
          synced_at TEXT
        );

        CREATE TABLE IF NOT EXISTS cajeros_cache (
          id INTEGER PRIMARY KEY,
          nombre TEXT,
          pin TEXT,
          negocio_id INTEGER
        );

        CREATE TABLE IF NOT EXISTS ventas_offline (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          negocio_id INTEGER,
          cajero_id INTEGER,
          cajero_nombre TEXT,
          total REAL,
          subtotal REAL,
          descuento REAL DEFAULT 0,
          metodo_pago TEXT,
          efectivo_recibido REAL,
          cambio REAL DEFAULT 0,
          fecha TEXT,
          items TEXT,
          synced INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS cortes_offline (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          negocio_id INTEGER,
          cajero_id INTEGER,
          estado TEXT DEFAULT 'abierto',
          apertura TEXT,
          cierre TEXT,
          efectivo_inicial REAL DEFAULT 0,
          efectivo_esperado REAL,
          efectivo_contado REAL,
          diferencia REAL,
          notas TEXT,
          server_id INTEGER,
          synced INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS entradas_offline (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          negocio_id INTEGER,
          usuario_id INTEGER,
          proveedor TEXT,
          fecha TEXT,
          items TEXT,
          synced INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS sync_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tipo TEXT,
          referencia_id INTEGER,
          timestamp TEXT,
          synced INTEGER DEFAULT 0
        );

        CREATE UNIQUE INDEX IF NOT EXISTS idx_cajeros_unique ON cajeros_cache(nombre, negocio_id);
      `)
    },
  },
  {
    version: 2,
    name: 'ventas_offline_fiscal_columns',
    up: (database) => {
      addColumnIfMissing(database, 'ventas_offline', 'iva_total', 'REAL DEFAULT 0')
      addColumnIfMissing(database, 'ventas_offline', 'monto_tarjeta', 'REAL DEFAULT 0')
      addColumnIfMissing(database, 'ventas_offline', 'cliente_id', 'INTEGER')
      addColumnIfMissing(database, 'ventas_offline', 'folio', 'TEXT')
      addColumnIfMissing(database, 'ventas_offline', 'corte_id_local', 'INTEGER')
      addColumnIfMissing(database, 'ventas_offline', 'descuento_global', 'TEXT')
    },
  },
  {
    version: 3,
    name: 'productos_cache_extended',
    up: (database) => {
      addColumnIfMissing(database, 'productos_cache', 'precio_mayoreo', 'REAL')
      addColumnIfMissing(database, 'productos_cache', 'aplica_iva', 'INTEGER DEFAULT 0')
      addColumnIfMissing(database, 'productos_cache', 'departamento_id', 'INTEGER')
      addColumnIfMissing(database, 'productos_cache', 'stock_cache', 'REAL DEFAULT 0')
    },
  },
]

const runMigrations = (database) => {
  database.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      name TEXT,
      applied_at TEXT
    )
  `)

  const row = database.prepare('SELECT MAX(version) AS v FROM schema_version').get()
  const current = row?.v ?? 0

  const insert = database.prepare(
    'INSERT INTO schema_version (version, name, applied_at) VALUES (?, ?, ?)'
  )

  for (const m of MIGRATIONS) {
    if (m.version <= current) continue
    const apply = database.transaction(() => {
      m.up(database)
      insert.run(m.version, m.name, new Date().toISOString())
    })
    apply()
    console.log(`✓ Migración aplicada: v${m.version} ${m.name}`)
  }
}

// Inicializar BD
const initDatabase = () => {
  db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  runMigrations(db)
  console.log('✓ SQLite inicializado:', DB_PATH)
}

// Sprint 2 / E7: backup diario del SQLite con rotación a 7 días.
// Usa db.backup() (online backup API de SQLite) — seguro con WAL activo.
const runDailyBackup = async () => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true })
    }

    const now = new Date()
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
    const dest = path.join(BACKUP_DIR, `pdv.db.${stamp}.bak`)

    if (!fs.existsSync(dest)) {
      await db.backup(dest)
      console.log('✓ Backup SQLite creado:', dest)
    }

    const cutoff = Date.now() - BACKUP_RETENTION_DAYS * 24 * 60 * 60 * 1000
    for (const file of fs.readdirSync(BACKUP_DIR)) {
      const m = file.match(/^pdv\.db\.(\d{4})(\d{2})(\d{2})\.bak$/)
      if (!m) continue
      const fileTime = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`).getTime()
      if (fileTime < cutoff) {
        fs.unlinkSync(path.join(BACKUP_DIR, file))
        console.log('✓ Backup rotado:', file)
      }
    }
  } catch (err) {
    console.error('[backup] Error:', err.message)
  }
}

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    fullscreen: !isDev,
    frame: isDev,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

// IPC Handlers para impresora térmica
ipcMain.handle('printer:connect', async () => {
  try {
    await printer.connect()
    return { success: true, message: 'Impresora conectada' }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('printer:disconnect', async () => {
  try {
    printer.disconnect()
    return { success: true, message: 'Impresora desconectada' }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('printer:print-ticket', async (event, venta) => {
  try {
    // Auto-connect si no está conectado
    if (!printer.device) {
      await printer.connect()
    }
    await printer.printTicket(venta)
    return { success: true, message: 'Ticket impreso' }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('printer:print-corte', async (event, corte) => {
  try {
    if (!printer.device) {
      await printer.connect()
    }
    await printer.printCorte(corte)
    return { success: true, message: 'Corte impreso' }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('printer:print-corte-snapshot', async (event, payload) => {
  try {
    if (!printer.device) await printer.connect()
    await printer.printCorteSnapshot(payload.snapshot, payload.opciones || {})
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('printer:open-drawer', async () => {
  try {
    if (!printer.device) {
      await printer.connect()
    }
    await printer.openDrawer()
    return { success: true, message: 'Cajón abierto' }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// ===== IPC Handlers para SQLite =====

ipcMain.handle('db:check-conn', async () => {
  try {
    const response = await fetch(`${getApiUrl()}/health`)
    return response.ok
  } catch {
    return false
  }
})

// Expone la URL al renderer para que api.js arme sus requests
ipcMain.handle('db:get-api-url', async () => {
  try {
    return getApiUrl()
  } catch (err) {
    return null
  }
})

ipcMain.handle('db:cache-productos', async (event, negocioId, token) => {
  try {
    // /productos/catalogo solo requiere JWT (cualquier cajero puede llamarlo).
    // /productos requiere permiso `modificar_productos`, no apto para cajeros.
    const response = await fetch(`${getApiUrl()}/productos/catalogo?negocio_id=${negocioId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` }
    }
    const productos = await response.json()
    if (!Array.isArray(productos)) {
      return { success: false, error: 'respuesta inválida del servidor' }
    }

    // Solo se borra la caché vieja si la respuesta es válida — evita perder
    // productos por un fallo de red.
    const tx = db.transaction(() => {
      db.prepare('DELETE FROM productos_cache WHERE negocio_id = ?').run(negocioId)

      const insert = db.prepare(`
        INSERT INTO productos_cache (
          id, codigo_barras, nombre,
          precio, precio_mayoreo, costo,
          categoria, departamento_id, unidad,
          aplica_iva, activo, stock_cache,
          negocio_id, synced_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      const now = new Date().toISOString()
      for (const p of productos) {
        insert.run(
          p.id, p.codigo_barras, p.nombre,
          p.precio, p.precio_mayoreo || null, p.costo,
          p.categoria || null, p.departamento_id || null, p.unidad,
          p.aplica_iva ? 1 : 0, p.activo === false ? 0 : 1, p.existencia || 0,
          negocioId, now
        )
      }
    })
    tx()

    return { success: true, count: productos.length }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('db:buscar-producto', async (event, q, negocioId) => {
  try {
    const query = `%${q}%`
    const resultados = db.prepare(`
      SELECT * FROM productos_cache
      WHERE negocio_id = ? AND activo = 1 AND (nombre LIKE ? OR codigo_barras LIKE ?)
      LIMIT 20
    `).all(negocioId, query, query)

    return resultados || []
  } catch (err) {
    return []
  }
})

ipcMain.handle('db:cache-cajero', async (event, nombre, pin, negocioId) => {
  try {
    // UPSERT: si el cajero ya existe en este negocio, actualiza su PIN; si no, lo agrega.
    // Permite que múltiples cajeros del mismo negocio puedan loguearse offline.
    db.prepare(`
      INSERT INTO cajeros_cache (nombre, pin, negocio_id)
      VALUES (?, ?, ?)
      ON CONFLICT(nombre, negocio_id) DO UPDATE SET pin = excluded.pin
    `).run(nombre, pin, negocioId)
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('db:login-offline', async (event, nombre, pin, negocioId) => {
  try {
    const cajero = db.prepare('SELECT * FROM cajeros_cache WHERE nombre = ? AND pin = ? AND negocio_id = ?')
      .get(nombre, pin, negocioId)

    if (cajero) {
      return { success: true, usuario: { nombre, id: cajero.id, negocio_id: negocioId } }
    }
    return { success: false, error: 'Credenciales incorrectas' }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('db:registrar-venta', async (event, venta) => {
  try {
    // descuento_global llega como objeto desde el front: serializar a JSON para guardar como TEXT.
    // Si no se manda, queda null — el sync sabrá que no había descuento de ticket.
    const descuentoGlobalJson = venta.descuento_global
      ? JSON.stringify(venta.descuento_global)
      : null

    const result = db.prepare(`
      INSERT INTO ventas_offline (
        negocio_id, cajero_id, cajero_nombre,
        total, subtotal, descuento, iva_total,
        metodo_pago, efectivo_recibido, monto_tarjeta, cambio,
        cliente_id, folio, corte_id_local, descuento_global,
        fecha, items, synced
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).run(
      venta.negocio_id, venta.cajero_id, venta.cajero_nombre,
      venta.total, venta.subtotal, venta.descuento || 0, venta.iva_total || 0,
      venta.metodo_pago, venta.efectivo_recibido, venta.monto_tarjeta || 0, venta.cambio || 0,
      venta.cliente_id || null, venta.folio || null, venta.corte_id_local || null, descuentoGlobalJson,
      venta.fecha, JSON.stringify(venta.items)
    )

    return { success: true, id: result.lastInsertRowid }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('db:abrir-corte', async (event, corte) => {
  try {
    const result = db.prepare(`
      INSERT INTO cortes_offline (negocio_id, cajero_id, estado, apertura, efectivo_inicial, synced)
      VALUES (?, ?, 'abierto', ?, ?, 0)
    `).run(corte.negocio_id, corte.cajero_id, corte.apertura, corte.efectivo_inicial || 0)

    return { success: true, id: result.lastInsertRowid }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('db:cerrar-corte', async (event, corteId, datos) => {
  try {
    db.prepare(`
      UPDATE cortes_offline
      SET estado = 'cerrado', cierre = ?, efectivo_esperado = ?, efectivo_contado = ?, diferencia = ?, notas = ?, synced = 0
      WHERE id = ?
    `).run(datos.cierre, datos.efectivo_esperado, datos.efectivo_contado, datos.diferencia, datos.notas || '', corteId)

    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('db:obtener-corte-abierto', async (event, negocioId, cajeroId) => {
  try {
    // Cada cajero tiene su propio corte; sin filtro de cajero_id se cruzaban turnos
    // y un cajero veía el corte abierto de otro en el mismo negocio.
    const corte = db.prepare(`
      SELECT * FROM cortes_offline
      WHERE negocio_id = ? AND cajero_id = ? AND estado = 'abierto'
      LIMIT 1
    `).get(negocioId, cajeroId)

    return corte || null
  } catch (err) {
    return null
  }
})

ipcMain.handle('db:registrar-entrada', async (event, entrada) => {
  try {
    const result = db.prepare(`
      INSERT INTO entradas_offline (negocio_id, usuario_id, proveedor, fecha, items, synced)
      VALUES (?, ?, ?, ?, ?, 0)
    `).run(entrada.negocio_id, entrada.usuario_id, entrada.proveedor, entrada.fecha, JSON.stringify(entrada.items))

    return { success: true, id: result.lastInsertRowid }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('db:registrar-carga-inicial', async (event, carga) => {
  try {
    // Actualizar productos_cache con nueva cantidad
    const insert = db.prepare(`
      INSERT OR REPLACE INTO productos_cache (codigo_barras, nombre, precio, costo, categoria, unidad, activo, negocio_id, synced_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
    `)

    const now = new Date().toISOString()
    for (const item of carga.items) {
      insert.run(item.codigo_barras, item.nombre, item.precio, 0, '', item.unidad || 'pieza', carga.negocio_id, now)
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

ipcMain.handle('db:obtener-pendientes', async (event) => {
  try {
    const ventas = db.prepare('SELECT * FROM ventas_offline WHERE synced = 0').all() || []
    const entradas = db.prepare('SELECT * FROM entradas_offline WHERE synced = 0').all() || []
    const cortes = db.prepare('SELECT * FROM cortes_offline WHERE synced = 0').all() || []

    return {
      ventas: ventas.map(v => ({
        ...v,
        items: JSON.parse(v.items),
        descuento_global: v.descuento_global ? JSON.parse(v.descuento_global) : null
      })),
      entradas: entradas.map(e => ({ ...e, items: JSON.parse(e.items) })),
      cortes
    }
  } catch (err) {
    return { ventas: [], entradas: [], cortes: [] }
  }
})

ipcMain.handle('db:marcar-sincronizado', async (event, tipo, id) => {
  try {
    const table = `${tipo}_offline`
    db.prepare(`UPDATE ${table} SET synced = 1 WHERE id = ?`).run(id)
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// ===== Token seguro con safeStorage =====

ipcMain.handle('token:save', async (event, token) => {
  if (!token) {
    try { fs.unlinkSync(TOKEN_PATH) } catch {}
    return
  }
  if (!safeStorage.isEncryptionAvailable()) return
  fs.writeFileSync(TOKEN_PATH, safeStorage.encryptString(token))
})

ipcMain.handle('token:load', async () => {
  if (!safeStorage.isEncryptionAvailable()) return null
  try {
    const buf = fs.readFileSync(TOKEN_PATH)
    return safeStorage.decryptString(buf)
  } catch {
    return null
  }
})

app.whenReady().then(() => {
  initDatabase()
  runDailyBackup()
  createWindow()
})

app.on('window-all-closed', () => {
  app.quit()
})
