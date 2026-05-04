// ESC/POS printer service para Blackpos WW-5888T (58mm USB)
// Documentación: https://www.blackpos.com/

const usb = require('usb')

// Códigos ESC/POS estándar
const ESC = Buffer.from([0x1B])
const GS = Buffer.from([0x1D])
const LF = Buffer.from([0x0A])
const CR = Buffer.from([0x0D])

class PrinterService {
  constructor() {
    this.device = null
    this.endpoint = null
    // Blackpos WW-5888T: VID=0x0483 (STM32), PID puede variar
    this.VENDOR_ID = 0x0483
  }

  // Buscar y conectar a la impresora
  async connect() {
    try {
      const devices = usb.getDeviceList()
      this.device = devices.find(d => d.deviceDescriptor.idVendor === this.VENDOR_ID)

      if (!this.device) {
        // Fallback: buscar cualquier dispositivo USB con "printer" en descripción
        this.device = devices[0]
      }

      if (!this.device) {
        throw new Error('No printer found')
      }

      this.device.open()

      // Buscar endpoint OUT (para escribir)
      const iface = this.device.interfaces[0]
      iface.claim()
      const endpoint = iface.endpoints.find(e => e.direction === 'out')

      if (!endpoint) {
        throw new Error('No output endpoint found')
      }

      this.endpoint = endpoint
      return true
    } catch (err) {
      console.error('Printer connection error:', err)
      throw err
    }
  }

  disconnect() {
    try {
      if (this.device) {
        this.device.close()
        this.device = null
      }
    } catch (err) {
      console.error('Disconnect error:', err)
    }
  }

