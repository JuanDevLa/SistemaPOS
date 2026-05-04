import { useState } from 'react'

const initial = {
  caja: null,             // null | 'entrada' | 'salida'
  varios: false,
  artComun: false,
  verificador: false,
  buscar: false,
  cliente: false,
  ticketPendiente: false,
  fiado: false,
  devoluciones: false,
  descuento: false,
  confirmBorrar: false,
  notas: null,            // null | { accion, tipo? }
  confirmEliminarTicket: false,
  cambiarTicket: false,
  logout: false,
  alertas: false,
}

export function useModales() {
  const [modales, setModales] = useState(initial)
  const mk = (key) => (val) => setModales(prev => ({ ...prev, [key]: val }))
  return {
    modales,
    setModalCaja:                   mk('caja'),
    setModalVarios:                 mk('varios'),
    setModalArtComun:               mk('artComun'),
    setModalVerificador:            mk('verificador'),
    setModalBuscar:                 mk('buscar'),
    setModalCliente:                mk('cliente'),
    setModalTicketPendiente:        mk('ticketPendiente'),
    setModalFiado:                  mk('fiado'),
    setModalDevoluciones:           mk('devoluciones'),
    setModalDescuento:              mk('descuento'),
    setModalConfirmBorrar:          mk('confirmBorrar'),
    setModalNotas:                  mk('notas'),
    setModalConfirmEliminarTicket:  mk('confirmEliminarTicket'),
    setModalCambiarTicket:          mk('cambiarTicket'),
    setModalLogout:                 mk('logout'),
    setModalAlertas:                mk('alertas'),
  }
}
