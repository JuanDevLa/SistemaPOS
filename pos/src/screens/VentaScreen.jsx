import { useState, useRef, useEffect } from 'react'
import { CheckCircle } from 'lucide-react'
import { api } from '../api'
import { useCart } from '../hooks/useCart'
import { usePermisos } from '../hooks/usePermisos'
import { useVentaKeyboard } from '../hooks/useVentaKeyboard'
import { useCobro } from '../hooks/useCobro'
import { useMercadoPagoPoint } from '../hooks/useMercadoPagoPoint'
import { useModales } from '../hooks/useModales'

// Layout
import Header        from '../components/layout/Header'
import TabNavigation, { tabsPermitidos } from '../components/layout/TabNavigation'
import ContextBar    from '../components/layout/ContextBar'
import Footer        from '../components/layout/Footer'

// Venta
import CampoBusqueda        from '../components/venta/CampoBusqueda'
import BotonesAccion        from '../components/venta/BotonesAccion'
import PestanasTickets      from '../components/venta/PestanasTickets'
import TablaCarrito         from '../components/venta/TablaCarrito'
import ZonaTotales          from '../components/venta/ZonaTotales'
import ModalMovimientoCaja  from '../components/venta/ModalMovimientoCaja'
import ModalVarios          from '../components/venta/ModalVarios'
import ModalArtComun        from '../components/venta/ModalArtComun'
import ModalVerificador     from '../components/venta/ModalVerificador'
import ModalBuscar          from '../components/venta/ModalBuscar'
import ModalAsignarCliente  from '../components/venta/ModalAsignarCliente'
import ModalConfirmacion    from '../components/venta/ModalConfirmacion'
import ModalTicketPendiente from '../components/venta/ModalTicketPendiente'
import ModalFiado           from '../components/venta/ModalFiado'
import { ModalErrorImpresora } from '../components/venta/ModalErrorImpresora'
import ModalDevoluciones    from '../components/venta/ModalDevoluciones'
import ModalCambiarTicket   from '../components/venta/ModalCambiarTicket'
import ModalDescuento       from '../components/venta/ModalDescuento'
import ModalNotas           from '../components/venta/ModalNotas'
import ModalCobrar          from '../components/venta/ModalCobrar'
import ModalAlertasStock    from '../components/venta/ModalAlertasStock'

// Screens
import CreditosScreen   from './CreditosScreen'
import ClientesScreen   from './ClientesScreen'
import InventarioScreen from './InventarioScreen'
import CorteScreen      from './CorteScreen'
import ProductosScreen  from './ProductosScreen'
import ComprasScreen    from './ComprasScreen'
import ConfiguracionScreen from './ConfiguracionScreen'
import ReportesScreen     from './ReportesScreen'
import RecargasScreen     from './RecargasScreen'

// CSS
import '../styles/pos-desktop.css'

// ─────────────────────────────────────────────────────────────────────────────

function VentaExitosa({ ticket, mensaje, onNuevaVenta }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Enter') onNuevaVenta() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onNuevaVenta])

  return (
    <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', background: '#f0faf4' }}>
      <div style={{ textAlign: 'center', padding: 48 }}>
        <CheckCircle size={72} color="#1a7a3a" strokeWidth={1.5} />
        <h2 style={{ fontSize: 32, fontWeight: 800, color: '#1a7a3a', margin: '0 0 8px' }}>Venta exitosa</h2>
        <div style={{ fontSize: 18, color: '#555', marginBottom: 4 }}>
          Ticket #{ticket.venta_id} · Total: ${parseFloat(ticket.total).toFixed(2)}
        </div>
        {ticket.cambio > 0 && (
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1a7a3a', marginBottom: 4 }}>
            Cambio: ${parseFloat(ticket.cambio).toFixed(2)}
          </div>
        )}
        {mensaje && <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>{mensaje}</p>}
        <div style={{ fontSize: 14, color: '#999', marginTop: 24 }}>Presiona Enter para nueva venta</div>
        <button
          className="pos-btn pos-btn-primary pos-btn-lg"
          style={{ marginTop: 20, minWidth: 220 }}
          onClick={onNuevaVenta}
        >
          Nueva Venta (Enter)
        </button>
      </div>
    </div>
  )
}

