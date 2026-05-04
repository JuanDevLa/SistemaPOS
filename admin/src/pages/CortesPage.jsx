import { useState, useEffect } from 'react'
import { api } from '../api'
import { exportarCortes, exportarCorteDetalle } from '../utils/exportarExcel'

const NEGOCIOS = [
  { id: 1, nombre: 'Farmacia Noriega' },
  { id: 2, nombre: 'Crucero Independencia' },
]

const hoyISO = () => new Date().toISOString().split('T')[0]

export default function CortesPage() {
  const [negocioId, setNegocioId]     = useState(1)
  const [cortes, setCortes]           = useState([])
  const [cargando, setCargando]       = useState(true)
  const [detalle, setDetalle]         = useState(null)

  // Corte del día
  const [fechaDia, setFechaDia]       = useState(hoyISO())
  const [corteDia, setCorteDia]       = useState(null)
  const [cargandoDia, setCargandoDia] = useState(false)

  // Config negocio
  const [config, setConfig]           = useState(null)
  const [guardandoConfig, setGuardandoConfig] = useState(false)

  // Forzar cierre (huérfanos)
  const [forzando, setForzando]       = useState(null) // corte seleccionado
  const [motivoForzar, setMotivoForzar] = useState('')
  const [enviandoForzar, setEnviandoForzar] = useState(false)
  const [errorForzar, setErrorForzar] = useState('')

  useEffect(() => { cargar() }, [negocioId])
  useEffect(() => { cargarDia() }, [negocioId, fechaDia])
  useEffect(() => { cargarConfig() }, [negocioId])

  const cargar = async () => {
    setCargando(true)
    const res = await api.listarCortes(negocioId)
    setCortes(Array.isArray(res) ? res : [])
    setCargando(false)
  }

  const cargarDia = async () => {
    setCargandoDia(true)
    const res = await api.corteDia(negocioId, fechaDia)
    setCorteDia(res && !res.error ? res : null)
    setCargandoDia(false)
  }

  const cargarConfig = async () => {
    const res = await api.obtenerConfigNegocio(negocioId)
    setConfig(res && !res.error ? res : null)
  }

  const toggleOcultarEsperado = async () => {
    if (!config) return
    setGuardandoConfig(true)
    const res = await api.actualizarConfigNegocio(negocioId, {
      ocultar_efectivo_esperado: !config.ocultar_efectivo_esperado
    })
    if (!res.error) setConfig(res)
    setGuardandoConfig(false)
  }

  const verDetalle = async (id) => {
    setDetalle({ cargando: true })
    const res = await api.obtenerCorte(id)
    setDetalle(res)
  }

  const abiertos = cortes.filter(c => c.estado === 'abierto').length
  const cerrados = cortes.filter(c => c.estado === 'cerrado')
  const conDiferencia = cerrados.filter(c => parseFloat(c.diferencia) !== 0).length

  // Huérfanos: cortes abiertos con apertura > 12h
  const huerfanos = cortes.filter(c => {
    if (c.estado !== 'abierto') return false
    const horas = (Date.now() - new Date(c.apertura).getTime()) / 36e5
    return horas > 12
  })

  const abrirForzar = (corte) => {
    setMotivoForzar('')
    setErrorForzar('')
    setForzando(corte)
  }

  const confirmarForzar = async () => {
    if (!motivoForzar.trim()) { setErrorForzar('Ingresa el motivo'); return }
    setEnviandoForzar(true)
    setErrorForzar('')
    try {
      await api.forzarCierreCorte(forzando.id, motivoForzar.trim())
      setForzando(null)
      await cargar()
    } catch (e) {
      setErrorForzar(e.message)
    } finally {
      setEnviandoForzar(false)
    }
  }

  return (
    <div>
      {/* HEADER */}
      <div style={s.pageHeader}>
        <div>
          <h2 style={s.pageTitle}>Cortes de Caja</h2>
          <p style={s.pageSub}>
            {abiertos > 0 && <span style={s.alertaSpan}>{abiertos} turno{abiertos > 1 ? 's' : ''} abierto · </span>}
            {cortes.length} cortes · {conDiferencia} con diferencia
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={s.btnRefresh} onClick={cargar}>Actualizar</button>
          <button
            style={{ ...s.btnExcel, opacity: cortes.length === 0 ? 0.5 : 1 }}
            disabled={cortes.length === 0}
            onClick={() => exportarCortes(cortes, negocioId)}
          >
            Exportar Excel
          </button>
        </div>
      </div>

      {/* CORTE DEL DÍA */}
      <div style={s.diaWidget}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <span style={{ fontWeight: 700, fontSize: 14 }}>Corte del día</span>
          <input type="date" value={fechaDia} onChange={e => setFechaDia(e.target.value)}
            style={{ padding: '4px 8px', border: '1px solid #D1D5DB', borderRadius: 4, fontSize: 13 }} />
          {config && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#374151', marginLeft: 'auto', cursor: 'pointer' }}>
              <input type="checkbox" checked={config.ocultar_efectivo_esperado}
                onChange={toggleOcultarEsperado} disabled={guardandoConfig} />
              Ocultar ef. esperado al cajero
            </label>
          )}
        </div>
        {cargandoDia ? (
          <p style={{ color: '#9CA3AF', fontSize: 13 }}>Calculando...</p>
        ) : corteDia && parseInt(corteDia.turnos) > 0 ? (
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div style={s.diaKpi}>
              <span style={s.diaLabel}>Turnos</span>
              <span style={s.diaVal}>{corteDia.turnos}</span>
              {parseInt(corteDia.turnos_abiertos) > 0 && (
                <span style={{ fontSize: 11, color: '#D97706' }}>{corteDia.turnos_abiertos} abierto(s)</span>
              )}
            </div>
            <div style={s.diaKpi}>
              <span style={s.diaLabel}>Total ventas</span>
              <span style={{ ...s.diaVal, color: '#059669' }}>${parseFloat(corteDia.total_ventas).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
            </div>
            <div style={s.diaKpi}>
              <span style={s.diaLabel}>Diferencia neta</span>
              <span style={{ ...s.diaVal, color: parseFloat(corteDia.total_diferencia) === 0 ? '#065F46' : parseFloat(corteDia.total_diferencia) > 0 ? '#1D4ED8' : '#DC2626' }}>
                {parseFloat(corteDia.total_diferencia) > 0 ? '+' : ''}${parseFloat(corteDia.total_diferencia).toFixed(2)}
              </span>
            </div>
            {corteDia.ventas_por_metodo?.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {corteDia.ventas_por_metodo.map(r => (
                  <div key={r.metodo_pago} style={s.diaMetodo}>
                    <span style={{ fontSize: 11, color: '#6B7280', textTransform: 'capitalize' }}>{r.metodo_pago}</span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>${parseFloat(r.total).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p style={{ color: '#9CA3AF', fontSize: 13 }}>Sin turnos registrados para esta fecha.</p>
        )}
      </div>

      {/* HUÉRFANOS */}
      {huerfanos.length > 0 && (
        <div style={s.huerfanosBox}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#92400E' }}>
              ⚠ {huerfanos.length} corte{huerfanos.length > 1 ? 's' : ''} huérfano{huerfanos.length > 1 ? 's' : ''} (abiertos {'>'} 12h)
            </span>
            <span style={{ fontSize: 12, color: '#78350F' }}>
              Distorsionan el snapshot del POS. Fuérzalos a cerrar para limpiar.
            </span>
          </div>
          <div className="tbl-wrap">
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>#</th>
                  <th style={s.th}>Cajero</th>
                  <th style={s.th}>Apertura</th>
                  <th style={s.th}>Antigüedad</th>
                  <th style={{ ...s.th, textAlign: 'right' }}>Ef. inicial</th>
                  <th style={s.th}></th>
                </tr>
              </thead>
              <tbody>
                {huerfanos.map(c => {
                  const horas = Math.round((Date.now() - new Date(c.apertura).getTime()) / 36e5)
                  return (
                    <tr key={c.id} style={s.tr}>
                      <td style={{ ...s.td, fontFamily: 'monospace', color: '#6B7280' }}>#{c.id}</td>
                      <td style={s.td}>{c.cajero}</td>
                      <td style={{ ...s.td, fontSize: 12 }}>
                        {new Date(c.apertura).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td style={{ ...s.td, fontSize: 12, color: '#92400E', fontWeight: 600 }}>
                        {horas >= 24 ? `${Math.floor(horas / 24)}d ${horas % 24}h` : `${horas}h`}
                      </td>
                      <td style={{ ...s.td, textAlign: 'right' }}>
                        ${parseFloat(c.efectivo_inicial).toFixed(2)}
                      </td>
                      <td style={{ ...s.td, textAlign: 'right' }}>
                        <button style={s.btnForzar} onClick={() => abrirForzar(c)}>Forzar cierre</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TABS NEGOCIO */}
      <div style={{ ...s.negocioTabs, marginBottom: 16 }}>
        {NEGOCIOS.map(n => (
          <button
            key={n.id}
            style={{ ...s.tabBtn, ...(negocioId === n.id ? s.tabBtnActive : {}) }}
            onClick={() => setNegocioId(n.id)}
          >
            {n.nombre}
          </button>
        ))}
      </div>

      {/* TABLA */}
      {cargando ? (
        <p style={{ color: '#6B7280', padding: 20 }}>Cargando...</p>
      ) : cortes.length === 0 ? (
        <div style={s.empty}>Sin cortes registrados para este negocio.</div>
      ) : (
        <div className="tbl-wrap">
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>#</th>
                <th style={s.th}>Cajero</th>
                <th style={s.th}>Apertura</th>
                <th style={s.th}>Cierre</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Ef. inicial</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Esperado</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Contado</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Diferencia</th>
                <th style={s.th}>Estado</th>
                <th style={s.th}></th>
              </tr>
            </thead>
            <tbody>
              {cortes.map(c => {
                const diff = c.diferencia != null ? parseFloat(c.diferencia) : null
                return (
                  <tr key={c.id} style={s.tr}>
                    <td style={{ ...s.td, fontFamily: 'monospace', color: '#6B7280' }}>#{c.id}</td>
                    <td style={s.td}>{c.cajero}</td>
                    <td style={{ ...s.td, fontSize: 12 }}>
                      {new Date(c.apertura).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td style={{ ...s.td, fontSize: 12, color: '#6B7280' }}>
                      {c.cierre
                        ? new Date(c.cierre).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })
                        : '—'}
                    </td>
                    <td style={{ ...s.td, textAlign: 'right' }}>
                      ${parseFloat(c.efectivo_inicial).toFixed(2)}
                    </td>
                    <td style={{ ...s.td, textAlign: 'right', color: '#6B7280' }}>
                      {c.efectivo_esperado != null ? `$${parseFloat(c.efectivo_esperado).toFixed(2)}` : '—'}
                    </td>
                    <td style={{ ...s.td, textAlign: 'right' }}>
                      {c.efectivo_contado != null ? `$${parseFloat(c.efectivo_contado).toFixed(2)}` : '—'}
                    </td>
                    <td style={{ ...s.td, textAlign: 'right', fontWeight: 700 }}>
                      {diff != null ? (
                        <span style={{ color: diff === 0 ? '#065F46' : diff > 0 ? '#1D4ED8' : '#DC2626' }}>
                          {diff > 0 ? '+' : ''}{diff.toFixed(2)}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={s.td}>
                      <span style={{ ...s.badge, ...(c.estado === 'abierto' ? s.badgeAbierto : s.badgeCerrado) }}>
                        {c.estado}
                      </span>
                    </td>
                    <td style={{ ...s.td, textAlign: 'right' }}>
                      {c.estado === 'cerrado' ? (
                        <button style={s.btnVer} onClick={() => verDetalle(c.id)}>Ver</button>
                      ) : (
                        <button style={s.btnForzar} onClick={() => abrirForzar(c)}>Forzar cierre</button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL FORZAR CIERRE */}
      {forzando && (
        <div style={s.overlay}>
          <div style={{ ...s.modalCard, width: 460 }}>
            <div style={s.modalHeader}>
              <div>
                <h3 style={s.modalTitle}>Forzar cierre · Corte #{forzando.id}</h3>
                <p style={s.modalSub}>{forzando.cajero} · abierto {new Date(forzando.apertura).toLocaleString('es-MX')}</p>
              </div>
              <button style={s.btnCerrar} onClick={() => setForzando(null)} disabled={enviandoForzar}>✕</button>
            </div>

            <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 6, padding: 12, marginBottom: 14, fontSize: 13, color: '#78350F' }}>
              Esto cerrará el corte con <strong>diferencia $0</strong> (efectivo contado = esperado).
              Úsalo solo para limpiar cortes huérfanos que el cajero olvidó cerrar. El motivo queda registrado en las notas.
            </div>

            <label style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Motivo</label>
            <textarea
              value={motivoForzar}
              onChange={e => setMotivoForzar(e.target.value)}
              autoFocus
              rows={3}
              placeholder="Ej: Cajero salió sin cerrar turno; ya no hay forma de cuadrar efectivo."
              style={{ width: '100%', padding: 10, fontSize: 13, border: '1px solid #D1D5DB', borderRadius: 4, marginTop: 6, fontFamily: 'inherit', resize: 'vertical' }}
              disabled={enviandoForzar}
            />
            {errorForzar && <div style={{ fontSize: 12, color: '#DC2626', marginTop: 6 }}>{errorForzar}</div>}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button style={s.btnRefresh} onClick={() => setForzando(null)} disabled={enviandoForzar}>Cancelar</button>
              <button
                onClick={confirmarForzar}
                disabled={enviandoForzar}
                style={{ padding: '8px 16px', background: '#DC2626', color: '#FFF', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: enviandoForzar ? 'wait' : 'pointer' }}
              >
                {enviandoForzar ? 'Cerrando...' : 'Confirmar cierre forzado'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALLE */}
      {detalle && (
        <div style={s.overlay}>
          <div style={s.modalCard}>
            {detalle.cargando ? (
              <p style={{ textAlign: 'center', padding: 40, color: '#6B7280' }}>Cargando...</p>
            ) : (
              <>
                <div style={s.modalHeader}>
                  <div>
                    <h3 style={s.modalTitle}>Corte #{detalle.id}</h3>
                    <p style={s.modalSub}>{detalle.cajero}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button style={s.btnExportar} onClick={() => exportarCorteDetalle(detalle, negocioId)}>
                      Exportar Excel
                    </button>
                    <button style={s.btnCerrar} onClick={() => setDetalle(null)}>✕</button>
                  </div>
                </div>

                {/* Tiempos */}
                <div style={s.infoGrid}>
                  <InfoRow label="Apertura" value={new Date(detalle.apertura).toLocaleString('es-MX')} />
                  <InfoRow label="Cierre" value={new Date(detalle.cierre).toLocaleString('es-MX')} />
                </div>

                {/* Resumen por método */}
                {detalle.resumen_por_metodo?.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <p style={s.seccionLabel}>Ventas por método de pago</p>
                    <div className="tbl-wrap">
                      <table style={s.table}>
                        <thead>
                          <tr>
                            <th style={s.th}>Método</th>
                            <th style={{ ...s.th, textAlign: 'right' }}>Ventas</th>
                            <th style={{ ...s.th, textAlign: 'right' }}>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detalle.resumen_por_metodo.map(r => (
                            <tr key={r.metodo_pago} style={s.tr}>
                              <td style={s.td}>{r.metodo_pago}</td>
                              <td style={{ ...s.td, textAlign: 'right', color: '#6B7280' }}>{r.cantidad}</td>
                              <td style={{ ...s.td, textAlign: 'right', fontWeight: 600 }}>${parseFloat(r.total).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Top productos */}
                {detalle.top_productos?.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <p style={s.seccionLabel}>Top productos del turno</p>
                    <div className="tbl-wrap">
                      <table style={s.table}>
                        <thead>
                          <tr>
                            <th style={s.th}>Producto</th>
                            <th style={{ ...s.th, textAlign: 'right' }}>Uds</th>
                            <th style={{ ...s.th, textAlign: 'right' }}>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detalle.top_productos.map((p, i) => (
                            <tr key={i} style={s.tr}>
                              <td style={s.td}>{p.nombre}</td>
                              <td style={{ ...s.td, textAlign: 'right', color: '#6B7280' }}>{parseFloat(p.cantidad_vendida)}</td>
                              <td style={{ ...s.td, textAlign: 'right', fontWeight: 600 }}>${parseFloat(p.total).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Cuadre de caja */}
                <div style={s.cuadreBox}>
                  <p style={s.seccionLabel}>Cuadre de caja</p>
                  <div style={s.cuadreRow}>
                    <span>Efectivo inicial</span>
                    <span>${parseFloat(detalle.efectivo_inicial).toFixed(2)}</span>
                  </div>
                  <div style={s.cuadreRow}>
                    <span>Ventas en efectivo</span>
                    <span>${(parseFloat(detalle.efectivo_esperado) - parseFloat(detalle.efectivo_inicial)).toFixed(2)}</span>
                  </div>
                  <div style={{ ...s.cuadreRow, fontWeight: 600 }}>
                    <span>Total esperado</span>
                    <span>${parseFloat(detalle.efectivo_esperado).toFixed(2)}</span>
                  </div>
                  <div style={{ ...s.cuadreRow, fontWeight: 600 }}>
                    <span>Total contado</span>
                    <span>${parseFloat(detalle.efectivo_contado).toFixed(2)}</span>
                  </div>
                  <div style={{
                    ...s.cuadreRow,
                    fontWeight: 700,
                    fontSize: 16,
                    borderTop: '2px solid #E5E7EB',
                    paddingTop: 10,
                    marginTop: 4,
                    color: parseFloat(detalle.diferencia) === 0 ? '#065F46'
                      : parseFloat(detalle.diferencia) > 0 ? '#1D4ED8' : '#DC2626'
                  }}>
                    <span>Diferencia</span>
                    <span>{parseFloat(detalle.diferencia) > 0 ? '+' : ''}{parseFloat(detalle.diferencia).toFixed(2)}</span>
                  </div>
                  {detalle.notas && (
                    <p style={{ fontSize: 12, color: '#6B7280', marginTop: 10 }}>Notas: {detalle.notas}</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: 13 }}>{value}</span>
    </div>
  )
}

const s = {
  diaWidget:  { background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 8, padding: '16px 20px', marginBottom: 16 },
  diaKpi:     { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 110 },
  diaLabel:   { fontSize: 11, color: '#6B7280', fontWeight: 600, textTransform: 'uppercase' },
  diaVal:     { fontSize: 20, fontWeight: 800, color: '#111827' },
  diaMetodo:  { display: 'flex', flexDirection: 'column', gap: 2, background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 6, padding: '6px 10px', minWidth: 90 },
  btnExportar:{ padding: '4px 10px', background: '#F0FDF4', color: '#059669', border: '1px solid #BBF7D0', borderRadius: 4, fontSize: 12, cursor: 'pointer' },
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  pageTitle: { fontSize: 22, fontWeight: 700 },
  pageSub: { color: '#6B7280', fontSize: 13, marginTop: 2 },
  alertaSpan: { color: '#D97706', fontWeight: 600 },
  btnRefresh: { padding: '7px 14px', background: '#FFF', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 13, color: '#374151' },
  btnExcel: { padding: '8px 16px', background: '#10B981', color: '#FFF', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  negocioTabs: { display: 'flex', gap: 4 },
  tabBtn: { padding: '7px 16px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 13, background: '#FFF', color: '#374151' },
  tabBtnActive: { background: '#1E3A5F', color: '#FFF', border: '1px solid #1E3A5F' },
  empty: { padding: 40, textAlign: 'center', color: '#9CA3AF', background: '#FFF', borderRadius: 8, border: '1px solid #E5E7EB' },
  tableWrap: { background: '#FFF', borderRadius: 8, border: '1px solid #E5E7EB', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 14px', background: '#F9FAFB', fontSize: 12, fontWeight: 600, color: '#6B7280', textAlign: 'left', borderBottom: '1px solid #E5E7EB' },
  tr: { borderBottom: '1px solid #F3F4F6' },
  td: { padding: '10px 14px', fontSize: 13, verticalAlign: 'middle' },
  badge: { display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 500 },
  badgeAbierto: { background: '#FEF3C7', color: '#92400E' },
  badgeCerrado: { background: '#F3F4F6', color: '#374151' },
  btnVer: { padding: '4px 10px', background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', borderRadius: 4, fontSize: 12 },
  btnForzar: { padding: '4px 10px', background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA', borderRadius: 4, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  huerfanosBox: { background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 8, padding: 14, marginBottom: 16 },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modalCard: { background: '#FFF', borderRadius: 10, padding: 28, width: 500, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', maxHeight: '85vh', overflow: 'auto' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: 700 },
  modalSub: { color: '#6B7280', fontSize: 13, marginTop: 2 },
  btnCerrar: { background: 'none', border: 'none', fontSize: 18, color: '#9CA3AF', cursor: 'pointer', padding: 4 },
  infoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, background: '#F9FAFB', padding: 14, borderRadius: 6, marginBottom: 16 },
  seccionLabel: { fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' },
  cuadreBox: { background: '#F9FAFB', borderRadius: 6, padding: 16, marginTop: 4 },
  cuadreRow: { display: 'flex', justifyContent: 'space-between', fontSize: 14, padding: '5px 0', borderBottom: '1px solid #E5E7EB' },
}
