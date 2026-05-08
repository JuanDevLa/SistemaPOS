// URL del backend resuelta del proceso main (Sprint 2 / E6).
// Memoizada como Promise: la primera llamada dispara el IPC, las siguientes reusan el resultado.
// Fallback a 127.0.0.1:3001 solo si dbAPI no está disponible (ej. corriendo en navegador puro).
let _baseUrlPromise = null
const getBaseUrl = () => {
  if (!_baseUrlPromise) {
    _baseUrlPromise = (async () => {
      try {
        const url = await window.dbAPI?.getApiUrl?.()
        return url || 'http://127.0.0.1:3001'
      } catch {
        return 'http://127.0.0.1:3001'
      }
    })()
  }
  return _baseUrlPromise
}

let _token = null
const getToken = () => _token
export const setToken = (t) => { _token = t }

// Caché de conectividad (10 segundos) con promesa inflight para evitar race condition
let lastConnCheck = null
let lastConnResult = null
let _inflightCheck = null

// Lock para evitar ejecuciones concurrentes de syncPendientes
let _syncRunning = false

const isOnline = async () => {
  if (lastConnCheck && Date.now() - lastConnCheck < 10000) return lastConnResult
  if (_inflightCheck) return _inflightCheck
  _inflightCheck = (async () => {
    try { return await window.dbAPI.checkConn() } catch { return false }
  })()
  lastConnResult = await _inflightCheck
  lastConnCheck = Date.now()
  _inflightCheck = null
  return lastConnResult
}

let onUnauthorized = null
export const setOnUnauthorized = (cb) => { onUnauthorized = cb }

// Callback para autorización temporal: (permiso) => Promise<token | null>.
// Si el callback devuelve un token, la request se reintenta con header `X-Auth-Override`.
// Si devuelve null/undefined, el 403 se propaga como error normal.
let onPermisoDenegado = null
export const setOnPermisoDenegado = (cb) => { onPermisoDenegado = cb }

// Helper para gates puramente locales (sin viaje al backend): pide PIN admin,
// resuelve a true si fue autorizado. El token se descarta porque no hay request que reintentar.
export const pedirAutorizacion = async (permiso) => {
  if (!onPermisoDenegado) return false
  const token = await onPermisoDenegado(permiso)
  return !!token
}

const PERMISO_PREFIX = 'Sin permiso: '

const request = async (method, path, body, { override = null, _retry = false } = {}) => {
  const BASE_URL = await getBaseUrl()
  let res
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 12000)
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(getToken() && { Authorization: `Bearer ${getToken()}` }),
        ...(override && { 'X-Auth-Override': override }),
      },
      ...(body && { body: JSON.stringify(body) }),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
  } catch {
    throw new Error('Error de conexión con el servidor')
  }

  if (res.status === 401) {
    onUnauthorized?.()
    throw new Error('Sesión expirada. Ingresa tu PIN nuevamente.')
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))

    // 403 por permiso: ofrecer autorización temporal (una sola vez por request).
    if (res.status === 403 && !_retry && typeof data.error === 'string' && data.error.startsWith(PERMISO_PREFIX) && onPermisoDenegado) {
      const permiso = data.error.slice(PERMISO_PREFIX.length).trim()
      const overrideToken = await onPermisoDenegado(permiso)
      if (overrideToken) {
        return request(method, path, body, { override: overrideToken, _retry: true })
      }
    }

    throw new Error(data.error || `Error del servidor (${res.status})`)
  }

  return res.json()
}

