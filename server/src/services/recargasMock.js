// Mock del API de Taecel/SIPREL.
// Para producción: reemplazar las 3 funciones exportadas con llamadas reales al proveedor.
// El contrato de entrada/salida NO debe cambiar.

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

async function procesarRecarga({ compania, numero, monto }) {
  await delay(700)
  if (Math.random() < 0.04) throw new Error('Saldo insuficiente en proveedor')
  return {
    referencia: `MOCK-${Date.now()}`,
    estado: 'completada'
  }
}

async function consultarServicio({ compania, numero }) {
  await delay(500)
  return {
    numero,
    compania,
    nombre_titular: 'CLIENTE EJEMPLO',
    saldo: parseFloat((Math.random() * 600 + 50).toFixed(2)),
    referencia_consulta: `CONS-${Date.now()}`
  }
}

async function pagarServicio({ compania, numero, monto, referencia_consulta }) {
  await delay(900)
  if (Math.random() < 0.04) throw new Error('Error al procesar pago con proveedor')
  return {
    referencia: `MOCK-${Date.now()}`,
    estado: 'completada'
  }
}

module.exports = { procesarRecarga, consultarServicio, pagarServicio }
