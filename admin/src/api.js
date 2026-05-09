const BASE_URL = '/api'

const getToken = () => localStorage.getItem('token')

const request = async (method, path, body) => {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() && { Authorization: `Bearer ${getToken()}` })
    },
    ...(body !== undefined && { body: JSON.stringify(body) })
  })
  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('admin_usuario')
      window.location.href = '/'
      return
    }
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `Error del servidor (${res.status})`)
  }
  return res.json()
}

export const api = {
  // Auth
  loginAdmin: (usuario, password) =>
    request('POST', '/auth/admin', { usuario, password }),

  // Dashboard
  obtenerResumen: () =>
    request('GET', '/dashboard'),

  // Usuarios
  listarUsuarios: () =>
    request('GET', '/usuarios'),
  crearUsuario: (data) =>
    request('POST', '/usuarios', data),
  editarUsuario: (id, data) =>
    request('PUT', `/usuarios/${id}`, data),
  toggleUsuario: (id) =>
    request('PATCH', `/usuarios/${id}/toggle`),

  // Productos
  listarProductos: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return request('GET', `/productos${q ? '?' + q : ''}`)
  },
  buscarProductos: (q) =>
    request('GET', `/productos/buscar?q=${encodeURIComponent(q)}`),
  obtenerProducto: (id) =>
    request('GET', `/productos/${id}`),
  crearProducto: (data) =>
    request('POST', '/productos', data),
  editarProducto: (id, data) =>
    request('PUT', `/productos/${id}`, data),
  desactivarProducto: (id) =>
    request('DELETE', `/productos/${id}`),
  importarProductos: (productos, negocio_id) =>
    request('POST', `/productos/importar?negocio_id=${negocio_id}`, { productos }),
  crearLoteInicial: (data) =>
    request('POST', '/lotes', data),

  // Inventario
  listarInventario: (negocio_id) =>
    request('GET', `/inventario?negocio_id=${negocio_id}`),
  ajustarInventario: (data) =>
    request('PUT', '/inventario/ajustar', data),
  obtenerInversion: (negocio_id) =>
    request('GET', `/inventario/inversion?negocio_id=${negocio_id}`),

  // Ventas
  listarVentas: (queryString) =>
    request('GET', `/ventas?${queryString}`),
  obtenerVenta: (id) =>
    request('GET', `/ventas/${id}`),

  // Cortes
  listarCortes: (negocio_id) =>
    request('GET', `/cortes?negocio_id=${negocio_id}`),
  obtenerCorte: (id) =>
    request('GET', `/cortes/${id}`),
  corteDia: (negocio_id, fecha) =>
    request('GET', `/cortes/dia?negocio_id=${negocio_id}&fecha=${fecha}`),
  forzarCierreCorte: (id, motivo) =>
    request('POST', `/cortes/${id}/forzar-cierre`, { motivo }),

  // Config de negocio
  obtenerConfigNegocio: (id) =>
    request('GET', `/negocios/${id}/config`),
  actualizarConfigNegocio: (id, data) =>
    request('PUT', `/negocios/${id}/config`, data),

  // Departamentos
  listarDepartamentos: (negocio_id) =>
    request('GET', `/departamentos?negocio_id=${negocio_id}`),
  crearDepartamento: (data) =>
    request('POST', '/departamentos', data),
  editarDepartamento: (id, data) =>
    request('PUT', `/departamentos/${id}`, data),
  eliminarDepartamento: (id) =>
    request('DELETE', `/departamentos/${id}`),

  // Negocios / Configuración
  listarNegocios: () =>
    request('GET', '/negocios'),
  crearNegocio: (data) =>
    request('POST', '/negocios', data),
  actualizarNegocio: (id, data) =>
    request('PUT', `/negocios/${id}`, data),
  eliminarNegocio: (id) =>
    request('DELETE', `/negocios/${id}`),
  actualizarFolios: (id, data) =>
    request('PUT', `/negocios/${id}/folios`, data),
  actualizarTicket: (id, data) =>
    request('PUT', `/negocios/${id}/ticket`, data),
  listarFormasPago: (id) =>
    request('GET', `/negocios/${id}/formas-pago`),
  guardarFormasPago: (id, data) =>
    request('PUT', `/negocios/${id}/formas-pago`, data),

  // Recargas config
  obtenerConfigRecargas: (negocio_id) =>
    request('GET', `/recargas/config?negocio_id=${negocio_id}`),
  actualizarConfigRecargas: (data) =>
    request('PUT', '/recargas/config', data),

  // Backup / exportar BD
  exportarBackup: async () => {
    const res = await fetch(`${BASE_URL}/admin/exportar`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
    if (!res.ok) throw new Error('Error al generar backup')
    return res.blob()
  },

  // Lotes y caducidades
  listarLotes: (negocio_id, producto_id) => {
    const p = new URLSearchParams({ negocio_id })
    if (producto_id) p.set('producto_id', producto_id)
    return request('GET', `/lotes?${p}`)
  },
  caducidades: (negocio_id, dias = 30) =>
    request('GET', `/lotes/caducidades?negocio_id=${negocio_id}&dias=${dias}`),

  // Unidades de medida
  listarUnidades: () =>
    request('GET', '/unidades'),
  crearUnidad: (data) =>
    request('POST', '/unidades', data),
  editarUnidad: (id, data) =>
    request('PUT', `/unidades/${id}`, data),
  eliminarUnidad: (id) =>
    request('DELETE', `/unidades/${id}`),

  // Clientes
  listarClientes: (negocio_id) =>
    request('GET', `/clientes?negocio_id=${negocio_id}`),
  buscarClientes: (q, negocio_id) =>
    request('GET', `/clientes/buscar?q=${encodeURIComponent(q)}&negocio_id=${negocio_id}`),
  crearCliente: (data) =>
    request('POST', '/clientes', data),
  editarCliente: (id, data) =>
    request('PUT', `/clientes/${id}`, data),
  desactivarCliente: (id) =>
    request('DELETE', `/clientes/${id}`),
  estadoCuentaCliente: (id, negocio_id) =>
    request('GET', `/clientes/${id}/estado-cuenta?negocio_id=${negocio_id}`),

  // Reportes
  reporteVentas: (negocio_id, fecha_inicio, fecha_fin) => {
    const params = new URLSearchParams({ negocio_id, fecha_inicio, fecha_fin })
    return request('GET', `/reportes/ventas?${params.toString()}`)
  },

  // Movimientos de inventario
  listarMovimientos: (negocio_id, producto_id) => {
    const params = new URLSearchParams({ negocio_id })
    if (producto_id) params.append('producto_id', producto_id)
    return request('GET', `/inventario/movimientos?${params.toString()}`)
  },

  // Audit log
  listarAuditLog: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return request('GET', `/audit-logs${q ? '?' + q : ''}`)
  },
}
