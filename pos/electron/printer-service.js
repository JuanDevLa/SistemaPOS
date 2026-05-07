// ESC/POS printer service para Blackpos WW-5888T (58mm USB)
const usb = require('usb')
const iconv = require('iconv-lite')

const ESC = Buffer.from([0x1B])
const GS  = Buffer.from([0x1D])
const LF  = Buffer.from([0x0A])

class PrinterService {
  constructor() {
    this.device   = null
    this.iface    = null
    this.endpoint = null
    this.encoding = 'CP850'
    // Cola: garantiza un trabajo de impresión a la vez.
    // .then(job, job) asegura que el siguiente corra aunque el anterior falle.
    this.printQueue = Promise.resolve()
  }

  // ── Detección ──────────────────────────────────────────────────────────────

  listDevices() {
    return usb.getDeviceList().map(d => ({
      vid:    d.deviceDescriptor.idVendor,
      pid:    d.deviceDescriptor.idProduct,
      vidHex: '0x' + d.deviceDescriptor.idVendor .toString(16).padStart(4, '0').toUpperCase(),
      pidHex: '0x' + d.deviceDescriptor.idProduct.toString(16).padStart(4, '0').toUpperCase(),
      usbClass: d.deviceDescriptor.bDeviceClass,
    }))
  }

  // ── Conexión / Desconexión ─────────────────────────────────────────────────

  async connect(vid, pid) {
    try {
      const devices = usb.getDeviceList()

      if (vid && pid) {
        this.device = devices.find(
          d => d.deviceDescriptor.idVendor === vid &&
               d.deviceDescriptor.idProduct === pid
        )
      }

      // Fallback: USB printer class (0x07) — no depende del VID/PID
      if (!this.device) {
        this.device = devices.find(d => d.deviceDescriptor.bDeviceClass === 0x07)
      }

      if (!this.device) {
        const hint = vid
          ? `VID:0x${vid.toString(16).toUpperCase()} PID:0x${pid?.toString(16).toUpperCase()} no encontrado`
          : 'Configura VID/PID en Configuración › Impresora'
        throw new Error(`Impresora no encontrada — ${hint}`)
      }

      this.device.open()
      this.iface    = this.device.interfaces[0]
      this.iface.claim()
      this.endpoint = this.iface.endpoints.find(e => e.direction === 'out')

      if (!this.endpoint) throw new Error('No output endpoint found')
      return true
    } catch (err) {
      console.error('Printer connection error:', err)
      throw err
    }
  }

  // P6: liberar interface antes de cerrar el device
  disconnect() {
    try {
      if (this.iface) {
        this.iface.release()
        this.iface = null
      }
      if (this.device) {
        this.device.close()
        this.device = null
      }
      this.endpoint = null
    } catch (err) {
      console.error('Disconnect error:', err)
    }
  }

  // ── Primitivas ─────────────────────────────────────────────────────────────

  async write(buffer) {
    if (!this.device) throw new Error('Printer not connected')
    return new Promise((resolve, reject) => {
      this.endpoint.transfer(buffer, err => err ? reject(err) : resolve())
    })
  }

  async reset() {
    await this.write(Buffer.concat([ESC, Buffer.from('@')]))
  }

  // ESC t 0x02 → CP850 (cubre ñ á é í ó ú ü ¿ ¡)
  // ESC t 0x00 → CP437 (USA/Standard)
  async setEncoding() {
    const page = this.encoding === 'CP437' ? 0x00 : 0x02
    await this.write(Buffer.concat([ESC, Buffer.from([0x74, page])]))
  }

  async align(mode) {
    await this.write(Buffer.concat([ESC, Buffer.from([0x61, mode])]))
  }

  async setFontSize(mode) {
    await this.write(Buffer.concat([GS, Buffer.from([0x21, mode])]))
  }

  async setBold(on) {
    await this.write(Buffer.concat([ESC, Buffer.from([0x45, on ? 1 : 0])]))
  }

  // P2: encode con iconv antes de enviar — soporta ñ/á/é/etc.
  async writeLine(text) {
    const encoded = this.encoding === 'UTF-8'
      ? Buffer.from(text, 'utf8')
      : iconv.encode(text, this.encoding)
    await this.write(Buffer.concat([encoded, LF]))
  }

  async writeDottedLine() {
    await this.writeLine('.'.repeat(32))
  }

  async cut() {
    await this.write(Buffer.concat([GS, Buffer.from([0x56, 0x00])]))
  }

  // pin: 0 → RJ11 pin 2 (default), 1 → RJ11 pin 5
  async openDrawer(pin = 0) {
    await this.write(Buffer.concat([
      ESC,
      Buffer.from([0x70, pin & 0x01, 0x19, 0x19])
    ]))
  }

  // ── Cola de impresión (P3) ──────────────────────────────────────────────────

  printTicket(venta) {
    const job = () => this._printTicketInternal(venta)
    this.printQueue = this.printQueue.then(job, job)
    return this.printQueue
  }

