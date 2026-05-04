import { useState, useCallback } from 'react'

// Cambiar a false e implementar API real cuando el dispositivo esté disponible
const MODO_PRUEBA = true

export function useMercadoPagoPoint() {
  const [estado, setEstado]       = useState('idle') // idle | procesando | completado | error
  const [paymentId, setPaymentId] = useState(null)
  const [errorMsg, setErrorMsg]   = useState(null)

  const iniciarPago = useCallback(async (monto) => {
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

    // TODO: integración real MP Point Smart 2
    // 1. POST /api/mp/payment-intent { monto, device_id }
    // 2. Polling GET /api/mp/payment-intent/:id hasta aprobado/rechazado
    // 3. setPaymentId(res.payment_id); setEstado('completado')
    // 4. Si rechazado: setErrorMsg(res.message); setEstado('error')
  }, [])

  const cancelar = useCallback(() => {
    setEstado('idle')
    setPaymentId(null)
    setErrorMsg(null)
  }, [])

  return { estado, paymentId, errorMsg, iniciarPago, cancelar, MODO_PRUEBA }
}