export default function VentaScreen({ usuario, corteInicial, onLogout, onRefrescarUsuario }) {

  // ── Navegación ─────────────────────────────────────────────
  const [tab, setTab] = useState('venta')

  // ── Carrito (estado extraído a useCart) ────────────────────
  const cart = useCart(usuario.negocio_id)
  const { puede } = usePermisos(usuario)

  // Refrescar permisos/usuario desde backend al montar y cada 5 min
  useEffect(() => {
    if (!onRefrescarUsuario) return
    onRefrescarUsuario()
    const id = setInterval(onRefrescarUsuario, 300000)
    return () => clearInterval(id)
  }, [onRefrescarUsuario])

  // Si el tab activo queda fuera de los permitidos (ej. cambio de usuario), forzar a venta
  useEffect(() => {
    const ids = tabsPermitidos(puede).map(t => t.id)
    if (!ids.includes(tab)) setTab('venta')
  }, [usuario, puede])

  // ── Venta ──────────────────────────────────────────────────
  const [ticket, setTicket]                   = useState(null)
  const [mensaje, setMensaje]                 = useState('')
  const mensajeTimerRef = useRef(null)
  const mostrarMensaje = (texto) => {
    setMensaje(texto)
    clearTimeout(mensajeTimerRef.current)
    if (texto) mensajeTimerRef.current = setTimeout(() => setMensaje(''), 4000)
  }
  const {
    modales,
    setModalCaja, setModalVarios, setModalArtComun, setModalVerificador,
    setModalBuscar, setModalCliente, setModalTicketPendiente, setModalFiado,
    setModalDevoluciones, setModalDescuento, setModalConfirmBorrar, setModalNotas,
    setModalConfirmEliminarTicket, setModalCambiarTicket, setModalLogout, setModalAlertas,
  } = useModales()
  const {
    caja: modalCaja, varios: modalVarios, artComun: modalArtComun,
    verificador: modalVerificador, buscar: modalBuscar, cliente: modalCliente,
    ticketPendiente: modalTicketPendiente, fiado: modalFiado,
    devoluciones: modalDevoluciones, descuento: modalDescuento,
    confirmBorrar: modalConfirmBorrar, notas: modalNotas,
    confirmEliminarTicket: modalConfirmEliminarTicket, cambiarTicket: modalCambiarTicket,
    logout: modalLogout, alertas: modalAlertas,
  } = modales
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null)
  // ── Corte (estado compartido con Header y movimientoCaja) ──
  const [corteActivo, setCorteActivo] = useState(corteInicial || null)
  const [productosBaros, setProductosBaros] = useState([])
  const [tabInventarioInicial, setTabInventarioInicial] = useState(null)
  const [productoCompraPreseleccionado, setProductoCompraPreseleccionado] = useState(null)

  const cargarProductosBaros = async () => {
    try {
      const res = await api.stockBajo(usuario.negocio_id)
      setProductosBaros(Array.isArray(res) ? res : [])
    } catch (e) {
      console.error('Error al cargar productos bajos:', e)
    }
  }

  useEffect(() => {
    cargarProductosBaros()
    const iv = setInterval(cargarProductosBaros, 60000)
    return () => clearInterval(iv)
  }, [usuario.negocio_id])

  const pedirLogout = () => {
    const ticketsPendientes = cart.tickets.some(t => t.carrito.length > 0)
    if (corteActivo || ticketsPendientes) {
      setModalLogout(true)
    } else {
      onLogout()
    }
  }

  // ── Conectividad ────────────────────────────────────────────
  const [isOnline, setIsOnline]   = useState(true)
  const [syncPending, setSyncPending] = useState(false)

  // ── Refs ────────────────────────────────────────────────────
  const busquedaRef          = useRef()
  const notasCajaPendiente   = useRef('')

  // ── Derivados ───────────────────────────────────────────────
  const { carrito, total, subtotal, descuentoGlobal, descuentoMonto } = cart

  const cobro = useCobro({ total, carrito, descuentoMonto, cart, usuario, corteActivo, puede, setTicket, setMensaje, setModalFiado, clienteSeleccionado })
  const mp    = useMercadoPagoPoint()
  const {
    metodoPago, setMetodoPago, pagoCon, setPagoCon, cambio,
    clienteCredito, setClienteCredito, busquedaCredito, setBusquedaCredito,
    resultadosCredito, setResultadosCredito, montoTarjeta, setMontoTarjeta,
    referenciaTarjeta, setReferenciaTarjeta, nombreTarjeta, setNombreTarjeta,
    referenciaTransferencia, setReferenciaTransferencia,
    nombreTransferencia, setNombreTransferencia,
    montoPagadoFiado, setMontoPagadoFiado,
    nombreClienteFiado, setNombreClienteFiado,
    cobrar, abrirCobro,
  } = cobro

  const handleAgregar = async (producto, cantidad) => {
    const resultado = await cart.agregarAlCarrito(producto, cantidad)
    if (resultado?.error) mostrarMensaje(resultado.error)
  }

  // ─────────────────────────────────────────────────────────────
  // useEffects
  // ─────────────────────────────────────────────────────────────

  // Monitor de conectividad
  useEffect(() => {
    const check = async () => {
      const online = await api.checkConn()
      setIsOnline(online)
      if (online && syncPending) { await api.syncPendientes(); setSyncPending(false) }
    }
    const onOnline  = () => { setIsOnline(true); check() }
    const onOffline = () => setIsOnline(false)
    check()
    const iv = setInterval(check, 30000)
    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      clearInterval(iv)
      window.removeEventListener('online',  onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [syncPending])

  // ─────────────────────────────────────────────────────────────
  // Lógica de venta
  // ─────────────────────────────────────────────────────────────

  const handleAccion = (id) => {
    if (id === 'borrar' && cart.filaSeleccionada) { cart.prepararBorrar(cart.filaSeleccionada); setModalConfirmBorrar(true) }
    if (id === 'buscar') setModalBuscar(true)
    if (id === 'mayoreo') {
      if (!cart.filaSeleccionada) { setMensaje('❌ Selecciona un producto para aplicar mayoreo'); setTimeout(() => setMensaje(''), 3000); return }
      const producto = carrito.find(i => i.producto_id === cart.filaSeleccionada)
      if (!producto || !producto.precio_mayoreo) { setMensaje('❌ Este producto no tiene precio de mayoreo configurado'); setTimeout(() => setMensaje(''), 3000); return }
      const precioMayoreo = parseFloat(producto.precio_mayoreo)
      cart.aplicarPrecioFijo(cart.filaSeleccionada, precioMayoreo)
      setMensaje(`✓ Mayoreo aplicado: $${precioMayoreo.toFixed(2)} por unidad`)
      setTimeout(() => setMensaje(''), 3000)
    }
    if (id === 'entradas') { if (puede('entrada_efectivo')) setModalNotas({ accion: 'caja', tipo: 'entrada' }); else setMensaje('Sin permiso: Entrada de efectivo') }
    if (id === 'salidas')  { if (puede('salida_efectivo'))  setModalNotas({ accion: 'caja', tipo: 'salida'  }); else setMensaje('Sin permiso: Salida de efectivo') }
    if (id === 'varios')      setModalVarios(true)
    if (id === 'artComun')    setModalArtComun(true)
    if (id === 'verificador') setModalVerificador(true)
    if (id === 'pendiente')   setModalTicketPendiente(true)
    if (id === 'devoluciones') setModalDevoluciones(true)
    if (id === 'cliente')     setModalCliente(true)
  }

  useVentaKeyboard({
    tab, setTab, metodoPago, setMetodoPago,
    cobrar, abrirCobro, setPagoCon, setMontoTarjeta,
    puede, setMensaje, cart, handleAccion,
    busquedaRef, ticket,
    setModalCaja, setModalVarios, setModalArtComun,
    setModalVerificador, setModalBuscar, setModalCliente,
    setModalTicketPendiente, setModalFiado,
    setModalConfirmBorrar, setModalDevoluciones, setModalDescuento,
    abrirNotasCaja: (tipo) => setModalNotas({ accion: 'caja', tipo }),
    abrirNotasDescuento: () => setModalNotas({ accion: 'descuento' }),
    setModalNotas,
    mpEstado: mp.estado,
  })

  const confirmarBorrarItem = () => {
    cart.confirmarBorrar()
    setModalConfirmBorrar(false)
  }

  const handleEliminarTicket = () => {
    cart.eliminarTicketActivo()
    busquedaRef.current?.limpiar()
  }

  const handleNotasConfirmadas = (notas) => {
    const { accion, tipo } = modalNotas
    setModalNotas(null)
    if (accion === 'descuento')  setModalDescuento(true)
    else if (accion === 'caja')       { notasCajaPendiente.current = notas; setModalCaja(tipo) }
  }

  const handleGuardarTicketPendiente = (nombre) => {
    cart.guardarTicketPendiente(nombre)
    setModalTicketPendiente(false)
    busquedaRef.current?.limpiar()
  }

  const handleLimpiarSinGuardar = () => {
    cart.limpiarSinGuardar()
    setModalTicketPendiente(false)
    busquedaRef.current?.limpiar()
  }

  const registrarMovimientoCaja = async ({ tipo, monto, motivo }) => {
    setModalCaja(null)
    try {
      const res = await api.registrarMovimientoCaja({
        negocio_id: usuario.negocio_id,
        tipo, monto, motivo,
        corte_id: corteActivo?.id || null
      })
      setMensaje(`${tipo === 'entrada' ? 'Entrada' : 'Salida'} registrada: $${monto}`)
    } catch(e) {
      setMensaje(e.message)
    }
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────

  return (
    <div className="pos-app">
      {modalNotas && (
        <ModalNotas
          titulo={
            modalNotas.accion === 'descuento' ? 'Aplicar descuento' :
            modalNotas.tipo   === 'entrada'   ? 'Entrada de efectivo' : 'Salida de efectivo'
          }
          descripcion={
            modalNotas.accion === 'descuento' ? 'Indica la razón del descuento.' :
            'Indica el motivo del movimiento de efectivo.'
          }
          onConfirmar={handleNotasConfirmadas}
          onCerrar={() => setModalNotas(null)}
        />
      )}

      {modalCaja && (
        <ModalMovimientoCaja
          tipo={modalCaja}
          motivoInicial={notasCajaPendiente.current}
          onConfirmar={registrarMovimientoCaja}
          onCerrar={() => { setModalCaja(null); notasCajaPendiente.current = '' }}
        />
      )}

      {modalVarios && (
        <ModalVarios
          negocio_id={usuario.negocio_id}
          onAgregar={handleAgregar}
          onCerrar={() => setModalVarios(false)}
        />
      )}

      {modalArtComun && (
        <ModalArtComun
          onAgregar={handleAgregar}
          onCerrar={() => setModalArtComun(false)}
        />
      )}

      {modalVerificador && (
        <ModalVerificador
          negocio_id={usuario.negocio_id}
          onAgregar={handleAgregar}
          onCerrar={() => setModalVerificador(false)}
        />
      )}

      {modalBuscar && (
        <ModalBuscar
          negocio_id={usuario.negocio_id}
          onAgregar={handleAgregar}
          onCerrar={() => setModalBuscar(false)}
        />
      )}

      {modalCliente && (
        <ModalAsignarCliente
          clienteActual={clienteSeleccionado}
          negocio_id={usuario.negocio_id}
          onSeleccionar={(cliente) => {
            setClienteSeleccionado(cliente)
            if (cliente) setMensaje(`✓ Venta asignada a ${cliente.nombre}`)
          }}
          onCerrar={() => setModalCliente(false)}
        />
      )}

      {modalConfirmBorrar && (
        <ModalConfirmacion
          titulo="Borrar artículo"
          mensaje={`¿Estás seguro de borrar "${cart.productoABorrar?.nombre}"?`}
          onConfirmar={confirmarBorrarItem}
          onCancelar={() => { setModalConfirmBorrar(false); cart.cancelarBorrar() }}
        />
      )}

      {modalTicketPendiente && (
        <ModalTicketPendiente
          onGuardarYNuevo={handleGuardarTicketPendiente}
          onLimpiarSinGuardar={handleLimpiarSinGuardar}
          onCancelar={() => setModalTicketPendiente(false)}
        />
      )}

      {cobro.errorImpresora && (
        <ModalErrorImpresora
          folio={cobro.errorImpresora.folio}
          total={cobro.errorImpresora.total}
          onContinuar={() => cobro.setErrorImpresora(null)}
        />
      )}

      {modalFiado && (
        <ModalFiado
          onConfirmar={async (nombre) => {
            setNombreClienteFiado(nombre)
            setMetodoPago('credito')
            setModalFiado(false)
          }}
          onCancelar={() => setModalFiado(false)}
        />
      )}

      {modalDevoluciones && (
        <ModalDevoluciones
          onCancelar={() => setModalDevoluciones(false)}
        />
      )}

      {modalDescuento && (
        <ModalDescuento
          subtotal={subtotal}
          descuentoActual={descuentoGlobal}
          onAplicar={(tipo, valor) => { cart.aplicarDescuentoGlobal(tipo, valor); setModalDescuento(false) }}
          onCancelar={() => setModalDescuento(false)}
        />
      )}

      {modalConfirmEliminarTicket && (
        <ModalConfirmacion
          titulo="Eliminar ticket"
          mensaje="¿Estás seguro que deseas eliminar el ticket actual?"
          onConfirmar={() => { handleEliminarTicket(); setModalConfirmEliminarTicket(false) }}
          onCancelar={() => setModalConfirmEliminarTicket(false)}
        />
      )}

      {modalCambiarTicket && (
        <ModalCambiarTicket
          tickets={cart.tickets.map(t => ({ ...t, nombre: typeof t.nombre === 'string' ? t.nombre : '' }))}
          ticketActivo={cart.ticketActivo}
          onSeleccionar={(id) => { cart.setTicketActivo(id); setModalCambiarTicket(false) }}
          onCancelar={() => setModalCambiarTicket(false)}
        />
      )}

      {/* ── LAYOUT FIJO ─────────────────────────────────────── */}
      <Header
        negocio={usuario.negocio_nombre}
        cajero={usuario.nombre}
        corteActivo={corteActivo}
        isOnline={isOnline}
        onLogout={pedirLogout}
      />
      <TabNavigation tabActivo={tab} onChange={setTab} puede={puede} cantidadStockBajo={productosBaros.length} onAbrirAlertas={() => setModalAlertas(true)} />
      <ContextBar tab={tab} />

      {/* ── CONTENIDO PRINCIPAL ─────────────────────────────── */}
      <div className="pos-main">

        {/* ─── TAB: VENTA ──────────────────────────────────── */}
        {tab === 'venta' && !ticket && (
          <div className="venta-container">
            <CampoBusqueda
              ref={busquedaRef}
              negocio_id={usuario.negocio_id}
              onAgregarProducto={handleAgregar}
            />
            <BotonesAccion onAccion={handleAccion} />
            {mensaje && (
              <div style={{
                padding: '8px 16px', background: mensaje.startsWith('✓') ? '#F0FDF4' : '#FEF2F2',
                borderBottom: `2px solid ${mensaje.startsWith('✓') ? '#86EFAC' : '#FECACA'}`,
                color: mensaje.startsWith('✓') ? '#166534' : '#991B1B',
                fontSize: 13, fontWeight: 600, flexShrink: 0
              }}>
                {mensaje}
              </div>
            )}
            <PestanasTickets
              tickets={cart.tickets}
              ticketActivo={cart.ticketActivo}
              onCambiar={cart.setTicketActivo}
              onNuevo={cart.nuevoTicket}
            />
            <TablaCarrito
              carrito={carrito}
              filaSeleccionada={cart.filaSeleccionada}
              onSeleccionar={cart.setFilaSeleccionada}
              onCambiarCantidad={cart.cambiarCantidad}
              onQuitarItem={cart.quitarItem}
            />
            <ZonaTotales
              total={total}
              subtotal={subtotal}
              descuentoMonto={descuentoMonto}
              nProductos={carrito.length}
              pagoCon={pagoCon}
              cambio={cambio}
              onChangePago={setPagoCon}
              onCobrar={abrirCobro}
              onReimprimir={() => {}}
              onVentasDia={() => {}}
              onCambiarTicket={() => setModalCambiarTicket(true)}
              onPendiente={() => setModalTicketPendiente(true)}
              onEliminar={() => puede('cancelar_devolver') ? setModalConfirmEliminarTicket(true) : setMensaje('Sin permiso: Cancelar ticket')}
              onAsignarCliente={() => setModalCliente(true)}
              onDescuento={() => puede('aplicar_descuento') ? setModalNotas({ accion: 'descuento' }) : setMensaje('Sin permiso: Aplicar descuento')}
            />
          </div>
        )}

        {/* ─── VENTA EXITOSA ───────────────────────────────── */}
        {tab === 'venta' && ticket && (
          <VentaExitosa
            ticket={ticket}
            mensaje={mensaje}
            onNuevaVenta={() => { setTicket(null); setMensaje(''); busquedaRef.current?.focus() }}
          />
        )}

        {/* ─── TAB: INVENTARIO ─────────────────────────────── */}
        {tab === 'inventario' && (
          <InventarioScreen
            usuario={usuario}
            tabInicial={tabInventarioInicial}
            onSeleccionarProductoCompra={(producto) => {
              setProductoCompraPreseleccionado(producto)
              setTab('compras')
            }}
          />
        )}

        {/* ─── TAB: CORTE ──────────────────────────────────── */}
        {tab === 'corte' && (
          <CorteScreen
            usuario={usuario}
            corteActivo={corteActivo}
            onCorteChange={setCorteActivo}
          />
        )}

        {/* ─── TAB: CRÉDITOS ───────────────────────────────── */}
        {tab === 'creditos' && (
          <CreditosScreen usuario={usuario} />
        )}

        {/* ─── TAB: CLIENTES ───────────────────────────────── */}
        {tab === 'clientes' && (
          <ClientesScreen usuario={usuario} />
        )}

        {/* ─── TAB: PRODUCTOS ──────────────────────────────── */}
        {tab === 'productos' && (
          <ProductosScreen usuario={usuario} />
        )}

        {/* ─── TAB: COMPRAS ────────────────────────────────── */}
        {tab === 'compras' && (
          <ComprasScreen
            usuario={usuario}
            productoPreseleccionado={productoCompraPreseleccionado}
            onProductoAgregado={() => setProductoCompraPreseleccionado(null)}
          />
        )}

        {/* ─── TAB: CONFIGURACIÓN ──────────────────────────── */}
        {tab === 'configuracion' && (
          <ConfiguracionScreen usuario={usuario} />
        )}

        {/* ─── TAB: REPORTES ───────────────────────────────── */}
        {tab === 'reportes' && (
          <ReportesScreen usuario={usuario} />
        )}

        {/* ─── TAB: RECARGAS ───────────────────────────────── */}
        {tab === 'recargas' && (
          <RecargasScreen usuario={usuario} corteActivo={corteActivo} />
        )}

      </div>{/* /pos-main */}

      <Footer />

      <ModalCobrar cobro={cobro} total={total} mensaje={mensaje} negocio_id={usuario.negocio_id} mp={mp} clienteAsignado={clienteSeleccionado} />

      {modalAlertas && (
        <ModalAlertasStock
          productosBaros={productosBaros}
          onClose={() => setModalAlertas(false)}
          onIrAStock={() => {
            setTabInventarioInicial('bajos')
            setTab('inventario')
          }}
        />
      )}

      {modalLogout && (
        <div style={estilos.logoutOverlay}>
          <div style={estilos.logoutCard}>
            <h3 style={estilos.logoutTitulo}>Cerrar sesión</h3>
            <div style={estilos.logoutAvisos}>
              {corteActivo && (
                <p style={estilos.logoutAviso}>
                  Tienes un turno abierto. Si cierras sesión sin hacer corte, el turno seguirá abierto y podrás retomarlo al volver a entrar.
                </p>
              )}
              {cart.tickets.some(t => t.carrito.length > 0) && (
                <p style={estilos.logoutAviso}>
                  Hay {cart.tickets.filter(t => t.carrito.length > 0).length} ticket(s) con artículos sin cobrar. Se perderán al cerrar sesión.
                </p>
              )}
            </div>
            <div style={estilos.logoutBtns}>
              <button style={estilos.logoutBtnCancelar} onClick={() => setModalLogout(false)}>
                Cancelar
              </button>
              <button style={estilos.logoutBtnConfirmar} onClick={onLogout}>
                Cerrar sesión de todas formas
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

// ─── Estilos internos ──────────────────────────────────────────────────────

const estilos = {
  ticketWrap:  { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', padding: 20 },
  ticketCard:  { background: '#fff', border: '1px solid #c8c8c8', borderRadius: 4, padding: 32, width: 460, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
  ticketLine:  { display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 14, color: '#333', borderBottom: '1px solid #f0f0f0' },

  logoutOverlay:     { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300 },
  logoutCard:        { background: '#fff', borderRadius: 10, padding: '28px 32px', width: 420, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', color: '#1a1a1a' },
  logoutTitulo:      { fontSize: 17, fontWeight: 700, margin: '0 0 16px', color: '#1a1a1a' },
  logoutAvisos:      { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 },
  logoutAviso:       { margin: 0, fontSize: 13, color: '#374151', background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 6, padding: '10px 14px', lineHeight: 1.5 },
  logoutBtns:        { display: 'flex', justifyContent: 'flex-end', gap: 8 },
  logoutBtnCancelar: { padding: '8px 16px', background: '#fff', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 13, cursor: 'pointer', color: '#374151' },
  logoutBtnConfirmar:{ padding: '8px 16px', background: '#DC2626', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#fff' },
}
