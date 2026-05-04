import { useState, useEffect, useRef } from 'react'
import { api } from '../api'
import { printRecarga } from '../printer-client'

export default function RecargasScreen({ usuario, corteActivo }) {
  const [modo, setModo]                       = useState('recarga')
  const [companias, setCompanias]             = useState([])
  const [seleccionada, setSeleccionada]       = useState(null)
  const [numero, setNumero]                   = useState('')
  const [monto, setMonto]                     = useState(null)
  const [montoCustom, setMontoCustom]         = useState('')
  const [consulta, setConsulta]               = useState(null)
  const [consultando, setConsultando]         = useState(false)
  const [procesando, setProcesando]           = useState(false)
  const [resultado, setResultado]             = useState(null)
  const [mensaje, setMensaje]                 = useState('')
  const [error, setError]                     = useState(false)
  const [historial, setHistorial]             = useState([])
  const numeroRef = useRef()

  useEffect(() => { cargarCompanias() }, [modo])

  const cargarCompanias = async () => {
    resetForm()
    try {
      const res = await api.listarCompaniasRecarga(modo)
      setCompanias(Array.isArray(res) ? res : [])
    } catch(e) {
      mostrarMensaje(e.message, true)
    }
  }

  const cargarHistorial = async () => {
    try {
      const res = await api.historialRecargas(usuario.negocio_id, { tipo: modo, limit: 10 })
      setHistorial(Array.isArray(res) ? res : [])
    } catch { setHistorial([]) }
  }

  useEffect(() => { cargarHistorial() }, [modo, resultado])

  const resetForm = () => {
    setSeleccionada(null); setNumero(''); setMonto(null)
    setMontoCustom(''); setConsulta(null); setResultado(null)
    setMensaje(''); setError(false)
  }

  const mostrarMensaje = (txt, esError = false) => {
    setMensaje(txt); setError(esError)
    setTimeout(() => setMensaje(''), 4000)
  }

  const handleSeleccionarCompania = (c) => {
    setSeleccionada(c); setNumero(''); setMonto(null)
    setMontoCustom(''); setConsulta(null); setResultado(null)
    setTimeout(() => numeroRef.current?.focus(), 50)
  }

  const handleConsultar = async () => {
    if (!numero.trim()) return mostrarMensaje('Ingresa el número de cuenta', true)
    setConsultando(true)
    try {
      const res = await api.consultarServicio({
        negocio_id: usuario.negocio_id,
        compania_id: seleccionada.id,
        numero: numero.trim()
      })
      setConsulta(res)
      setMonto(res.saldo)
    } catch (e) {
      mostrarMensaje(e.message || 'Error al consultar', true)
    } finally { setConsultando(false) }
  }

  const handleProcesar = async () => {
    const montoFinal = monto || parseFloat(montoCustom)
    if (!seleccionada)      return mostrarMensaje('Selecciona una compañía', true)
    if (!numero.trim())     return mostrarMensaje('Ingresa el número', true)
    if (!montoFinal || montoFinal <= 0) return mostrarMensaje('Selecciona un monto', true)

    setProcesando(true)
    try {
      let res
      if (modo === 'recarga') {
        res = await api.procesarRecarga({
          negocio_id: usuario.negocio_id, compania_id: seleccionada.id,
          numero: numero.trim(), monto: montoFinal, corte_id: corteActivo?.id || null
        })
      } else {
        res = await api.pagarServicio({
          negocio_id: usuario.negocio_id, compania_id: seleccionada.id,
          numero: numero.trim(), monto: montoFinal,
          referencia_consulta: consulta?.referencia_consulta || null,
          corte_id: corteActivo?.id || null
        })
      }
      setResultado({ ...res, monto: montoFinal, numero: numero.trim(), compania: seleccionada.nombre, modo })
      mostrarMensaje(modo === 'recarga' ? 'Recarga exitosa' : 'Pago exitoso')
    } catch (e) {
      mostrarMensaje(e.message || 'Error al procesar', true)
    } finally { setProcesando(false) }
  }

  const handleImprimir = async () => {
    try {
      await printRecarga(resultado)
    } catch {
      mostrarMensaje('Impresora no disponible', true)
    }
  }

  const montoFinal = Number(monto) || parseFloat(montoCustom) || 0
  const pct  = Number(seleccionada?.comision_porcentaje) || 0
  const fija = Number(seleccionada?.comision_fija) || 0
  const comision = montoFinal > 0 && seleccionada
    ? parseFloat((montoFinal * pct / 100 + fija).toFixed(2))
    : 0
  const totalCliente = montoFinal + comision
  const montos = seleccionada?.montos || []

  return (
    <div style={s.root}>

      {/* Modo toggle */}
      <div style={s.modoBar}>
        {['recarga', 'servicio'].map(m => (
          <button key={m} style={{ ...s.modoBtn, ...(modo === m ? s.modoBtnActive : {}) }}
            onClick={() => setModo(m)}>
            {m === 'recarga' ? '📱 Recargas' : '🏠 Servicios'}
          </button>
        ))}
        {mensaje && (
          <div style={{ ...s.toast, background: error ? '#c0392b' : '#1a7a3a' }}>{mensaje}</div>
        )}
      </div>

      <div style={s.body}>

        {/* Panel izquierdo — compañías */}
        <div style={s.panelIzq}>
          <p style={s.panelTitulo}>Compañía</p>
          <div style={s.companiaGrid}>
            {companias.map(c => (
              <button key={c.id}
                style={{ ...s.companiaBtn, ...(seleccionada?.id === c.id ? s.companiaBtnActive : {}) }}
                onClick={() => handleSeleccionarCompania(c)}>
                {c.nombre}
              </button>
            ))}
          </div>

          {/* Historial reciente */}
          {historial.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <p style={{ ...s.panelTitulo, marginBottom: 6 }}>Recientes</p>
              {historial.slice(0, 6).map(h => (
                <div key={h.id} style={s.historialRow}>
                  <span style={{ color: '#1a1a1a', fontSize: 12, fontWeight: 600 }}>{h.compania_nombre}</span>
                  <span style={{ color: '#666', fontSize: 11 }}>{h.numero_destino}</span>
                  <span style={{ color: '#1e3a5f', fontSize: 12, fontWeight: 700 }}>${parseFloat(h.monto).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Panel derecho — formulario */}
        <div style={s.panelDer}>
          {!seleccionada ? (
            <div style={s.placeholder}>
              <span style={{ fontSize: 40 }}>{modo === 'recarga' ? '📱' : '🏠'}</span>
              <p style={{ color: '#999', fontSize: 14, marginTop: 8 }}>Selecciona una compañía</p>
            </div>
          ) : resultado ? (
            /* ─── Resultado ─── */
            <div style={s.resultadoCard}>
              <div style={{ fontSize: 48, textAlign: 'center' }}>✅</div>
              <p style={{ textAlign: 'center', fontWeight: 700, fontSize: 18, color: '#1a7a3a', margin: '8px 0' }}>
                {resultado.modo === 'recarga' ? 'Recarga Exitosa' : 'Pago Exitoso'}
              </p>
              <div style={s.resultadoDetalle}>
                <span style={s.detalleLabel}>Compañía</span>
                <span style={s.detalleVal}>{resultado.compania}</span>
                <span style={s.detalleLabel}>Número</span>
                <span style={s.detalleVal}>{resultado.numero}</span>
                <span style={s.detalleLabel}>Monto</span>
                <span style={{ ...s.detalleVal, color: '#1e3a5f', fontWeight: 800, fontSize: 22 }}>
                  ${parseFloat(resultado.monto).toFixed(2)}
                </span>
                <span style={s.detalleLabel}>Referencia</span>
                <span style={{ ...s.detalleVal, fontSize: 11, color: '#888' }}>{resultado.recarga?.referencia_proveedor}</span>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button className="pos-btn pos-btn-primary" style={{ flex: 1 }} onClick={handleImprimir}>
                  🖨 Imprimir
                </button>
                <button className="pos-btn" style={{ flex: 1 }} onClick={() => { setResultado(null); setNumero(''); setMonto(null); setMontoCustom(''); setConsulta(null) }}>
                  Nueva
                </button>
              </div>
            </div>
          ) : (
            /* ─── Formulario ─── */
            <div style={s.form}>
              <h3 style={{ margin: '0 0 16px', color: '#1e3a5f', fontSize: 16 }}>{seleccionada.nombre}</h3>

              {/* Número */}
              <label style={s.label}>{modo === 'recarga' ? 'Número de teléfono' : 'Número de cuenta / contrato'}</label>
              <input ref={numeroRef} className="pos-input" type="text" value={numero}
                onChange={e => { setNumero(e.target.value); setConsulta(null); setMonto(null) }}
                placeholder={modo === 'recarga' ? '10 dígitos' : 'Número de cuenta'}
                style={{ width: '100%', marginBottom: 16, fontSize: 18, letterSpacing: 1 }} />

              {/* Recargas — grid de montos */}
              {modo === 'recarga' && montos.length > 0 && (
                <>
                  <label style={s.label}>Monto</label>
                  <div style={s.montosGrid}>
                    {montos.map(m => (
                      <button key={m}
                        style={{ ...s.montoBtn, ...(monto === m ? s.montoBtnActive : {}) }}
                        onClick={() => { setMonto(m); setMontoCustom('') }}>
                        ${m}
                      </button>
                    ))}
                  </div>
                  <input className="pos-input" type="number" value={montoCustom}
                    onChange={e => { setMontoCustom(e.target.value); setMonto(null) }}
                    placeholder="Otro monto"
                    style={{ width: '100%', marginTop: 8, marginBottom: 16 }} />
                </>
              )}

              {/* Servicios — consultar primero */}
              {modo === 'servicio' && (
                <>
                  {!consulta ? (
                    <button className="pos-btn pos-btn-primary" style={{ width: '100%', marginBottom: 16 }}
                      onClick={handleConsultar} disabled={consultando}>
                      {consultando ? 'Consultando...' : '🔍 Consultar adeudo'}
                    </button>
                  ) : (
                    <div style={s.consultaCard}>
                      <p style={{ margin: 0, fontSize: 12, color: '#666' }}>Titular</p>
                      <p style={{ margin: '2px 0 8px', fontWeight: 700, color: '#1a1a1a' }}>{consulta.nombre_titular}</p>
                      <p style={{ margin: 0, fontSize: 12, color: '#666' }}>Adeudo</p>
                      <p style={{ margin: '2px 0 0', fontWeight: 800, fontSize: 22, color: '#1e3a5f' }}>
                        ${parseFloat(consulta.saldo).toFixed(2)}
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Resumen y botón procesar */}
              {montoFinal > 0 && (
                <div style={s.resumenBar}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ color: '#666', fontSize: 12 }}>Recarga: ${montoFinal.toFixed(2)}{comision > 0 && ` + $${comision.toFixed(2)} comisión`}</span>
                    <span style={{ color: '#555', fontSize: 12, fontWeight: 600 }}>Cobrar al cliente:</span>
                  </div>
                  <span style={{ fontWeight: 800, fontSize: 26, color: '#1e3a5f' }}>${totalCliente.toFixed(2)}</span>
                </div>
              )}

              <button className="pos-btn pos-btn-primary"
                style={{ width: '100%', marginTop: 12, fontSize: 15, padding: '12px 0' }}
                onClick={handleProcesar}
                disabled={procesando || (modo === 'servicio' && !consulta)}>
                {procesando ? 'Procesando...' : modo === 'recarga' ? '📱 Aplicar Recarga' : '💳 Pagar Servicio'}
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

const s = {
  root: { display: 'flex', flexDirection: 'column', height: '100%', background: '#f5f5f5' },
  modoBar: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: '#fff', borderBottom: '1px solid #e0e0e0' },
  modoBtn: { padding: '7px 20px', border: '1px solid #ccc', borderRadius: 6, background: '#f0f0f0', cursor: 'pointer', fontWeight: 600, fontSize: 13, color: '#555' },
  modoBtnActive: { background: '#1e3a5f', color: '#fff', border: '1px solid #1e3a5f' },
  toast: { marginLeft: 'auto', padding: '6px 14px', borderRadius: 6, color: '#fff', fontSize: 12, fontWeight: 600 },
  body: { display: 'flex', flex: 1, overflow: 'hidden' },
  panelIzq: { width: 220, background: '#fff', borderRight: '1px solid #e0e0e0', padding: 14, overflowY: 'auto', flexShrink: 0 },
  panelTitulo: { margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: 0.5 },
  companiaGrid: { display: 'flex', flexDirection: 'column', gap: 4 },
  companiaBtn: { padding: '9px 12px', border: '1px solid #e0e0e0', borderRadius: 6, background: '#f9f9f9', cursor: 'pointer', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#333' },
  companiaBtnActive: { background: '#1e3a5f', color: '#fff', border: '1px solid #1e3a5f' },
  historialRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #f0f0f0', gap: 6 },
  panelDer: { flex: 1, padding: 24, overflowY: 'auto' },
  placeholder: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' },
  form: { maxWidth: 420 },
  label: { display: 'block', fontSize: 12, fontWeight: 700, color: '#555', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.4 },
  montosGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 },
  montoBtn: { padding: '10px 0', border: '1px solid #ccc', borderRadius: 6, background: '#f0f0f0', cursor: 'pointer', fontWeight: 700, fontSize: 14, color: '#333' },
  montoBtnActive: { background: '#1e3a5f', color: '#fff', border: '1px solid #1e3a5f' },
  consultaCard: { background: '#eef4ff', border: '1px solid #c0d0ef', borderRadius: 8, padding: '12px 16px', marginBottom: 16 },
  resumenBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#eef4ff', borderRadius: 8, padding: '10px 16px', marginTop: 8 },
  resultadoCard: { maxWidth: 380, margin: '0 auto', background: '#fff', border: '1px solid #e0e0e0', borderRadius: 12, padding: 28 },
  resultadoDetalle: { display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px 12px', marginTop: 16 },
  detalleLabel: { fontSize: 12, color: '#888', fontWeight: 600, alignSelf: 'center' },
  detalleVal: { fontSize: 15, color: '#1a1a1a', fontWeight: 600 },
}