  printCorte(corte) {
    const job = () => this._printCorteInternal(corte)
    this.printQueue = this.printQueue.then(job, job)
    return this.printQueue
  }

  printCorteSnapshot(snapshot, opciones = {}) {
    const job = () => this._printCorteSnapshotInternal(snapshot, opciones)
    this.printQueue = this.printQueue.then(job, job)
    return this.printQueue
  }

  // ── Implementaciones internas ──────────────────────────────────────────────

  async _printTicketInternal(venta) {
    try {
      await this.reset()
      await this.setEncoding()

      await this.align(1)
      await this.setBold(true)
      await this.setFontSize(3)
      await this.writeLine((venta.ticket_nombre || venta.negocio || 'PDV').substring(0, 20))
      await this.setBold(false)
      await this.setFontSize(0)

      if (venta.ticket_slogan)   await this.writeLine(venta.ticket_slogan.substring(0, 32))
      if (venta.ticket_telefono) await this.writeLine(`Tel: ${venta.ticket_telefono}`)

      const now = new Date()
      await this.writeLine(now.toLocaleString('es-MX'))
      if (venta.folio) await this.writeLine(`Folio: ${venta.folio}`)

      await this.writeDottedLine()
      await this.align(0)

      await this.writeLine('PRODUCTOS')
      for (const item of venta.items) {
        const name  = item.nombre.substring(0, 24)
        const qty   = `x${item.cantidad}`.padStart(3)
        const price = `$${(item.cantidad * item.precio_unitario).toFixed(2)}`.padStart(8)
        await this.writeLine((name + ' '.repeat(32)).substring(0, 24) + qty + price)
        if (item.cantidad > 1) {
          await this.writeLine('  ' + `$${item.precio_unitario.toFixed(2)}/u`)
        }
      }

      await this.writeDottedLine()
      await this.align(2)

      if (venta.subtotal) {
        await this.writeLine(`Subtotal: $${parseFloat(venta.subtotal).toFixed(2)}`)
      }
      if (venta.descuento && parseFloat(venta.descuento) > 0) {
        await this.writeLine(`Descuento: -$${parseFloat(venta.descuento).toFixed(2)}`)
      }
      if (venta.iva_total && parseFloat(venta.iva_total) > 0) {
        const ivaAmt = parseFloat(venta.iva_total)
        const sinIva = parseFloat(venta.total) - ivaAmt
        await this.writeLine(`Subtotal s/IVA: $${sinIva.toFixed(2)}`)
        await this.writeLine(`IVA (16%): $${ivaAmt.toFixed(2)}`)
      }

      await this.setFontSize(3)
      await this.setBold(true)
      await this.writeLine(`TOTAL: $${parseFloat(venta.total).toFixed(2)}`)
      await this.setBold(false)
      await this.setFontSize(0)

      await this.align(0)
      await this.writeLine(`Metodo: ${venta.metodo_pago}`)
      if (venta.metodo_pago === 'efectivo' && venta.cambio) {
        await this.writeLine(`Recibido: $${parseFloat(venta.efectivo_recibido).toFixed(2)}`)
        await this.writeLine(`Cambio: $${parseFloat(venta.cambio).toFixed(2)}`)
      }

      await this.writeDottedLine()
      await this.align(1)
      await this.writeLine(venta.ticket_pie || 'Gracias por su compra!')
      await this.writeLine('')
      await this.writeLine('')
      await this.cut()

      return true
    } catch (err) {
      console.error('Print error:', err)
      throw err
    }
  }

  async _printCorteInternal(corte) {
    try {
      await this.reset()
      await this.setEncoding()

      await this.align(1)
      await this.setBold(true)
      await this.setFontSize(2)
      await this.writeLine('CORTE DE CAJA')
      await this.setBold(false)
      await this.setFontSize(0)

      if (corte.negocio) await this.writeLine(corte.negocio)
      if (corte.cajero)  await this.writeLine(`Cajero: ${corte.cajero}`)

      await this.align(0)
      await this.writeDottedLine()

      const fmt = iso => new Date(iso).toLocaleString('es-MX')
      await this.writeLine(`Apertura: ${fmt(corte.apertura)}`)
      await this.writeLine(`Cierre:   ${fmt(corte.cierre)}`)

      await this.writeDottedLine()
      await this.writeLine('VENTAS POR METODO')

      for (const r of corte.resumen_por_metodo || []) {
        const label = r.metodo_pago.padEnd(14)
        const total = `$${parseFloat(r.total).toFixed(2)}`.padStart(10)
        await this.writeLine(label + total)
      }

      const movs = corte.movimientos_caja || []
      if (movs.length > 0) {
        await this.writeDottedLine()
        await this.writeLine('ENTRADAS / SALIDAS')
        for (const m of movs) {
          const label = `${m.tipo}${m.motivo ? ' ' + m.motivo : ''}`.substring(0, 16).padEnd(16)
          const monto = `${m.tipo === 'entrada' ? '+' : '-'}$${parseFloat(m.monto).toFixed(2)}`.padStart(8)
          await this.writeLine(label + monto)
        }
      }

      await this.writeDottedLine()
      await this.align(2)
      await this.writeLine(`Ef. inicial:  $${parseFloat(corte.efectivo_inicial).toFixed(2)}`)
      await this.writeLine(`Ef. esperado: $${parseFloat(corte.efectivo_esperado).toFixed(2)}`)
      await this.writeLine(`Ef. contado:  $${parseFloat(corte.efectivo_contado).toFixed(2)}`)

      const dif = parseFloat(corte.diferencia)
      await this.setBold(true)
      await this.writeLine(`Diferencia:   $${dif.toFixed(2)}`)
      await this.setBold(false)

      await this.align(1)
      await this.writeDottedLine()
      await this.writeLine(dif === 0 ? 'Caja cuadrada' : dif > 0 ? `Sobran $${dif.toFixed(2)}` : `Faltan $${Math.abs(dif).toFixed(2)}`)
      await this.writeLine('')
      await this.writeLine('')
      await this.cut()

      return true
    } catch (err) {
      console.error('Print corte error:', err)
      throw err
    }
  }

