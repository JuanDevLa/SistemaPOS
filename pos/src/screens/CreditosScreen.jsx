import { useState, useEffect, useRef } from 'react'
import { api } from '../api'
import ModalAbonar from '../components/creditos/ModalAbonar'
import EstadoCuenta from '../components/creditos/EstadoCuenta'
import ReporteSaldos from '../components/creditos/ReporteSaldos'

export default function CreditosScreen({ usuario }) {
  const [subVista, setSubVista]                         = useState('estado')
  const [busqueda, setBusqueda]                         = useState('')
  const [resultados, setResultados]                     = useState([])
  const [clienteSeleccionado, setClienteSeleccionado]   = useState(null)
  const [estadoCuenta, setEstadoCuenta]                 = useState(null)
  const [creditoSeleccionado, setCreditoSeleccionado]   = useState(null)
  const [detalleVenta, setDetalleVenta]                 = useState(null)
  const [reporte, setReporte]                           = useState(null)
  const [modalAbonar, setModalAbonar]                   = useState(false)
  const [cargando, setCargando]                         = useState(false)
  const busquedaRef = useRef()

  const negocio_id = usuario?.negocio_id

  useEffect(() => {
    if (subVista === 'reporte') cargarReporte()
    else busquedaRef.current?.focus()
  }, [subVista])

  useEffect(() => {
    const t = setTimeout(buscarClientes, 300)
    return () => clearTimeout(t)
  }, [busqueda])

  const buscarClientes = async () => {
    if (!busqueda.trim()) { setResultados([]); return }
    try {
      const res = await api.buscarClientes(busqueda, negocio_id)
      setResultados(Array.isArray(res) ? res : [])
    } catch { setResultados([]) }
  }

  const seleccionarCliente = async (cliente) => {
    setClienteSeleccionado(cliente)
    setResultados([])
    setBusqueda(cliente.nombre)
    setCargando(true)
    try {
      const res = await api.estadoCuentaCliente(cliente.id, negocio_id)
      if (res.cliente) {
        setEstadoCuenta(res)
        setCreditoSeleccionado(res.creditos[0] || null)
        if (res.creditos[0]) cargarDetalleVenta(res.creditos[0].venta_id)
      }
    } catch { /* mantiene estado actual */ }
    setCargando(false)
  }

  const cargarDetalleVenta = async (venta_id) => {
    try {
      const res = await api.detalleVentaCredito(venta_id)
      setDetalleVenta(res)
    } catch { setDetalleVenta(null) }
  }

  const cargarReporte = async () => {
    setCargando(true)
    try {
      const res = await api.reporteSaldos(negocio_id)
      setReporte(res)
    } catch { setReporte(null) }
    setCargando(false)
  }

  const limpiarBusqueda = () => {
    setBusqueda('')
    setClienteSeleccionado(null)
    setEstadoCuenta(null)
    setCreditoSeleccionado(null)
    setDetalleVenta(null)
    setTimeout(() => busquedaRef.current?.focus(), 50)
  }

  const onSeleccionarCredito = (cr) => {
    setCreditoSeleccionado(cr)
    cargarDetalleVenta(cr.venta_id)
  }

  const trasBono = async () => {
    setModalAbonar(false)
    if (clienteSeleccionado) await seleccionarCliente(clienteSeleccionado)
  }

  const irAEstado = (cliente) => {
    setSubVista('estado')
    seleccionarCliente(cliente)
  }

  return (
    <div style={s.root}>
      <div style={s.subNav}>
        <button style={{ ...s.subNavBtn, ...(subVista === 'estado' ? s.subNavActivo : {}) }} onClick={() => setSubVista('estado')}>
          Estado de Cuenta
        </button>
        <button style={{ ...s.subNavBtn, ...(subVista === 'reporte' ? s.subNavActivo : {}) }} onClick={() => setSubVista('reporte')}>
          Reporte de Saldos
        </button>
      </div>

      {subVista === 'estado' ? (
        <EstadoCuenta
          estadoCuenta={estadoCuenta}
          busqueda={busqueda}
          onBuscar={setBusqueda}
          busquedaRef={busquedaRef}
          resultados={resultados}
          creditoSeleccionado={creditoSeleccionado}
          onSeleccionarCredito={onSeleccionarCredito}
          detalleVenta={detalleVenta}
          onAbonar={() => setModalAbonar(true)}
          onLimpiar={limpiarBusqueda}
          onSeleccionarCliente={seleccionarCliente}
        />
      ) : (
        <ReporteSaldos reporte={reporte} cargando={cargando} onVerEstado={irAEstado} />
      )}

      {modalAbonar && (
        <ModalAbonar
          cliente={estadoCuenta?.cliente}
          creditoId={creditoSeleccionado?.id}
          negocio_id={negocio_id}
          usuario_id={usuario?.id}
          onConfirmar={trasBono}
          onCerrar={() => setModalAbonar(false)}
        />
      )}
    </div>
  )
}

const s = {
  root:         { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', background: '#f5f5f5' },
  subNav:       { display: 'flex', gap: 4, padding: '6px 12px', background: '#fff', borderBottom: '1px solid #e0e0e0' },
  subNavBtn:    { padding: '5px 14px', fontSize: 12, border: '1px solid #ccc', borderRadius: 4, background: '#fff', cursor: 'pointer', color: '#1a1a1a' },
  subNavActivo: { background: '#1e3a5f', color: '#fff', border: '1px solid #1e3a5f' },
}
