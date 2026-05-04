import { useState } from 'react'
import { api } from '../api'

/**
 * Maneja el estado y la lógica del carrito y los tickets de venta.
 * No contiene lógica de UI, modales, ni llamadas de cobro.
 *
 * @param {number} negocio_id - ID del negocio activo
 */
export function useCart(negocio_id) {
  const [tickets, setTickets]               = useState([{ id: 1, nombre: '', carrito: [], descuento: { tipo: '%', valor: 0 } }])
  const [ticketActivo, setTicketActivo]     = useState(1)
  const [filaSeleccionada, setFilaSeleccionada] = useState(null)
  const [productoABorrar, setProductoABorrar]   = useState(null)

  // ── Derivados ─────────────────────────────────────────────────
  const carrito         = tickets.find(t => t.id === ticketActivo)?.carrito || []
  const descuentoGlobal = tickets.find(t => t.id === ticketActivo)?.descuento || { tipo: '%', valor: 0 }
  const subtotal        = carrito.reduce((s, i) => s + i.importe, 0)
  const descuentoMonto  = descuentoGlobal.valor > 0
    ? (descuentoGlobal.tipo === '%'
        ? subtotal * (descuentoGlobal.valor / 100)
        : Math.min(descuentoGlobal.valor, subtotal))
    : 0
  const total = subtotal - descuentoMonto

  // ── Helpers internos ──────────────────────────────────────────
  const setCarritoActivo = (updater) =>
    setTickets(prev => prev.map(t =>
      t.id === ticketActivo
        ? { ...t, carrito: typeof updater === 'function' ? updater(t.carrito) : updater }
        : t
    ))

  const aplicarDescuentoGlobal = (tipo, valor) =>
    setTickets(prev => prev.map(t =>
      t.id === ticketActivo ? { ...t, descuento: { tipo, valor } } : t
    ))

  // ── Operaciones de carrito ────────────────────────────────────

  // Retorna { error: string } si no se puede agregar, null si fue exitoso.
  const agregarAlCarrito = async (producto, cantidad = 1) => {
    const cant = parseFloat(cantidad) || 1

    let stock_actual = producto.stock_actual != null ? parseFloat(producto.stock_actual) : null
    if (stock_actual === null) {
      try {
        if (window.dbAPI?.getStockProducto) {
          const inv = await window.dbAPI.getStockProducto(producto.id, negocio_id)
          stock_actual = inv?.cantidad ?? null
        }
      } catch (_) {}
    }

    if (stock_actual !== null && stock_actual <= 0) {
      return { error: `Sin existencia: "${producto.nombre}" tiene 0 unidades en inventario` }
    }

    const existe = carrito.find(i => i.producto_id === producto.id)
    if (existe) {
      const nuevaCantidad = existe.cantidad + cant
      if (stock_actual !== null && nuevaCantidad > stock_actual) {
        return { error: `Stock insuficiente: "${producto.nombre}" solo tiene ${stock_actual} unidad(es)` }
      }
      setCarritoActivo(prev => prev.map(i =>
        i.producto_id === producto.id
          ? { ...i, cantidad: nuevaCantidad, importe: i.precio_venta * nuevaCantidad }
          : i
      ))
      return null
    }

    if (stock_actual !== null && cant > stock_actual) {
      return { error: `Stock insuficiente: "${producto.nombre}" solo tiene ${stock_actual} unidad(es)` }
    }

    const precio_venta = parseFloat(producto.precio)
    setCarritoActivo(prev => [...prev, {
      producto_id:    producto.id,
      codigo_barras:  producto.codigo_barras || '',
      nombre:         producto.nombre,
      precio_venta,
      precio_mayoreo: producto.precio_mayoreo ? parseFloat(producto.precio_mayoreo) : null,
      cantidad:       cant,
      importe:        precio_venta * cant,
      stock_actual
    }])
    return null
  }

  const cambiarCantidad = (producto_id, delta) =>
    setCarritoActivo(prev => prev.map(i => {
      if (i.producto_id !== producto_id) return i
      const q = Math.max(1, i.cantidad + delta)
      return { ...i, cantidad: q, importe: i.precio_venta * q }
    }))

  const quitarItem = (producto_id) =>
    setCarritoActivo(prev => prev.filter(i => i.producto_id !== producto_id))

  const aplicarMayoreo = (descuento, productoId) => {
    const factor = 1 - (descuento / 100)
    setCarritoActivo(prev => prev.map(i => {
      if (productoId && i.producto_id !== productoId) return i
      const nuevoPrecio = i.precio_venta * factor
      return { ...i, precio_venta: nuevoPrecio, importe: nuevoPrecio * i.cantidad }
    }))
  }

  // Aplica un precio fijo a un producto del carrito (precio de mayoreo configurado)
  const aplicarPrecioFijo = (producto_id, precio) =>
    setCarritoActivo(prev => prev.map(i =>
      i.producto_id === producto_id
        ? { ...i, precio_venta: precio, importe: precio * i.cantidad }
        : i
    ))

  // Llamar después de un cobro exitoso para vaciar el carrito activo
  const limpiarCarritoActivo = () => {
    setCarritoActivo([])
    setTickets(prev => prev.map(t =>
      t.id === ticketActivo ? { ...t, descuento: { tipo: '%', valor: 0 } } : t
    ))
  }

  // ── Operaciones de borrado ────────────────────────────────────

  const prepararBorrar = (producto_id) => {
    const producto = carrito.find(i => i.producto_id === producto_id)
    if (producto) setProductoABorrar(producto)
  }

  const confirmarBorrar = () => {
    if (productoABorrar) {
      quitarItem(productoABorrar.producto_id)
      setFilaSeleccionada(null)
    }
    setProductoABorrar(null)
  }

  const cancelarBorrar = () => setProductoABorrar(null)

  // ── Operaciones de tickets ────────────────────────────────────

  const nuevoTicket = (nombre = '') => {
    const id = Math.max(...tickets.map(t => t.id)) + 1
    const nombreSafe = typeof nombre === 'string' ? nombre : ''
    setTickets(prev => [...prev, { id, nombre: nombreSafe, carrito: [], descuento: { tipo: '%', valor: 0 } }])
    setTicketActivo(id)
  }

  // Elimina el ticket activo. VentaScreen debe llamar busquedaRef.current?.limpiar() después.
  const eliminarTicketActivo = () => {
    if (tickets.length === 1) {
      setTickets([{ id: 1, nombre: '', carrito: [] }])
      setTicketActivo(1)
    } else {
      const resto = tickets.filter(t => t.id !== ticketActivo)
      setTickets(resto)
      setTicketActivo(resto[resto.length - 1].id)
    }
  }

  // Guarda el ticket actual con nombre y abre uno nuevo.
  // VentaScreen debe llamar busquedaRef.current?.limpiar() después.
  const guardarTicketPendiente = (nombre) => {
    setTickets(prev => prev.map(t => t.id === ticketActivo ? { ...t, nombre } : t))
    nuevoTicket()
  }

  // Limpia el carrito sin guardar.
  // VentaScreen debe llamar busquedaRef.current?.limpiar() después.
  const limpiarSinGuardar = () => limpiarCarritoActivo()

  return {
    // Estado
    tickets,
    ticketActivo,   setTicketActivo,
    filaSeleccionada, setFilaSeleccionada,
    productoABorrar,

    // Derivados
    carrito,
    subtotal,
    descuentoGlobal,
    descuentoMonto,
    total,

    // Descuento global
    aplicarDescuentoGlobal,

    // Carrito
    agregarAlCarrito,
    cambiarCantidad,
    quitarItem,
    aplicarMayoreo,
    aplicarPrecioFijo,
    limpiarCarritoActivo,

    // Borrado
    prepararBorrar,
    confirmarBorrar,
    cancelarBorrar,

    // Tickets
    nuevoTicket,
    eliminarTicketActivo,
    guardarTicketPendiente,
    limpiarSinGuardar,
  }
}