  async _printCorteSnapshotInternal(snapshot, opciones = {}) {
    try {
      await this.reset()
      await this.setEncoding()

      const titulo = opciones.titulo || (
        snapshot.tipo === 'dia'    ? 'CORTE DEL DIA'   :
        snapshot.tipo === 'cierre' ? 'CIERRE DE TURNO' :
        'CORTE DE CAJERO'
      )

      await this.align(1)
      await this.setBold(true)
      await this.setFontSize(2)
      await this.writeLine(titulo)
      await this.setBold(false)
      await this.setFontSize(0)

      if (snapshot.negocio) await this.writeLine(snapshot.negocio)
      if (snapshot.cajero)  await this.writeLine(`Cajero: ${snapshot.cajero}`)

      await this.align(0)
      await this.writeDottedLine()

      const fmt = iso => iso ? new Date(iso).toLocaleString('es-MX') : '-'
      await this.writeLine(`De: ${fmt(snapshot.apertura)}`)
      await this.writeLine(`A:  ${fmt(snapshot.hasta || new Date().toISOString())}`)

      await this.writeDottedLine()
      const num = x => `$${parseFloat(x || 0).toFixed(2)}`

      await this.writeLine(`Ventas totales: ${num(snapshot.total_ventas).padStart(20)}`)
      await this.writeLine(`Ganancia:       ${num(snapshot.ganancia).padStart(20)}`)

      const metodos = snapshot.ventas_por_metodo || []
      if (metodos.length > 0) {
        await this.writeDottedLine()
        await this.writeLine('VENTAS POR METODO')
        for (const m of metodos) {
          await this.writeLine(String(m.metodo_pago).padEnd(14) + num(m.total).padStart(12))
        }
      }

      const movs = snapshot.movimientos_caja || []
      if (movs.length > 0) {
        const ent = movs.filter(m => m.tipo === 'entrada').reduce((s, m) => s + parseFloat(m.monto), 0)
        const sal = movs.filter(m => m.tipo === 'salida' ).reduce((s, m) => s + parseFloat(m.monto), 0)
        await this.writeDottedLine()
        await this.writeLine(`Entradas:       ${num(ent).padStart(12)}`)
        await this.writeLine(`Salidas:        ${num(sal).padStart(12)}`)
      }

      await this.writeDottedLine()
      await this.writeLine(`Fondo de caja:  ${num(snapshot.efectivo_inicial).padStart(12)}`)
      await this.writeLine(`Efectivo vtas:  ${num(snapshot.ventas_efectivo).padStart(12)}`)

      if (opciones.efectivoContado !== undefined) {
        const esperado = parseFloat(snapshot.efectivo_inicial || 0) + parseFloat(snapshot.ventas_efectivo || 0)
        const dif = opciones.diferencia !== undefined
          ? parseFloat(opciones.diferencia)
          : parseFloat(opciones.efectivoContado) - esperado
        await this.writeDottedLine()
        await this.writeLine(`Esperado:       ${num(esperado).padStart(12)}`)
        await this.writeLine(`Contado:        ${num(opciones.efectivoContado).padStart(12)}`)
        await this.setBold(true)
        await this.writeLine(`Diferencia:     ${num(dif).padStart(12)}`)
        await this.setBold(false)
        await this.align(1)
        await this.writeLine(dif === 0 ? 'Caja cuadrada' : dif > 0 ? `Sobran ${num(dif)}` : `Faltan ${num(Math.abs(dif))}`)
      }

      await this.align(1)
      await this.writeLine('')
      await this.writeLine('')
      await this.cut()
      return true
    } catch (err) {
      console.error('Print snapshot error:', err)
      throw err
    }
  }
}

module.exports = PrinterService
