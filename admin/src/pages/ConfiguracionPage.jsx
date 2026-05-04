import { useState } from 'react'
import CajerosSection from '../components/CajerosSection'
import NegociosSection from '../components/NegociosSection'
import UnidadesSection from '../components/UnidadesSection'
import { s } from '../components/configuracion/estilos'
import { ModalFolios }     from '../components/configuracion/ModalFolios'
import { ModalTicket }     from '../components/configuracion/ModalTicket'
import { ModalCortes }     from '../components/configuracion/ModalCortes'
import { ModalFormasPago } from '../components/configuracion/ModalFormasPago'
import { ModalRecargas }   from '../components/configuracion/ModalRecargas'
import { ModalBaseDatos }  from '../components/configuracion/ModalBaseDatos'
import {
  ModalImpuestos, ModalMoneda, ModalSeguridad,
  ModalDevoluciones, ModalStockAlertas, ModalCreditoGlobal,
} from '../components/configuracion/ModalesPersonalizacion'
import {
  ModalImpresora, ModalCajon, ModalTerminalTPV, ModalLectorCodigos,
} from '../components/configuracion/ModalesDispositivos'
import {
  ModalPagoServicios, ModalCompras, ModalRespaldo,
} from '../components/configuracion/ModalesServicios'

const MODALES = {
  folios:       ModalFolios,
  ticket:       ModalTicket,
  cortes:       ModalCortes,
  impuestos:    ModalImpuestos,
  moneda:       ModalMoneda,
  formasPago:   ModalFormasPago,
  seguridad:    ModalSeguridad,
  devoluciones: ModalDevoluciones,
  stockAlertas: ModalStockAlertas,
  creditoGlobal:ModalCreditoGlobal,
  lectorCodigos:ModalLectorCodigos,
  recargas:     ModalRecargas,
  terminalTPV:  ModalTerminalTPV,
  cajon:        ModalCajon,
  impresora:    ModalImpresora,
  pagoServicios:ModalPagoServicios,
  compras:      ModalCompras,
  respaldo:     ModalRespaldo,
  baseDatos:    ModalBaseDatos,
}

export default function ConfiguracionPage() {
  const [modal, setModal] = useState(null)
  const [seccionActiva, setSeccionActiva] = useState(null)

  if (seccionActiva === 'cajeros')  return <CajerosSection  onBack={() => setSeccionActiva(null)} />
  if (seccionActiva === 'negocios') return <NegociosSection onBack={() => setSeccionActiva(null)} />
  if (seccionActiva === 'unidades') return <UnidadesSection onBack={() => setSeccionActiva(null)} />

  const ModalActivo = modal ? MODALES[modal] : null

  return (
    <div>
      <div style={s.pageHeader}>
        <h2 style={s.pageTitle}>Configuración</h2>
      </div>

      <Seccion titulo="General">
        <Tarjeta icono="👤" label="Cajeros"         onClick={() => setSeccionActiva('cajeros')} />
        <Tarjeta icono="🏪" label="Negocios"        onClick={() => setSeccionActiva('negocios')} />
        <Tarjeta icono="🔒" label="Seguridad"       onClick={() => setModal('seguridad')} />
        <Tarjeta icono="🗂️" label="Base de datos"   onClick={null} proximamente />
        <Tarjeta icono="📄" label="Facturación"     onClick={null} proximamente />
      </Seccion>

      <Seccion titulo="Personalización">
        <Tarjeta icono="🔢" label="Folios de ticket"      onClick={() => setModal('folios')} />
        <Tarjeta icono="🧾" label="Formato de ticket"     onClick={() => setModal('ticket')} />
        <Tarjeta icono="✂️" label="Cortes"                onClick={() => setModal('cortes')} />
        <Tarjeta icono="💳" label="Formas de pago"        onClick={() => setModal('formasPago')} />
        <Tarjeta icono="💲" label="Impuestos"             onClick={() => setModal('impuestos')} />
        <Tarjeta icono="💱" label="Símbolo de moneda"     onClick={() => setModal('moneda')} />
        <Tarjeta icono="📦" label="Unidades de medida"    onClick={() => setSeccionActiva('unidades')} />
        <Tarjeta icono="↩️" label="Devoluciones"          onClick={() => setModal('devoluciones')} />
        <Tarjeta icono="📊" label="Alertas de stock"      onClick={() => setModal('stockAlertas')} />
        <Tarjeta icono="💳" label="Límite de crédito"     onClick={() => setModal('creditoGlobal')} />
      </Seccion>

      <Seccion titulo="Dispositivos">
        <Tarjeta icono="🖨️" label="Impresora de tickets" onClick={() => setModal('impresora')} />
        <Tarjeta icono="📷" label="Lector de códigos"    onClick={() => setModal('lectorCodigos')} />
        <Tarjeta icono="💰" label="Cajón de dinero"      onClick={() => setModal('cajon')} />
        <Tarjeta icono="💳" label="Terminal TPV"         onClick={() => setModal('terminalTPV')} />
      </Seccion>

      <Seccion titulo="Servicios">
        <Tarjeta icono="📱" label="Recargas electrónicas" onClick={() => setModal('recargas')} />
        <Tarjeta icono="💡" label="Pago de servicios"     onClick={() => setModal('pagoServicios')} />
        <Tarjeta icono="🚚" label="Compras / Proveedores" onClick={() => setModal('compras')} />
      </Seccion>

      <Seccion titulo="Mantenimiento">
        <Tarjeta icono="💾" label="Respaldo automático" onClick={() => setModal('respaldo')} />
        <Tarjeta icono="🗂️" label="Base de datos"       onClick={() => setModal('baseDatos')} />
        <Tarjeta icono="🔄" label="Actualizaciones"     onClick={null} proximamente />
      </Seccion>

      {ModalActivo && <ModalActivo onClose={() => setModal(null)} />}
    </div>
  )
}

function Seccion({ titulo, children }) {
  return (
    <div style={s.seccion}>
      <h3 style={s.secTitulo}>{titulo}</h3>
      <div style={s.tarjetasGrid}>{children}</div>
    </div>
  )
}

function Tarjeta({ icono, label, onClick, proximamente }) {
  const deshabilitado = proximamente || !onClick
  return (
    <button
      style={{ ...s.tarjeta, ...(deshabilitado ? s.tarjetaDes : s.tarjetaActiva) }}
      onClick={deshabilitado ? undefined : onClick}
      title={proximamente ? 'Próximamente' : label}
    >
      <span style={s.tarjetaIcono}>{icono}</span>
      <span style={s.tarjetaLabel}>{label}</span>
      {proximamente && <span style={s.badge}>Próximamente</span>}
    </button>
  )
}
