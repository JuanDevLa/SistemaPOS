const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('kioskAPI', {
  // Registrar callback que se dispara cuando main pide el PIN de salida (Ctrl+Shift+Q)
  onPedirSalida: (cb) => ipcRenderer.on('kiosk:pedir-salida', cb),
  verificarPin: (pin) => ipcRenderer.invoke('kiosk:verificar-pin', pin),
  salir: () => ipcRenderer.invoke('kiosk:salir'),
})

contextBridge.exposeInMainWorld('configAPI', {
  leer: () => ipcRenderer.invoke('config:leer'),
  guardar: (data) => ipcRenderer.invoke('config:guardar', data),
})

contextBridge.exposeInMainWorld('updaterAPI', {
  verificar:    ()   => ipcRenderer.invoke('updater:verificar'),
  instalar:     ()   => ipcRenderer.invoke('updater:instalar'),
  onDisponible: (cb) => ipcRenderer.on('updater:disponible', (_e, version) => cb(version)),
  onListo:      (cb) => ipcRenderer.on('updater:listo',      (_e, version) => cb(version)),
})

contextBridge.exposeInMainWorld('printerAPI', {
  connect:            ()                    => ipcRenderer.invoke('printer:connect'),
  disconnect:         ()                    => ipcRenderer.invoke('printer:disconnect'),
  listDevices:        ()                    => ipcRenderer.invoke('printer:list-devices'),
  printTicket:        (venta)               => ipcRenderer.invoke('printer:print-ticket', venta),
  reprintLast:        ()                    => ipcRenderer.invoke('printer:reprint-last'),
  printCorte:         (corte)               => ipcRenderer.invoke('printer:print-corte', corte),
  printCorteSnapshot: (snapshot, opciones)  => ipcRenderer.invoke('printer:print-corte-snapshot', { snapshot, opciones }),
  openDrawer:         ()                    => ipcRenderer.invoke('printer:open-drawer'),
})

contextBridge.exposeInMainWorld('licenciaAPI', {
  verificar:   ()      => ipcRenderer.invoke('licencia:verificar'),
  activar:     (clave) => ipcRenderer.invoke('licencia:activar', clave),
  getHardwareId: ()    => ipcRenderer.invoke('licencia:hardware-id'),
})

contextBridge.exposeInMainWorld('dbAPI', {
  checkConn: () => ipcRenderer.invoke('db:check-conn'),
  getApiUrl: () => ipcRenderer.invoke('db:get-api-url'),
  cacheProductos: (negocioId, token) => ipcRenderer.invoke('db:cache-productos', negocioId, token),
  buscarProducto: (q, negocioId) => ipcRenderer.invoke('db:buscar-producto', q, negocioId),
  cacheCajero: (nombre, pin, negocioId, rol) => ipcRenderer.invoke('db:cache-cajero', nombre, pin, negocioId, rol),
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
