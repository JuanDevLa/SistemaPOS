import { useState, useEffect } from 'react'
import { api, setOnUnauthorized, setOnPermisoDenegado, setToken } from './api'
import LoginScreen from './screens/LoginScreen'
import VentaScreen from './screens/VentaScreen'
import ModalAperturaCaja from './components/ModalAperturaCaja'
import ModalTurnoAbierto from './components/ModalTurnoAbierto'
import ModalAutorizacionAdmin from './components/venta/ModalAutorizacionAdmin'

export default function App() {
  const [usuario, setUsuario] = useState(null)
  const [checkingTurno, setCheckingTurno] = useState(false)
  const [turnoExistente, setTurnoExistente] = useState(null)
  const [aperturaPendiente, setAperturaPendiente] = useState(false)
  const [corteInicial, setCorteInicial] = useState(null)
  const [autorizacionPendiente, setAutorizacionPendiente] = useState(null) // { permiso, resolve }

  // Inicializar BD SQLite y sincronizar
  useEffect(() => {
    const init = async () => {
      try {
        const online = await api.checkConn()
        if (!online) return

        // Restaurar token desde safeStorage al arrancar (persiste entre sesiones).
        const savedToken = await window.dbAPI?.loadToken?.()
        if (savedToken) setToken(savedToken)
        const usuarioGuardado = localStorage.getItem('usuario')
        if (savedToken && usuarioGuardado) {
          try {
            const u = JSON.parse(usuarioGuardado)
            if (u?.negocio_id) await api.cacheProductos(u.negocio_id)
          } catch {}
        }

        await api.syncPendientes()
      } catch (err) {
        console.error('Error inicializando BD:', err)
      }
    }

    init()

    // Auto-sync cada 2 minutos
    const syncInterval = setInterval(() => {
      api.syncPendientes().catch(err => console.error('Error en sync:', err))
    }, 120000)

    return () => clearInterval(syncInterval)
  }, [])

  const handleLogin = (data) => {
    setUsuario(data)
    if (data.token) { setToken(data.token); window.dbAPI?.saveToken?.(data.token) }
    localStorage.setItem('usuario', JSON.stringify(data.usuario))
    setCheckingTurno(true)

    // Disparar caché de productos ahora que hay token. Fire-and-forget.
    if (data.token && data.usuario?.negocio_id) {
      api.cacheProductos(data.usuario.negocio_id).catch(err =>
        console.error('Error cacheando productos:', err)
      )
    }
  }

  const refrescarUsuario = async () => {
    try {
      const fresco = await api.me()
      if (!fresco || fresco.error) return
      setUsuario(prev => prev ? { ...prev, usuario: { ...prev.usuario, ...fresco } } : prev)
      localStorage.setItem('usuario', JSON.stringify(fresco))
    } catch (err) {
      console.error('Error al refrescar usuario:', err)
    }
  }

  // Verificar si hay turno abierto tras login
  useEffect(() => {
    if (!checkingTurno || !usuario) return
    const check = async () => {
      try {
        const corte = await api.turnoAbierto()
        if (corte?.id) {
          setTurnoExistente(corte)
        } else {
          setAperturaPendiente(true)
        }
      } catch {
        setAperturaPendiente(true)
      }
      setCheckingTurno(false)
    }
    check()
  }, [checkingTurno, usuario])

  const handleAbrirCaja = (corte) => {
    setCorteInicial(corte)
    setAperturaPendiente(false)
  }

  const handleSaltarCaja = () => {
    setCorteInicial(null)
    setAperturaPendiente(false)
  }

  const handleContinuarTurno = (corte) => {
    setTurnoExistente(null)
    handleAbrirCaja(corte)
  }

  const handleNuevoTurno = () => {
    setTurnoExistente(null)
    setAperturaPendiente(true)
  }

  const handleLogout = () => {
    setUsuario(null)
    setCheckingTurno(false)
    setTurnoExistente(null)
    setAperturaPendiente(false)
    setCorteInicial(null)
    setToken(null); window.dbAPI?.saveToken?.(null)
    localStorage.removeItem('usuario')
  }

  useEffect(() => {
    setOnUnauthorized(handleLogout)
    setOnPermisoDenegado((permiso) => new Promise((resolve) => {
      setAutorizacionPendiente({ permiso, resolve })
    }))
  }, [])

  const cerrarAutorizacion = (token) => {
    autorizacionPendiente?.resolve(token || null)
    setAutorizacionPendiente(null)
  }

  if (!usuario) {
    return <LoginScreen onLogin={handleLogin} />
  }

  if (checkingTurno) {
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', fontFamily: 'Segoe UI, system-ui, sans-serif', color: '#6B7280', fontSize: 14 }}>
        Verificando turno...
      </div>
    )
  }

  if (turnoExistente) {
    return (
      <ModalTurnoAbierto
        turno={turnoExistente}
        usuario={usuario.usuario}
        onContinuar={handleContinuarTurno}
        onNuevoTurno={handleNuevoTurno}
      />
    )
  }

  if (aperturaPendiente) {
    return <ModalAperturaCaja usuario={usuario.usuario} onAbrirCaja={handleAbrirCaja} onSaltarCaja={handleSaltarCaja} />
  }

  return (
    <>
      <VentaScreen usuario={usuario.usuario} corteInicial={corteInicial} onLogout={handleLogout} onRefrescarUsuario={refrescarUsuario} />
      {autorizacionPendiente && (
        <ModalAutorizacionAdmin
          permiso={autorizacionPendiente.permiso}
          negocio_id={usuario.usuario.negocio_id}
          onConfirmar={(token) => cerrarAutorizacion(token)}
          onCancelar={() => cerrarAutorizacion(null)}
        />
      )}
    </>
  )
}
