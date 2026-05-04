const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('printerAPI', {
  connect: () => ipcRenderer.invoke('printer:connect'),
  disconnect: () => ipcRenderer.invoke('printer:disconnect'),
  printTicket: (venta) => ipcRenderer.invoke('printer:print-ticket', venta),
  printCorte: (corte) => ipcRenderer.invoke('printer:print-corte', corte),
  printCorteSnapshot: (snapshot, opciones) => ipcRenderer.invoke('printer:print-corte-snapshot', { snapshot, opciones }),
  openDrawer: () => ipcRenderer.invoke('printer:open-drawer')
})

contextBridge.exposeInMainWorld('dbAPI', {
  checkConn: () => ipcRenderer.invoke('db:check-conn'),
  getApiUrl: () => ipcRenderer.invoke('db:get-api-url'),
  cacheProductos: (negocioId, token) => ipcRenderer.invoke('db:cache-productos', negocioId, token),
  buscarProducto: (q, negocioId) => ipcRenderer.invoke('db:buscar-producto', q, negocioId),
  cacheCajero: (nombre, pin, negocioId) => ipcRenderer.invoke('db:cache-cajero', nombre, pin, negocioId),
  loginOffline: (nombre, pin, negocioId) => ipcRenderer.invoke('db:login-offline', nombre, pin, negocioId),
  registrarVenta: (venta) => ipcRenderer.invoke('db:registrar-venta', venta),
  abrirCorte: (corte) => ipcRenderer.invoke('db:abrir-corte', corte),
  cerrarCorte: (id, datos) => ipcRenderer.invoke('db:cerrar-corte', id, datos),
  obtenerCorteAbierto: (negocioId, cajeroId) => ipcRenderer.invoke('db:obtener-corte-abierto', negocioId, cajeroId),
  registrarEntrada: (entrada) => ipcRenderer.invoke('db:registrar-entrada', entrada),
  registrarCargaInicial: (carga) => ipcRenderer.invoke('db:registrar-carga-inicial', carga),
  obtenerPendientes: () => ipcRenderer.invoke('db:obtener-pendientes'),
  marcarSincronizado: (tipo, id) => ipcRenderer.invoke('db:marcar-sincronizado', tipo, id),
  saveToken: (token) => ipcRenderer.invoke('token:save', token),
  loadToken: () => ipcRenderer.invoke('token:load')
})
