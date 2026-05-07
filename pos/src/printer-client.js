// Cliente para imprimir tickets desde React
// Usa el API de Electron IPC expuesto en preload.js

export async function connectPrinter() {
  if (!window.printerAPI) {
    throw new Error('Printer API not available')
  }
  return window.printerAPI.connect()
}

export async function disconnectPrinter() {
  if (!window.printerAPI) {
    throw new Error('Printer API not available')
  }
  return window.printerAPI.disconnect()
}

export async function printTicket(venta) {
  if (!window.printerAPI) {
    throw new Error('Printer API not available')
  }
  return window.printerAPI.printTicket(venta)
}

export async function printCorte(corte) {
  if (!window.printerAPI) {
    throw new Error('Printer API not available')
  }
  return window.printerAPI.printCorte(corte)
}

export async function printCorteSnapshot(snapshot, opciones = {}) {
  if (!window.printerAPI) {
    throw new Error('Printer API not available')
  }
  return window.printerAPI.printCorteSnapshot(snapshot, opciones)
}

export async function openCashDrawer() {
  if (!window.printerAPI) {
    throw new Error('Printer API not available')
  }
  return window.printerAPI.openDrawer()
}

export async function reprintLastTicket() {
  if (!window.printerAPI) {
    throw new Error('Printer API not available')
  }
  return window.printerAPI.reprintLast()
}

export async function listPrinterDevices() {
  if (!window.printerAPI) {
    throw new Error('Printer API not available')
  }
  return window.printerAPI.listDevices()
}

export async function printRecarga(datos) {
  if (!window.printerAPI) {
    throw new Error('Printer API not available')
  }
  return window.printerAPI.printRecarga(datos)
}