  // Escribir buffer a la impresora
  async write(buffer) {
    if (!this.device) {
      throw new Error('Printer not connected')
    }

    return new Promise((resolve, reject) => {
      this.endpoint.transfer(buffer, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }

  // Comandos ESC/POS

  // Reset impresora
  async reset() {
    const buf = Buffer.concat([ESC, Buffer.from('@')])
    await this.write(buf)
  }

  // Text encoding UTF-8
  async setEncoding() {
    const buf = Buffer.concat([ESC, Buffer.from([0x74, 0x00])])
    await this.write(buf)
  }

  // Alineación: 0=left, 1=center, 2=right
  async align(mode) {
    const buf = Buffer.concat([ESC, Buffer.from([0x61, mode])])
    await this.write(buf)
  }

  // Tamaño fuente: 0=normal, 1=2x ancho, 2=2x alto, 3=2x todo
  async setFontSize(mode) {
    const buf = Buffer.concat([GS, Buffer.from([0x21, mode])])
    await this.write(buf)
  }

  // Bold on/off
  async setBold(on) {
    const buf = Buffer.concat([ESC, Buffer.from([0x45, on ? 1 : 0])])
    await this.write(buf)
  }

  // Escribir texto con salto de línea
  async writeLine(text) {
    const buf = Buffer.concat([Buffer.from(text, 'utf8'), LF])
    await this.write(buf)
  }

  // Línea punteada (máximo 32 caracteres para 58mm)
  async writeDottedLine() {
    const dots = '.'.repeat(32)
    await this.writeLine(dots)
  }

  // Cut (corte parcial)
  async cut() {
    const buf = Buffer.concat([GS, Buffer.from([0x56, 0x00])])
    await this.write(buf)
  }

  // Open cash drawer (comando RJ11 para Blackpos)
  // Según especificación: ESC p <pin1> <pin2> <on-time> <off-time>
  async openDrawer() {
    // Parámetros típicos: pin1=0, pin2=0, on-time=25 (25*2ms=50ms), off-time=25
    const buf = Buffer.concat([
      ESC,
      Buffer.from([0x70, 0x00, 0x00, 0x19, 0x19])
    ])
    await this.write(buf)
  }

  // Imprimir ticket de venta
  async printTicket(venta) {
    try {
      await this.reset()
      await this.setEncoding()

      // Header
      await this.align(1)
      await this.setBold(true)
      await this.setFontSize(3)
      await this.writeLine((venta.ticket_nombre || venta.negocio || 'PDV').substring(0, 20))
      await this.setBold(false)
      await this.setFontSize(0)

      if (venta.ticket_slogan) await this.writeLine(venta.ticket_slogan.substring(0, 32))
      if (venta.ticket_telefono) await this.writeLine(`Tel: ${venta.ticket_telefono}`)

      // Fecha, hora y folio
      const now = new Date()
      await this.writeLine(now.toLocaleString('es-MX'))
      if (venta.folio) await this.writeLine(`Folio: ${venta.folio}`)

      await this.writeDottedLine()

      // Align left para items
      await this.align(0)

      // Items
      await this.writeLine('PRODUCTOS')
      venta.items.forEach(item => {
        const name = item.nombre.substring(0, 24)
        const qty = `x${item.cantidad}`.padStart(3)
        const price = `$${(item.cantidad * item.precio_unitario).toFixed(2)}`.padStart(8)

        // Línea 1: nombre + cantidad + precio
        const line1 = (name + ' '.repeat(32)).substring(0, 24) + qty + price
        this.writeLine(line1)

        // Línea 2: precio unitario (si cantidad > 1)
        if (item.cantidad > 1) {
          const unitPrice = `$${item.precio_unitario.toFixed(2)}/u`
          this.writeLine('  ' + unitPrice)
        }
      })

      await this.writeDottedLine()

      // Subtotal, descuento, total
      await this.align(2) // right

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

      // Total en grande
      await this.setFontSize(3)
      await this.setBold(true)
      await this.writeLine(`TOTAL: $${parseFloat(venta.total).toFixed(2)}`)
      await this.setBold(false)
      await this.setFontSize(0)

      // Método de pago y cambio
      await this.align(0)
      await this.writeLine(`Método: ${venta.metodo_pago}`)

      if (venta.metodo_pago === 'efectivo' && venta.cambio) {
        await this.writeLine(`Recibido: $${venta.efectivo_recibido.toFixed(2)}`)
        await this.writeLine(`Cambio: $${venta.cambio.toFixed(2)}`)
      }

      // Footer
      await this.writeDottedLine()
      await this.align(1)
      await this.writeLine(venta.ticket_pie || '¡Gracias por su compra!')
      await this.writeLine('')
      await this.writeLine('')

      // Cut
      await this.cut()

      return true
    } catch (err) {
      console.error('Print error:', err)
      throw err
    }
  }

  // Imprimir corte de caja
  async printCorte(corte) {
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
      if (corte.cajero) await this.writeLine(`Cajero: ${corte.cajero}`)

      await this.align(0)
      await this.writeDottedLine()

      const fmt = (iso) => new Date(iso).toLocaleString('es-MX')
      await this.writeLine(`Apertura: ${fmt(corte.apertura)}`)
      await this.writeLine(`Cierre:   ${fmt(corte.cierre)}`)

      await this.writeDottedLine()
      await this.writeLine('VENTAS POR METODO')

      const resumen = corte.resumen_por_metodo || []
      for (const r of resumen) {
        const label = r.metodo_pago.padEnd(14)
        const total = `$${parseFloat(r.total).toFixed(2)}`.padStart(10)
        await this.writeLine(label + total)
      }

      const movs = corte.movimientos_caja || []
      if (movs.length > 0) {
        await this.writeDottedLine()
        await this.align(0)
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

  // Imprimir resumen de corte (cajero / día / cierre) desde un snapshot.
  // opciones: { titulo, efectivoContado, diferencia }
  async printCorteSnapshot(snapshot, opciones = {}) {
    try {
      await this.reset()
      await this.setEncoding()

      const titulo = opciones.titulo || (
        snapshot.tipo === 'dia'    ? 'CORTE DEL DIA'    :
        snapshot.tipo === 'cierre' ? 'CIERRE DE TURNO'  :
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

      const fmt = (iso) => iso ? new Date(iso).toLocaleString('es-MX') : '—'
      await this.writeLine(`De: ${fmt(snapshot.apertura)}`)
      await this.writeLine(`A:  ${fmt(snapshot.hasta || new Date().toISOString())}`)

      await this.writeDottedLine()
      const num = (x) => `$${parseFloat(x || 0).toFixed(2)}`

      // Totales esenciales
      await this.writeLine(`Ventas totales: ${num(snapshot.total_ventas).padStart(20)}`)
      await this.writeLine(`Ganancia:       ${num(snapshot.ganancia).padStart(20)}`)

      const metodos = snapshot.ventas_por_metodo || []
      if (metodos.length > 0) {
        await this.writeDottedLine()
        await this.writeLine('VENTAS POR METODO')
        for (const m of metodos) {
          const label = String(m.metodo_pago).padEnd(14)
          await this.writeLine(label + num(m.total).padStart(12))
        }
      }

      // Movimientos resumen
      const movs = snapshot.movimientos_caja || []
      if (movs.length > 0) {
        const ent = movs.filter(m => m.tipo === 'entrada').reduce((s, m) => s + parseFloat(m.monto), 0)
        const sal = movs.filter(m => m.tipo === 'salida').reduce((s, m) => s + parseFloat(m.monto), 0)
        await this.writeDottedLine()
        await this.writeLine(`Entradas:       ${num(ent).padStart(12)}`)
        await this.writeLine(`Salidas:        ${num(sal).padStart(12)}`)
      }

      await this.writeDottedLine()
      await this.writeLine(`Fondo de caja:  ${num(snapshot.efectivo_inicial).padStart(12)}`)
      await this.writeLine(`Efectivo vtas:  ${num(snapshot.ventas_efectivo).padStart(12)}`)

      // Si es cierre, mostrar contado y diferencia
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