export const api = {
  // Autorización temporal: pide PIN admin, devuelve token corto para desbloquear `permiso`.
  autorizacionTemporal: async ({ admin_usuario, admin_pin, permiso, negocio_id }) => {
    return request('POST', '/auth/autorizacion-temporal', { admin_usuario, admin_pin, permiso, negocio_id })
  },

  loginCajero: async (usuario, pin, negocio_id) => {
    const online = await isOnline()
    if (online) {
      const res = await request('POST', '/auth/cajero', { usuario, pin, negocio_id })
      if (res.token) {
        await window.dbAPI.cacheCajero(usuario, pin, negocio_id, res.usuario?.rol || 'cajero')
      }
      return res
    } else {
      // Login offline
      return await window.dbAPI.loginOffline(usuario, pin, negocio_id)
    }
  },

  buscarProducto: async (q, negocio_id) => {
    const online = await isOnline()
    if (online) {
      return await request('GET', `/productos/buscar?q=${encodeURIComponent(q)}&negocio_id=${negocio_id}`)
    } else {
      return await window.dbAPI.buscarProducto(q, negocio_id)
    }
  },

  registrarVenta: async (venta) => {
    const online = await isOnline()
    if (online) {
      return await request('POST', '/ventas', venta)
    } else {
      return await window.dbAPI.registrarVenta(venta)
    }
  },

  registrarEntrada: async (entrada) => {
    const online = await isOnline()
    if (online) {
      return await request('POST', '/entradas', entrada)
    } else {
      return await window.dbAPI.registrarEntrada(entrada)
    }
  },

  listarEntradas: async (negocio_id) => {
    const online = await isOnline()
    if (online) {
      return await request('GET', `/entradas?negocio_id=${negocio_id}`)
    } else {
      return []
    }
  },

  turnoAbierto: async () =>
    await request('GET', '/cortes/abierto'),

  me: async () =>
    await request('GET', '/auth/me'),

  abrirCorte: async (negocio_id, efectivo_inicial) => {
    const online = await isOnline()
    if (online) {
      return await request('POST', '/cortes', { negocio_id, efectivo_inicial })
    } else {
      const res = await window.dbAPI.abrirCorte({ negocio_id, efectivo_inicial })
      if (res.success) {
        return { id: res.id, success: true }
      }
      return { error: res.error }
    }
  },

  cerrarCorte: async (corte_id, efectivo_contado, notas) => {
    const online = await isOnline()
    const datos = {
      efectivo_contado,
      notas,
      cierre: new Date().toISOString()
    }

    if (online) {
      return await request('PUT', `/cortes/${corte_id}/cerrar`, datos)
    } else {
      return await window.dbAPI.cerrarCorte(corte_id, datos)
    }
  },

  listarCortes: async (negocio_id) => {
    const online = await isOnline()
    if (online) {
      return await request('GET', `/cortes?negocio_id=${negocio_id}`)
    } else {
      return []
    }
  },

  obtenerCorte: async (corte_id) => {
    const online = await isOnline()
    if (online) {
      return await request('GET', `/cortes/${corte_id}`)
    } else {
      return null
    }
  },

  obtenerSnapshotCorte: async ({ negocio_id, cajero_id, tipo = 'cajero', fecha }) => {
    const params = new URLSearchParams({ negocio_id, tipo })
    if (cajero_id) params.set('cajero_id', cajero_id)
    if (fecha)     params.set('fecha', fecha)
    return await request('GET', `/cortes/snapshot?${params.toString()}`)
  },

  guardarHistorialCorte: async (tipo, snapshot) =>
    await request('POST', '/historial-cortes', { tipo, snapshot }),

  listarHistorialCortes: async (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return await request('GET', `/historial-cortes?${qs}`)
  },

  obtenerHistorialCorte: async (id) =>
    await request('GET', `/historial-cortes/${id}`),

  actualizarMaxCortes: async (negocio_id, max_cortes_cajero_dia) =>
    await request('PUT', `/negocios/${negocio_id}/config`, { max_cortes_cajero_dia }),

  obtenerConfigNegocio: async (negocio_id) => {
    const online = await isOnline()
    if (online) {
      try { return await request('GET', `/negocios/${negocio_id}/config`) }
      catch { return null }
    }
    return null
  },

  obtenerCorteAbierto: async (negocio_id, cajero_id) => {
    const online = await isOnline()
    if (online) {
      try {
        // Filtrar por cajero garantiza que cada uno vea solo SU corte abierto.
        // Sin cajero_id en el query, dos cajeros del mismo negocio se cruzaban turnos.
        const cortes = await request('GET', `/cortes?negocio_id=${negocio_id}&estado=abierto&cajero_id=${cajero_id}`)
        return cortes && cortes.length > 0 ? cortes[0] : null
      } catch {
        return null
      }
    } else {
      return await window.dbAPI.obtenerCorteAbierto(negocio_id, cajero_id)
    }
  },

  listarInventario: async (negocio_id) => {
    const online = await isOnline()
    if (online) return await request('GET', `/inventario?negocio_id=${negocio_id}`)
    return []
  },

  registrarCargaInicial: async (carga) => {
    const online = await isOnline()
    if (online) {
      return await request('POST', '/inventario/carga-inicial', carga)
    } else {
      return await window.dbAPI.registrarCargaInicial(carga)
    }
  },

  // Utilidades offline
  syncPendientes: async () => {
    if (_syncRunning) return { success: false, message: 'Sync en curso' }
    _syncRunning = true
    try {
      const online = await isOnline()
      if (!online) return { success: false, message: 'Sin conexión' }

      const pendientes = await window.dbAPI.obtenerPendientes()

      // Sincronizar ventas. El backend responde { venta_id, folio, ... } — no `id`.
      // (Bug histórico: la condición previa `if (res.id)` era siempre falsa → ventas
      // se reintentaban indefinidamente y el servidor las duplicaba en cada reconexión.)
      for (const venta of pendientes.ventas) {
        try {
          const res = await request('POST', '/ventas', venta)
          if (res.venta_id) {
            await window.dbAPI.marcarSincronizado('ventas', venta.id)
          }
        } catch (err) {
          console.error('Error sincronizando venta:', err)
        }
      }

      // Sincronizar entradas
      for (const entrada of pendientes.entradas) {
        try {
          const res = await request('POST', '/entradas', entrada)
          if (res.id) {
            await window.dbAPI.marcarSincronizado('entradas', entrada.id)
          }
        } catch (err) {
          console.error('Error sincronizando entrada:', err)
        }
      }

      // Sincronizar cortes
      for (const corte of pendientes.cortes) {
        try {
          if (corte.estado === 'abierto') {
            if (!corte.negocio_id || corte.efectivo_inicial == null) {
              await window.dbAPI.marcarSincronizado('cortes', corte.id)
              continue
            }
            const res = await request('POST', '/cortes', {
              negocio_id: corte.negocio_id,
              efectivo_inicial: corte.efectivo_inicial
            })
            if (res.id) {
              await window.dbAPI.marcarSincronizado('cortes', corte.id)
            }
          } else if (corte.estado === 'cerrado') {
            if (!corte.server_id && !corte.id) {
              await window.dbAPI.marcarSincronizado('cortes', corte.id)
              continue
            }
            const res = await request('PUT', `/cortes/${corte.server_id || corte.id}/cerrar`, {
              efectivo_contado: corte.efectivo_contado,
              notas: corte.notas
            })
            if (res.success) {
              await window.dbAPI.marcarSincronizado('cortes', corte.id)
            }
          }
        } catch (err) {
          console.error('Error sincronizando corte:', err)
        }
      }

      return { success: true, synced: true }
    } catch (err) {
      return { success: false, error: err.message }
    } finally {
      _syncRunning = false
    }
  },

  registrarMovimientoCaja: async (datos) => {
    const online = await isOnline()
    if (online) return await request('POST', '/movimientos-caja', datos)
    return { error: 'Sin conexión' }
  },

  cacheProductos: (negocio_id) => window.dbAPI.cacheProductos(negocio_id, getToken()),
  checkConn: () => isOnline(),

  // Créditos / Clientes
  buscarClientes: async (q, negocio_id) =>
    await request('GET', `/clientes/buscar?q=${encodeURIComponent(q || '')}&negocio_id=${negocio_id}`),
  estadoCuentaCliente: async (id, negocio_id) =>
    await request('GET', `/clientes/${id}/estado-cuenta?negocio_id=${negocio_id}`),
  detalleVentaCredito: async (venta_id) =>
    await request('GET', `/clientes/venta/${venta_id}/detalle`),
  reporteSaldos: async (negocio_id) =>
    await request('GET', `/clientes/reporte-saldos?negocio_id=${negocio_id}`),
  registrarAbono: async (datos) =>
    await request('POST', '/abonos', datos),
  registrarCredito: async (datos) =>
    await request('POST', '/creditos', datos),

  // Devoluciones
  obtenerVenta: async (id) => {
    const online = await isOnline()
    if (online) return await request('GET', `/ventas/${id}`)
    return { error: 'Sin conexión' }
  },
  registrarDevolucion: async (datos) => {
    const online = await isOnline()
    if (online) return await request('POST', `/ventas/${datos.venta_id}/devolucion`, {
      items: datos.items,
      monto_efectivo_devuelto: datos.monto_efectivo_devuelto || 0,
    })
    return { error: 'Sin conexión — las devoluciones requieren conexión al servidor' }
  },

  // Proveedores
  listarProveedores: async () =>
    await request('GET', '/proveedores'),
  crearProveedor: async (datos) =>
    await request('POST', '/proveedores', datos),
  editarProveedor: async (id, datos) =>
    await request('PUT', `/proveedores/${id}`, datos),
  eliminarProveedor: async (id) =>
    await request('DELETE', `/proveedores/${id}`),

  // Compras / Entradas
  comprasSugeridas: async (negocio_id) =>
    await request('GET', `/entradas/sugeridas?negocio_id=${negocio_id}`),
  obtenerEntrada: async (id) =>
    await request('GET', `/entradas/${id}`),

  // Productos CRUD
  listarProductosTodos: async () =>
    await request('GET', '/productos'),
  importarProductos: async (datos) =>
    await request('POST', '/productos/importar', datos),
  catalogoProductos: async (negocio_id, departamento_id) => {
    const params = new URLSearchParams({ negocio_id })
    if (departamento_id) params.append('departamento_id', departamento_id)
    return await request('GET', `/productos/catalogo?${params.toString()}`)
  },
  crearProducto: async (datos) =>
    await request('POST', '/productos', datos),
  crearLoteInicial: async (datos) =>
    await request('POST', '/lotes', datos),
  editarProducto: async (id, datos) =>
    await request('PUT', `/productos/${id}`, datos),
  desactivarProducto: async (id) =>
    await request('DELETE', `/productos/${id}`),
  listarDepartamentos: async (negocio_id) =>
    await request('GET', `/departamentos?negocio_id=${negocio_id}`),
  crearDepartamento: async (datos) =>
    await request('POST', '/departamentos', datos),
  editarDepartamento: async (id, datos) =>
    await request('PUT', `/departamentos/${id}`, datos),
  eliminarDepartamento: async (id) =>
    await request('DELETE', `/departamentos/${id}`),
  ajustarInventario: async (datos) =>
    await request('PUT', '/inventario/ajustar', datos),
  stockBajo: async (negocio_id) =>
    await request('GET', `/inventario/bajo?negocio_id=${negocio_id}`),
  movimientosInventario: async ({ negocio_id, desde, hasta, producto_id }) => {
    const p = new URLSearchParams({ negocio_id })
    if (desde) p.set('desde', desde)
    if (hasta) p.set('hasta', hasta)
    if (producto_id) p.set('producto_id', producto_id)
    return await request('GET', `/inventario/movimientos?${p}`)
  },

  // CRUD Clientes
  listarClientes: async (negocio_id) =>
    await request('GET', `/clientes?negocio_id=${negocio_id}`),
  crearCliente: async (datos) =>
    await request('POST', '/clientes', datos),
  editarCliente: async (id, datos) =>
    await request('PUT', `/clientes/${id}`, datos),
  eliminarCliente: async (id, overrideToken) =>
    await request('DELETE', `/clientes/${id}`, undefined, { override: overrideToken }),

  // Usuarios (Cajeros) — Configuración
  listarUsuarios: async (params = {}) => {
    const qs = new URLSearchParams(params).toString()
    return await request('GET', qs ? `/usuarios?${qs}` : '/usuarios')
  },
  crearUsuario: async (datos) =>
    await request('POST', '/usuarios', datos),
  editarUsuario: async (id, datos) =>
    await request('PUT', `/usuarios/${id}`, datos),
  toggleUsuario: async (id) =>
    await request('PATCH', `/usuarios/${id}/toggle`),

  // Negocios — Configuración (folios + ticket)
  listarNegocios: async () =>
    await request('GET', '/negocios'),
  actualizarFolios: async (id, datos) =>
    await request('PUT', `/negocios/${id}/folios`, datos),
  actualizarTicket: async (id, datos) =>
    await request('PUT', `/negocios/${id}/ticket`, datos),
  actualizarConfigNegocio: async (id, data) =>
    await request('PUT', `/negocios/${id}/config`, data),
  listarFormasPago: async (id) =>
    await request('GET', `/negocios/${id}/formas-pago`),
  guardarFormasPago: async (id, data) =>
    await request('PUT', `/negocios/${id}/formas-pago`, data),
  listarUnidades: async () =>
    await request('GET', '/unidades'),
  obtenerConfigRecargas: async (negocio_id) =>
    await request('GET', `/recargas/config?negocio_id=${negocio_id}`),
  actualizarConfigRecargas: async (data) =>
    await request('PUT', '/recargas/config', data),

  // Órdenes de Compra
  listarOrdenesCompra: async (negocio_id, estado) => {
    const p = new URLSearchParams({ negocio_id })
    if (estado) p.set('estado', estado)
    return await request('GET', `/ordenes-compra?${p}`)
  },
  detalleOrdenCompra: async (id) =>
    await request('GET', `/ordenes-compra/${id}`),
  crearOrdenCompra: async (datos) =>
    await request('POST', '/ordenes-compra', datos),
  recibirOrdenCompra: async (id, datos) =>
    await request('PUT', `/ordenes-compra/${id}/recibir`, datos),
  cancelarOrdenCompra: async (id) =>
    await request('PUT', `/ordenes-compra/${id}/cancelar`, {}),

  // Lista de Compras
  listarListaCompras: async (negocio_id) =>
    await request('GET', `/lista-compras?negocio_id=${negocio_id}`),
  agregarListaCompras: async (datos) =>
    await request('POST', '/lista-compras', datos),
  actualizarListaCompras: async (id, datos) =>
    await request('PUT', `/lista-compras/${id}`, datos),
  eliminarListaCompras: async (id) =>
    await request('DELETE', `/lista-compras/${id}`),

  // Reportes
  reporteVentas: async (negocio_id, fecha_inicio, fecha_fin) => {
    const params = new URLSearchParams({ negocio_id, fecha_inicio, fecha_fin })
    return await request('GET', `/reportes/ventas?${params.toString()}`)
  },
  productosVendidos: async (negocio_id, fecha_inicio, fecha_fin) => {
    const params = new URLSearchParams({ negocio_id, fecha_inicio, fecha_fin })
    return await request('GET', `/reportes/productos-vendidos?${params.toString()}`)
  },

  // Promociones
  listarPromociones: async (negocio_id) =>
    await request('GET', `/promociones?negocio_id=${negocio_id}`),
  crearPromocion: async (datos) =>
    await request('POST', '/promociones', datos),
  eliminarPromocion: async (id) =>
    await request('DELETE', `/promociones/${id}`),

  // Recargas y Servicios
  listarCompaniasRecarga: async (tipo) => {
    const params = tipo ? `?tipo=${tipo}` : ''
    return await request('GET', `/recargas/companias${params}`)
  },
  procesarRecarga: async (datos) => await request('POST', '/recargas/procesar', datos),
  consultarServicio: async (datos) => await request('POST', '/recargas/consultar-servicio', datos),
  pagarServicio: async (datos) => await request('POST', '/recargas/pagar-servicio', datos),
  historialRecargas: async (negocio_id, params = {}) => {
    const q = new URLSearchParams({ negocio_id, ...params })
    return await request('GET', `/recargas/historial?${q.toString()}`)
  },

  // Audit log
  listarAuditLog: async (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return await request('GET', `/audit-logs${q ? '?' + q : ''}`)
  },

  // Mercado Pago Point Smart 2
  mpCrearIntento: async (monto, referencia_externa, descripcion) =>
    await request('POST', '/mp/payment-intents', { monto, referencia_externa, descripcion }),
  mpObtenerIntento: async (id) =>
    await request('GET', `/mp/payment-intents/${id}`),
  mpCancelarIntento: async () =>
    await request('DELETE', '/mp/payment-intents'),
}
