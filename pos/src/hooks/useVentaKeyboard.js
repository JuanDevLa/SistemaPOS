import { useEffect, useRef } from 'react'
import { openCashDrawer } from '../printer-client'

export function useVentaKeyboard({
  tab, setTab,
  metodoPago, setMetodoPago,
  cobrar, abrirCobro,
  setPagoCon, setMontoTarjeta,
  puede, setMensaje,
  cart, handleAccion,
  busquedaRef, ticket,
  setModalCaja, setModalVarios, setModalArtComun,
  setModalVerificador, setModalBuscar, setModalCliente,
  setModalTicketPendiente, setModalFiado,
  setModalConfirmBorrar, setModalDevoluciones, setModalDescuento,
  abrirNotasCaja, abrirNotasDescuento, setModalNotas,
  mpEstado,
}) {
  const { carrito } = cart

  // Ref para siempre llamar la versión actual de cobrar sin re-registrar el listener en cada tecla
  const cobrarRef = useRef(cobrar)
  useEffect(() => { cobrarRef.current = cobrar }, [cobrar])

  useEffect(() => {
    const onKey = (e) => {
      // ── Panel de cobro abierto ─────────────────────────────
      if (metodoPago !== null) {
        if (e.key === 'F1' || e.key === 'F2' || e.key === 'F12' || e.key === 'Enter') { e.preventDefault(); cobrarRef.current(); return }
        if (e.key === 'Escape') {
          e.preventDefault()
          if ((metodoPago === 'tarjeta' || metodoPago === 'mixto') && (mpEstado === 'procesando' || mpEstado === 'completado')) return
          setMetodoPago(null); return
        }
        if (metodoPago === 'efectivo' || metodoPago === 'mixto') {
          const setter = setPagoCon
          if (e.key >= '0' && e.key <= '9') { e.preventDefault(); setter(p => p + e.key); return }
          if (e.key === '.')        { e.preventDefault(); setter(p => p.includes('.') ? p : p + '.'); return }
          if (e.key === 'Backspace') { e.preventDefault(); setter(p => p.slice(0, -1)); return }
        }
        return
      }

      // ── Navegación de tabs ─────────────────────────────────
      if (e.key === 'F1') { e.preventDefault(); setTab('venta') }
      if (e.key === 'F2') { e.preventDefault(); puede('ver_cuentas_credito') ? setTab('creditos') : setMensaje('Sin permiso: Ver cuentas de crédito') }
      if (e.key === 'F3') { e.preventDefault(); puede('crear_productos') ? setTab('productos') : setMensaje('Sin permiso: Productos') }
      if (e.key === 'F4') { e.preventDefault(); puede('ver_existencias') ? setTab('inventario') : setMensaje('Sin permiso: Ver inventario') }

      // ── Acciones en tab venta ──────────────────────────────
      if (tab !== 'venta') return
      if (e.key === 'F5')  { e.preventDefault(); cart.nuevoTicket() }
      if (e.key === 'F6')  { e.preventDefault(); setModalTicketPendiente(true) }
      if (e.key === 'F7')  { e.preventDefault(); puede('entrada_efectivo') ? abrirNotasCaja('entrada') : setMensaje('Sin permiso: Entrada de efectivo') }
      if (e.key === 'F8')  { e.preventDefault(); puede('salida_efectivo')  ? abrirNotasCaja('salida')  : setMensaje('Sin permiso: Salida de efectivo') }
      if (e.key === 'F9')  { e.preventDefault(); setModalVerificador(true) }
      if (e.key === 'F10') { e.preventDefault(); puede('buscar_productos') ? setModalBuscar(true) : setMensaje('Sin permiso: Buscador de productos') }
      if (e.key === 'F12') { e.preventDefault(); abrirCobro() }
      if (e.key === 'Insert') { e.preventDefault(); setModalVarios(true) }

      if (e.ctrlKey && e.altKey) {
        if (e.key === 'd' || e.key === 'D') {
          e.preventDefault()
          if (!puede('entrada_efectivo')) { setMensaje('Sin permiso: Abrir cajón'); return }
          openCashDrawer().catch(() => setMensaje('Error al abrir cajón'))
        }
      }

      if (e.ctrlKey && !e.altKey) {
        if (e.key === 'm' || e.key === 'M') { e.preventDefault(); puede('aplicar_mayoreo')    ? handleAccion('mayoreo')    : setMensaje('Sin permiso: Precio mayoreo') }
        if (e.key === 'p' || e.key === 'P') { e.preventDefault(); puede('usar_producto_comun') ? setModalArtComun(true)     : setMensaje('Sin permiso: Producto común') }
        if (e.key === 'c' || e.key === 'C') { e.preventDefault(); setModalCliente(true) }
        if (e.key === 'd' || e.key === 'D') { e.preventDefault(); puede('cancelar_devolver')   ? setModalDevoluciones(true) : setMensaje('Sin permiso: Devoluciones') }
        if (e.key === 'k' || e.key === 'K') { e.preventDefault(); puede('aplicar_descuento')   ? abrirNotasDescuento()     : setMensaje('Sin permiso: Descuentos') }
      }

      if (e.key === 'Escape') {
        e.preventDefault()
        setMetodoPago(null); setModalCaja(null); setModalVarios(false); setModalArtComun(false)
        setModalVerificador(false); setModalBuscar(false); setModalCliente(false)
        setModalConfirmBorrar(false); setModalDevoluciones(false); setModalDescuento(false)
        setModalTicketPendiente(false); setModalFiado(false); setModalNotas(null)
      }

      if (e.key === 'Delete' && cart.filaSeleccionada) {
        e.preventDefault()
        if (!puede('eliminar_articulo_venta')) { setMensaje('Sin permiso: Eliminar artículo'); return }
        cart.prepararBorrar(cart.filaSeleccionada)
        setModalConfirmBorrar(true)
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [tab, carrito, metodoPago])

  // Auto-focus en búsqueda al volver a venta
  useEffect(() => {
    if (tab === 'venta' && !ticket && !metodoPago) {
      setTimeout(() => busquedaRef.current?.focus(), 50)
    }
  }, [tab, ticket, metodoPago])
}
