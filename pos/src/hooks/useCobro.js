import { useState } from 'react'
import { api } from '../api'
import { printTicket, openCashDrawer } from '../printer-client'

export function useCobro({ total, carrito, descuentoMonto, cart, usuario, corteActivo, puede, setTicket, setMensaje, setModalFiado, clienteSeleccionado }) {

  const [metodoPago, setMetodoPago]                           = useState(null)
  const [pagoCon, setPagoCon]                                 = useState('')
  const [clienteCredito, setClienteCredito]                   = useState(null)
  const [busquedaCredito, setBusquedaCredito]                 = useState('')
  const [resultadosCredito, setResultadosCredito]             = useState([])
  const [montoTarjeta, setMontoTarjeta]                       = useState('')
  const [referenciaTarjeta, setReferenciaTarjeta]             = useState('')
  const [nombreTarjeta, setNombreTarjeta]                     = useState('')
  const [referenciaTransferencia, setReferenciaTransferencia] = useState('')
  const [nombreTransferencia, setNombreTransferencia]         = useState('')
  const [montoPagadoFiado, setMontoPagadoFiado]               = useState('')
  const [nombreClienteFiado, setNombreClienteFiado]           = useState('')
  const [errorImpresora, setErrorImpresora]                   = useState(null)

  const cambio = pagoCon ? parseFloat(pagoCon) - total : 0

  const abrirCobro = () => {
    if (carrito.length === 0) return
    if (!puede('cobrar_ticket')) { setMensaje('Sin permiso: Cobrar un ticket'); return }
    setMetodoPago('efectivo')
  }

  const cobrar = async (metodo = null, overrides = {}) => {
    const metodoAUsar = metodo || metodoPago
    if (!metodoAUsar) { setMensaje('Selecciona un método de pago'); return }
    if (!puede('cobrar_ticket')) { setMensaje('Sin permiso: Cobrar un ticket'); return }
    if (metodoAUsar === 'efectivo' && (!pagoCon || parseFloat(pagoCon) < total)) {
      setMensaje('Ingresa el monto recibido'); return
    }
    if (metodoAUsar === 'credito' && !puede('cobrar_credito')) {
      setMensaje('Sin permiso: Cobrar a crédito'); return
    }
    if (metodoAUsar === 'credito' && !clienteCredito && !nombreClienteFiado.trim()) {
      setMensaje('Ingresa el nombre del cliente o búscalo en el sistema'); return
    }
    if (metodoAUsar === 'mixto') {
      const e = parseFloat(pagoCon)
      if (!pagoCon || e <= 0 || e >= total) {
        setMensaje('El monto en efectivo debe ser mayor a $0 y menor al total'); return
      }
    }

    // Validar stock antes de enviar al servidor
    for (const item of carrito) {
      if (item.stock_actual !== null && item.stock_actual !== undefined && item.cantidad > item.stock_actual) {
        setMensaje(`Sin existencia suficiente: "${item.nombre}" — disponible: ${item.stock_actual}, requerido: ${item.cantidad}`)
        return
      }
      if (item.stock_actual !== null && item.stock_actual !== undefined && item.stock_actual <= 0) {
        setMensaje(`Sin existencia: "${item.nombre}" tiene 0 unidades en inventario`)
        return
      }
    }

    const pagadoCredito = metodoAUsar === 'credito' ? parseFloat(montoPagadoFiado || 0) : 0
    let res
    try {
      const descGlobal = cart.descuentoGlobal
      const clienteId = clienteCredito?.id || clienteSeleccionado?.id || null
      res = await api.registrarVenta({
        negocio_id: usuario.negocio_id,
        corte_id: corteActivo?.id || null,
        metodo_pago: metodoAUsar,
        efectivo_recibido: metodoAUsar === 'efectivo' ? parseFloat(pagoCon)
          : metodoAUsar === 'mixto' ? parseFloat(pagoCon)
          : metodoAUsar === 'credito' && pagadoCredito > 0 ? pagadoCredito
          : null,
        monto_tarjeta:  metodoAUsar === 'mixto'   ? parseFloat((total - parseFloat(pagoCon)).toFixed(2))
          :             metodoAUsar === 'tarjeta' ? total
          : undefined,
        referencia:     metodoAUsar === 'tarjeta'        ? (overrides.referenciaTarjeta ?? referenciaTarjeta) || undefined
          :             metodoAUsar === 'mixto'          ? overrides.referenciaTarjeta || undefined
          :             metodoAUsar === 'transferencia'  ? referenciaTransferencia || undefined
          : undefined,
        nombre_tarjeta: metodoAUsar === 'tarjeta'        ? nombreTarjeta || undefined        : undefined,
        nombre_titular: metodoAUsar === 'transferencia'  ? nombreTransferencia || undefined  : undefined,
        nombre_cliente: metodoAUsar === 'credito'        ? (clienteCredito?.nombre || nombreClienteFiado) : null,
        cliente_id:     clienteId,
        descuento: descuentoMonto > 0 ? descuentoMonto : undefined,
        descuento_global: descGlobal?.valor > 0 ? descGlobal : undefined,
        items: carrito.map(i => ({
          producto_id:    i.producto_id,
          cantidad:       i.cantidad,
          precio_unitario: i.precio_venta,
          descuento_item: 0,
        }))
      })
    } catch(e) {
      setMensaje(e.message); return
    }

    if (!res.venta_id) { setMensaje('Error al registrar venta'); return }

    if (metodoAUsar === 'credito' && clienteCredito) {
      const montoDeuda = total - pagadoCredito
      if (montoDeuda > 0) {
        try {
          await api.registrarCredito({ cliente_id: clienteCredito.id, venta_id: res.venta_id, negocio_id: usuario.negocio_id, monto: montoDeuda })
        } catch(e) {
          setMensaje(`Venta registrada (Ticket: ${res.venta_id}) pero error al registrar crédito: ${e.message}`)
        }
      }
    }

    setTicket({ ...res, items: carrito, cambio: res.cambio })
    cart.limpiarCarritoActivo()
    setPagoCon(''); setMontoTarjeta(''); setReferenciaTarjeta(''); setNombreTarjeta('')
    setReferenciaTransferencia(''); setNombreTransferencia(''); setMontoPagadoFiado('')
    setMetodoPago(null); setNombreClienteFiado(''); setClienteCredito(null)
    setBusquedaCredito(''); setResultadosCredito([]); setModalFiado(false)

    if (window.printerAPI) {
      setMensaje('Imprimiendo ticket...')
      const datosTicket = {
        venta_id: res.venta_id, folio: res.folio,
        negocio: usuario.negocio_nombre, ticket_nombre: usuario.ticket_nombre,
        ticket_slogan: usuario.ticket_slogan, ticket_telefono: usuario.ticket_telefono,
        ticket_pie: usuario.ticket_pie,
        items: carrito.map(i => ({ nombre: i.nombre, cantidad: i.cantidad, precio_unitario: i.precio_venta })),
        subtotal: res.subtotal, descuento: res.descuento, total: res.total, iva_total: res.iva_total,
        metodo_pago: metodoAUsar, efectivo_recibido: res.efectivo_recibido, cambio: res.cambio
      }
      try {
        const pr = await printTicket(datosTicket)
        if (pr.success) {
          setMensaje('Ticket impreso')
          if (metodoAUsar === 'efectivo') { try { await openCashDrawer() } catch (_) {} }
        } else {
          setErrorImpresora({ folio: res.folio, total: res.total })
        }
      } catch {
        setErrorImpresora({ folio: res.folio, total: res.total })
      }
    } else {
      setMensaje(`Ticket: ${res.venta_id}`)
    }
  }

  return {
    metodoPago, setMetodoPago,
    pagoCon, setPagoCon, cambio,
    clienteCredito, setClienteCredito,
    busquedaCredito, setBusquedaCredito,
    resultadosCredito, setResultadosCredito,
    montoTarjeta, setMontoTarjeta,
    referenciaTarjeta, setReferenciaTarjeta,
    nombreTarjeta, setNombreTarjeta,
    referenciaTransferencia, setReferenciaTransferencia,
    nombreTransferencia, setNombreTransferencia,
    montoPagadoFiado, setMontoPagadoFiado,
    nombreClienteFiado, setNombreClienteFiado,
    cobrar, abrirCobro,
    errorImpresora, setErrorImpresora,
  }
}
