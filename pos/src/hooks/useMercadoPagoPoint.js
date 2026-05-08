import { useState, useCallback, useRef } from 'react'
import { api } from '../api'

const MODO_PRUEBA = import.meta.env.VITE_MP_MODO_PRUEBA === 'true'
const POLL_INTERVAL_MS = 2000
const POLL_TIMEOUT_MS  = 120_000

export function useMercadoPagoPoint() {
  const [estado, setEstado]       = useState('idle') // idle | procesando | completado | error
  const [paymentId, setPaymentId] = useState(null)
  const [errorMsg, setErrorMsg]   = useState(null)
  const pollingRef                = useRef(null)
  const estadoRef                 = useRef('idle')

  // Mantener un ref con el estado actual para que cancelar() siempre vea valor fresco
  // (su closure captura el estado al momento de definirse).
  estadoRef.current = estado

  const limpiarPolling = () => {
    if (pollingRef.current) clearInterval(pollingRef.current)
    pollingRef.current = null
  }

  const iniciarPago = useCallback(async (monto, referenciaExterna, descripcion) => {
    setEstado('procesando')
    setPaymentId(null)
    setErrorMsg(null)

    if (MODO_PRUEBA) {
      await new Promise(r => setTimeout(r, 3000))
      const id = `TEST-${Date.now()}`
      setPaymentId(id)
      setEstado('completado')
      return id
    }

    try {
      const intent = await api.mpCrearIntento(monto, referenciaExterna, descripcion)
      const intentId = intent.id
      const inicio   = Date.now()

      return new Promise((resolve, reject) => {
        pollingRef.current = setInterval(async () => {
          try {
            if (Date.now() - inicio > POLL_TIMEOUT_MS) {
              limpiarPolling()
              await api.mpCancelarIntento().catch(() => {})
              setErrorMsg('Tiempo de espera agotado')
              setEstado('error')
              reject(new Error('timeout'))
              return
            }

            const result = await api.mpObtenerIntento(intentId)
            const status = result.status

            if (status === 'FINISHED') {
              limpiarPolling()
              const aprobado = result.payment?.state === 'APPROVED'
              if (aprobado) {
                const pid = String(result.payment.id)
                setPaymentId(pid)
                setEstado('completado')
                resolve(pid)
              } else {
                const msg = result.payment?.state || 'Pago rechazado'
                setErrorMsg(msg)
                setEstado('error')
                reject(new Error(msg))
              }
            } else if (status === 'CANCELED' || status === 'ERROR') {
              limpiarPolling()
              setErrorMsg('Pago cancelado en terminal')
              setEstado('error')
              reject(new Error('canceled'))
            }
            // OPEN / ON_TERMINAL / PROCESSING → seguir esperando
          } catch (pollErr) {
            limpiarPolling()
            setErrorMsg('Error consultando terminal')
            setEstado('error')
            reject(pollErr)
          }
        }, POLL_INTERVAL_MS)
      })
    } catch (err) {
      const msg = err?.message || 'Error al iniciar pago'
      setErrorMsg(msg)
      setEstado('error')
      throw err
    }
  }, [])

  const cancelar = useCallback(async () => {
    limpiarPolling()
    // Usar ref: el closure podría haber capturado un estado obsoleto (p.ej. 'idle' al montar).
    if (!MODO_PRUEBA && estadoRef.current === 'procesando') {
      await api.mpCancelarIntento().catch(() => {})
    }
    setEstado('idle')
    setPaymentId(null)
    setErrorMsg(null)
  }, [])

  return { estado, paymentId, errorMsg, iniciarPago, cancelar, MODO_PRUEBA }
}
