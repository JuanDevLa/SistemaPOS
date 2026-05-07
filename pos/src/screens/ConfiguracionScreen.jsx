import { useState, useEffect } from 'react'
import { usePermisos } from '../hooks/usePermisos'
import { api } from '../api'
import CajerosSection from '../components/CajerosSection'
import {
  Users, Store, Database, FileText, Hash, Receipt, CreditCard,
  DollarSign, Package, Printer, ScanLine, Wallet, Terminal,
  Smartphone, Lightbulb, Truck, HardDrive, RefreshCw, X,
  Scissors, Lock, RotateCcw, BarChart2, Shield, Server
} from 'lucide-react'
import {
  ModalImpuestos, ModalMoneda, ModalFormasPago,
  ModalSeguridad, ModalDevoluciones, ModalStockAlertas, ModalCreditoGlobal,
  ModalLectorCodigos, ModalImpresora, ModalCajon, ModalTerminalTPV,
  ModalRecargas, ModalCompras,
} from './ConfiguracionModales'

export default function ConfiguracionScreen({ usuario }) {
  const { esAdmin } = usePermisos(usuario)
  const [modal, setModal]   = useState(null)
  const [seccion, setSeccion] = useState(null)

  if (seccion === 'cajeros') return <CajerosSection onBack={() => setSeccion(null)} />

  return (
    <div style={s.root}>
      <div style={s.pageHeader}>
        <h2 style={s.pageTitle}>Configuración</h2>
      </div>

      <Seccion titulo="General">
        {esAdmin && <Tarjeta Icono={Users}    label="Cajeros"       onClick={() => setSeccion('cajeros')} />}
        <Tarjeta Icono={Lock}     label="Seguridad"      onClick={() => setModal('seguridad')} esAdmin={esAdmin} />
        <Tarjeta Icono={Store}    label="Negocios"       proximamente />
        <Tarjeta Icono={Database} label="Base de datos"  proximamente />
        <Tarjeta Icono={FileText} label="Facturación"    proximamente />
      </Seccion>

      <Seccion titulo="Personalización">
        <Tarjeta Icono={Hash}       label="Folios de ticket"   onClick={() => setModal('folios')} />
        <Tarjeta Icono={Receipt}    label="Formato de ticket"  onClick={() => setModal('ticket')} />
        <Tarjeta Icono={Scissors}   label="Cortes"             onClick={() => setModal('cortes')} />
        <Tarjeta Icono={CreditCard} label="Formas de pago"     onClick={() => setModal('formasPago')} esAdmin={esAdmin} />
        <Tarjeta Icono={DollarSign} label="Impuestos"          onClick={() => setModal('impuestos')} esAdmin={esAdmin} />
        <Tarjeta Icono={DollarSign} label="Símbolo de moneda"  onClick={() => setModal('moneda')} esAdmin={esAdmin} />
        <Tarjeta Icono={Package}    label="Unidades de medida" proximamente />
        <Tarjeta Icono={RotateCcw}  label="Devoluciones"       onClick={() => setModal('devoluciones')} esAdmin={esAdmin} />
        <Tarjeta Icono={BarChart2}  label="Alertas de stock"   onClick={() => setModal('stockAlertas')} esAdmin={esAdmin} />
        <Tarjeta Icono={Shield}     label="Límite crédito"     onClick={() => setModal('creditoGlobal')} esAdmin={esAdmin} />
      </Seccion>

      <Seccion titulo="Dispositivos">
        <Tarjeta Icono={Printer}  label="Impresora"        onClick={() => setModal('impresora')} esAdmin={esAdmin} />
        <Tarjeta Icono={ScanLine} label="Lector de códigos" onClick={() => setModal('lectorCodigos')} esAdmin={esAdmin} />
        <Tarjeta Icono={Wallet}   label="Cajón de dinero"  onClick={() => setModal('cajon')} esAdmin={esAdmin} />
        <Tarjeta Icono={Terminal} label="Terminal TPV"     onClick={() => setModal('terminalTPV')} esAdmin={esAdmin} />
      </Seccion>

      <Seccion titulo="Servicios">
        <Tarjeta Icono={Smartphone} label="Recargas"          onClick={() => setModal('recargas')} esAdmin={esAdmin} />
        <Tarjeta Icono={Lightbulb}  label="Pago de servicios" proximamente />
        <Tarjeta Icono={Truck}      label="Compras"           onClick={() => setModal('compras')} esAdmin={esAdmin} />
      </Seccion>

      <Seccion titulo="Sistema">
        {esAdmin && <Tarjeta Icono={Server}    label="Servidor / URL"   onClick={() => setModal('servidor')} esAdmin={esAdmin} />}
        <Tarjeta Icono={RefreshCw} label="Actualizaciones" onClick={() => setModal('actualizaciones')} />
        <Tarjeta Icono={HardDrive} label="Respaldo"        proximamente />
      </Seccion>

      {modal === 'folios'       && <ModalFolios       onClose={() => setModal(null)} />}
      {modal === 'ticket'       && <ModalTicket       onClose={() => setModal(null)} />}
      {modal === 'cortes'       && <ModalCortes       onClose={() => setModal(null)} />}
      {modal === 'impuestos'    && <ModalImpuestos    onClose={() => setModal(null)} />}
      {modal === 'moneda'       && <ModalMoneda       onClose={() => setModal(null)} />}
      {modal === 'formasPago'   && <ModalFormasPago   onClose={() => setModal(null)} />}
      {modal === 'seguridad'    && <ModalSeguridad    onClose={() => setModal(null)} />}
      {modal === 'devoluciones' && <ModalDevoluciones onClose={() => setModal(null)} />}
      {modal === 'stockAlertas' && <ModalStockAlertas onClose={() => setModal(null)} />}
      {modal === 'creditoGlobal'&& <ModalCreditoGlobal onClose={() => setModal(null)} />}
      {modal === 'lectorCodigos'&& <ModalLectorCodigos onClose={() => setModal(null)} />}
      {modal === 'impresora'    && <ModalImpresora    onClose={() => setModal(null)} />}
      {modal === 'cajon'        && <ModalCajon        onClose={() => setModal(null)} />}
      {modal === 'terminalTPV'  && <ModalTerminalTPV  onClose={() => setModal(null)} />}
      {modal === 'recargas'     && <ModalRecargas     onClose={() => setModal(null)} />}
      {modal === 'compras'      && <ModalCompras      onClose={() => setModal(null)} />}
      {modal === 'servidor'     && <ModalServidor     onClose={() => setModal(null)} />}
      {modal === 'actualizaciones' && <ModalActualizaciones onClose={() => setModal(null)} />}
    </div>
  )
}

// ─── Componentes locales ──────────────────────────────────────────────────────

function Seccion({ titulo, children }) {
  const validos = Array.isArray(children)
    ? children.filter(Boolean)
    : children ? [children] : []
  if (validos.length === 0) return null
  return (
    <div style={s.seccion}>
      <h3 style={s.secTitulo}>{titulo}</h3>
      <div style={s.tarjetasGrid}>{validos}</div>
    </div>
  )
}

function Tarjeta({ Icono, label, onClick, proximamente, esAdmin }) {
  // Si requiere admin y el usuario no lo es, mostrar como próximamente
  const bloqueado = esAdmin === false && onClick !== undefined && !proximamente
  const deshabilitado = proximamente || bloqueado || !onClick
  return (
    <button
      style={{ ...s.tarjeta, ...(deshabilitado ? s.tarjetaDes : s.tarjetaActiva) }}
      onClick={deshabilitado ? undefined : onClick}
      title={proximamente ? 'Próximamente' : bloqueado ? 'Solo administrador' : label}
    >
      <Icono size={22} strokeWidth={1.6} color={deshabilitado ? '#9CA3AF' : '#1E3A5F'} />
      <span style={s.tarjetaLabel}>{label}</span>
      {proximamente && <span style={s.badge}>Próximamente</span>}
      {bloqueado && !proximamente && <span style={s.badge}>Admin</span>}
    </button>
  )
}

// ─── Modales existentes (Folios, Ticket, Cortes) ──────────────────────────────

function ModalFolios({ onClose }) {
  const [negocios, setNegocios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState({})
  const [vals, setVals] = useState({})
  const [msg, setMsg] = useState({})

  useEffect(() => {
    api.listarNegocios().then(res => {
      if (Array.isArray(res)) {
        setNegocios(res)
        const init = {}
        res.forEach(n => { init[n.id] = { folio_prefijo: n.folio_prefijo || '', folio_siguiente: n.folio_siguiente ?? 1 } })
        setVals(init)
      }
      setCargando(false)
    }).catch(() => setCargando(false))
  }, [])

  const guardar = async (id) => {
    setGuardando(g => ({ ...g, [id]: true }))
    setMsg(m => ({ ...m, [id]: '' }))
    try {
      await api.actualizarFolios(id, { folio_prefijo: vals[id].folio_prefijo, folio_siguiente: parseInt(vals[id].folio_siguiente, 10) })
      setMsg(m => ({ ...m, [id]: 'Guardado' }))
    } catch(e) { setMsg(m => ({ ...m, [id]: e.message })) }
    setGuardando(g => ({ ...g, [id]: false }))
  }

  const setVal = (id, campo, valor) => setVals(v => ({ ...v, [id]: { ...v[id], [campo]: valor } }))

  return (
    <div style={sm.overlay}>
      <div style={sm.modalCard}>
        <div style={sm.modalHeader}>
          <h3 style={sm.modalTitle}>Folios de ticket</h3>
          <button style={sm.btnCerrar} onClick={onClose}><X size={18} /></button>
        </div>
        <p style={sm.desc}>Formato: <strong>PREFIJO + número (6 dígitos)</strong>. Ej: F-000001.</p>
        {cargando ? <p style={sm.loading}>Cargando...</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {negocios.map(n => (
              <div key={n.id} style={sm.negCard}>
                <h4 style={sm.negNombre}>{n.nombre}</h4>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div>
                    <label style={sm.fieldLabel}>Prefijo</label>
                    <input style={{ ...sm.fieldInput, width: 90 }} value={vals[n.id]?.folio_prefijo || ''} onChange={e => setVal(n.id, 'folio_prefijo', e.target.value)} placeholder="F-" maxLength={10} />
                  </div>
                  <div>
                    <label style={sm.fieldLabel}>Siguiente número</label>
                    <input style={{ ...sm.fieldInput, width: 110 }} type="number" min={1} value={vals[n.id]?.folio_siguiente ?? 1} onChange={e => setVal(n.id, 'folio_siguiente', e.target.value)} />
                  </div>
                  <div>
                    <label style={sm.fieldLabel}>Vista previa</label>
                    <div style={sm.preview}>{(vals[n.id]?.folio_prefijo || '') + String(vals[n.id]?.folio_siguiente ?? 1).padStart(6, '0')}</div>
                  </div>
                  <button style={sm.btnGuardar} onClick={() => guardar(n.id)} disabled={guardando[n.id]}>{guardando[n.id] ? 'Guardando...' : 'Guardar'}</button>
                </div>
                {msg[n.id] && <p style={{ fontSize: 12, marginTop: 6, color: msg[n.id] === 'Guardado' ? '#065F46' : '#DC2626' }}>{msg[n.id]}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ModalTicket({ onClose }) {
  const [negocios, setNegocios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [vals, setVals] = useState({})
  const [guardando, setGuardando] = useState({})
  const [msg, setMsg] = useState({})

  useEffect(() => {
    api.listarNegocios().then(res => {
      if (Array.isArray(res)) {
        setNegocios(res)
        const init = {}
        res.forEach(n => { init[n.id] = { ticket_nombre: n.ticket_nombre || n.nombre || '', ticket_slogan: n.ticket_slogan || '', ticket_telefono: n.ticket_telefono || '', ticket_pie: n.ticket_pie || '¡Gracias por su compra!' } })
        setVals(init)
      }
      setCargando(false)
    }).catch(() => setCargando(false))
  }, [])

  const setVal = (id, campo, valor) => setVals(v => ({ ...v, [id]: { ...v[id], [campo]: valor } }))
  const guardar = async (id) => {
    setGuardando(g => ({ ...g, [id]: true }))
    try { await api.actualizarTicket(id, vals[id]); setMsg(m => ({ ...m, [id]: 'Guardado' })) }
    catch(e) { setMsg(m => ({ ...m, [id]: e.message })) }
    setGuardando(g => ({ ...g, [id]: false }))
  }

  return (
    <div style={sm.overlay}>
      <div style={{ ...sm.modalCard, width: 600 }}>
        <div style={sm.modalHeader}>
          <h3 style={sm.modalTitle}>Formato de ticket</h3>
          <button style={sm.btnCerrar} onClick={onClose}><X size={18} /></button>
        </div>
        <p style={sm.desc}>Datos del encabezado y pie de cada ticket impreso.</p>
        {cargando ? <p style={sm.loading}>Cargando...</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {negocios.map(n => (
              <div key={n.id} style={sm.negCard}>
                <h4 style={sm.negNombre}>{n.nombre}</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={sm.fieldLabel}>Nombre en el ticket</label>
                    <input style={sm.fieldInput} value={vals[n.id]?.ticket_nombre || ''} onChange={e => setVal(n.id, 'ticket_nombre', e.target.value)} maxLength={100} />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={sm.fieldLabel}>Dirección / slogan</label>
                    <input style={sm.fieldInput} value={vals[n.id]?.ticket_slogan || ''} onChange={e => setVal(n.id, 'ticket_slogan', e.target.value)} maxLength={150} />
                  </div>
                  <div>
                    <label style={sm.fieldLabel}>Teléfono</label>
                    <input style={sm.fieldInput} value={vals[n.id]?.ticket_telefono || ''} onChange={e => setVal(n.id, 'ticket_telefono', e.target.value)} maxLength={30} />
                  </div>
                  <div>
                    <label style={sm.fieldLabel}>Mensaje al pie</label>
                    <input style={sm.fieldInput} value={vals[n.id]?.ticket_pie || ''} onChange={e => setVal(n.id, 'ticket_pie', e.target.value)} maxLength={100} />
                  </div>
                </div>
                <div style={sm.ticketPreview}>
                  <div style={{ textAlign: 'center', borderBottom: '1px dashed #ccc', paddingBottom: 6, marginBottom: 6 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a1a' }}>{vals[n.id]?.ticket_nombre || n.nombre}</div>
                    {vals[n.id]?.ticket_slogan && <div style={{ fontSize: 11, color: '#555' }}>{vals[n.id].ticket_slogan}</div>}
                    {vals[n.id]?.ticket_telefono && <div style={{ fontSize: 11, color: '#555' }}>Tel: {vals[n.id].ticket_telefono}</div>}
                  </div>
                  <div style={{ fontSize: 11, color: '#666' }}>Coca-Cola 600ml x2  $36.00</div>
                  <div style={{ fontSize: 11, color: '#666', borderTop: '1px dashed #ccc', paddingTop: 4, marginTop: 4, textAlign: 'right' }}>TOTAL: $36.00</div>
                  <div style={{ fontSize: 11, textAlign: 'center', marginTop: 6, color: '#555' }}>{vals[n.id]?.ticket_pie || '¡Gracias por su compra!'}</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                  {msg[n.id] ? <span style={{ fontSize: 12, color: msg[n.id] === 'Guardado' ? '#065F46' : '#DC2626' }}>{msg[n.id]}</span> : <span />}
                  <button style={sm.btnGuardar} onClick={() => guardar(n.id)} disabled={guardando[n.id]}>{guardando[n.id] ? 'Guardando...' : 'Guardar'}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ModalCortes({ onClose }) {
  const [negocios, setNegocios] = useState([])
  const [vals, setVals] = useState({})
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState({})
  const [msg, setMsg] = useState({})

  useEffect(() => {
    let activo = true
    api.listarNegocios().then(async res => {
      if (!Array.isArray(res) || !activo) return
      setNegocios(res)
      const init = {}
      for (const n of res) {
        try { const cfg = await api.obtenerConfigNegocio(n.id); init[n.id] = cfg?.max_cortes_cajero_dia ?? 3 }
        catch { init[n.id] = 3 }
      }
      if (activo) { setVals(init); setCargando(false) }
    }).catch(() => activo && setCargando(false))
    return () => { activo = false }
  }, [])

  const guardar = async (id) => {
    setGuardando(g => ({ ...g, [id]: true }))
    try { await api.actualizarMaxCortes(id, parseInt(vals[id], 10)); setMsg(m => ({ ...m, [id]: 'Guardado' })) }
    catch(e) { setMsg(m => ({ ...m, [id]: e.message })) }
    setGuardando(g => ({ ...g, [id]: false }))
  }

  return (
    <div style={sm.overlay}>
      <div style={sm.modalCard}>
        <div style={sm.modalHeader}>
          <h3 style={sm.modalTitle}>Cortes</h3>
          <button style={sm.btnCerrar} onClick={onClose}><X size={18} /></button>
        </div>
        <p style={sm.desc}>Máximo de cortes parciales por cajero al día (1–20). Al alcanzarlo necesita autorización de admin.</p>
        {cargando ? <p style={sm.loading}>Cargando...</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {negocios.map(n => (
              <div key={n.id} style={sm.negCard}>
                <h4 style={sm.negNombre}>{n.nombre}</h4>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                  <div>
                    <label style={sm.fieldLabel}>Máximo de cortes al día</label>
                    <input style={{ ...sm.fieldInput, width: 100 }} type="number" min={1} max={20} value={vals[n.id] ?? 3} onChange={e => setVals(v => ({ ...v, [n.id]: e.target.value }))} />
                  </div>
                  <button style={sm.btnGuardar} onClick={() => guardar(n.id)} disabled={guardando[n.id]}>{guardando[n.id] ? 'Guardando...' : 'Guardar'}</button>
                  {msg[n.id] && <span style={{ fontSize: 12, color: msg[n.id] === 'Guardado' ? '#065F46' : '#DC2626' }}>{msg[n.id]}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Modal Servidor (URL del backend) ────────────────────────────────────────

function ModalServidor({ onClose }) {
  const [url, setUrl]         = useState('')
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [msg, setMsg]         = useState('')

  useEffect(() => {
    if (!window.configAPI) { setCargando(false); return }
    window.configAPI.leer().then(cfg => {
      setUrl(cfg?.api_url || '')
      setCargando(false)
    })
  }, [])

  const guardar = async () => {
    if (!url.trim()) return
    setGuardando(true); setMsg('')
    try {
      const res = await window.configAPI.guardar({ api_url: url.trim() })
      setMsg(res.ok ? 'Guardado. Reinicia la app para aplicar.' : (res.error || 'Error'))
    } catch { setMsg('Error al guardar') }
    setGuardando(false)
  }

  return (
    <div style={sm.overlay}>
      <div style={{ ...sm.modalCard, width: 480 }}>
        <div style={sm.modalHeader}>
          <h3 style={sm.modalTitle}>Servidor / URL del backend</h3>
          <button style={sm.btnCerrar} onClick={onClose}><X size={18} /></button>
        </div>
        <p style={sm.desc}>URL del servidor backend al que se conecta el POS. Ejemplo: <code>https://api.tudominio.com</code></p>
        {cargando ? <p style={sm.loading}>Cargando...</p> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={sm.fieldLabel}>URL del backend</label>
              <input
                style={sm.fieldInput} value={url}
                onChange={e => { setUrl(e.target.value); setMsg('') }}
                placeholder="https://api.tudominio.com"
                onKeyDown={e => e.key === 'Enter' && guardar()}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button style={sm.btnGuardar} onClick={guardar} disabled={guardando || !url.trim()}>
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
              {msg && <span style={{ fontSize: 12, color: msg.startsWith('Guardado') ? '#065F46' : '#DC2626' }}>{msg}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Modal Actualizaciones ────────────────────────────────────────────────────

function ModalActualizaciones({ onClose }) {
  return (
    <div style={sm.overlay}>
      <div style={{ ...sm.modalCard, width: 420 }}>
        <div style={sm.modalHeader}>
          <h3 style={sm.modalTitle}>Actualizaciones</h3>
          <button style={sm.btnCerrar} onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, color: '#374151', fontSize: 13 }}>
          <p style={{ margin: 0 }}>
            Las actualizaciones automáticas se activarán en la próxima versión estable.
          </p>
          <p style={{ margin: 0, color: '#6B7280' }}>
            Para actualizar manualmente: descarga el nuevo instalador desde el repositorio y ejecútalo sobre la instalación existente.
          </p>
          <div style={{ background: '#F3F4F6', borderRadius: 6, padding: '10px 14px', fontSize: 12, fontFamily: 'monospace', color: '#374151' }}>
            Versión actual: {window.__PDV_VERSION__ || '1.0.0'}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const s = {
  root:        { padding: 20, color: '#1a1a1a', overflow: 'auto', height: '100%' },
  pageHeader:  { marginBottom: 24 },
  pageTitle:   { fontSize: 22, fontWeight: 700, color: '#1a1a1a' },
  seccion:     { marginBottom: 28 },
  secTitulo:   { fontSize: 13, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  tarjetasGrid:{ display: 'flex', flexWrap: 'wrap', gap: 10 },
  tarjeta:     { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 110, height: 90, borderRadius: 8, border: '1px solid #E5E7EB', background: '#FFF', cursor: 'pointer', padding: 8, gap: 4, position: 'relative' },
  tarjetaActiva:{ border: '1px solid #BFDBFE', background: '#F0F7FF' },
  tarjetaDes:  { opacity: 0.55, cursor: 'default' },
  tarjetaLabel:{ fontSize: 12, fontWeight: 600, color: '#374151', textAlign: 'center', lineHeight: 1.3 },
  badge:       { position: 'absolute', top: 4, right: 4, background: '#F3F4F6', color: '#9CA3AF', fontSize: 9, padding: '1px 4px', borderRadius: 4 },
}

const sm = {
  overlay:     { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  modalCard:   { background: '#FFF', borderRadius: 10, padding: 28, width: 560, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', maxHeight: '85vh', overflow: 'auto', color: '#1a1a1a' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle:  { fontSize: 18, fontWeight: 700, margin: 0, color: '#1a1a1a' },
  btnCerrar:   { background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: 4 },
  desc:        { fontSize: 13, color: '#6B7280', margin: '0 0 20px' },
  loading:     { textAlign: 'center', color: '#6B7280', padding: 20 },
  negCard:     { background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: 16 },
  negNombre:   { margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#1E3A5F' },
  fieldLabel:  { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 },
  fieldInput:  { padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 13, color: '#1a1a1a', width: '100%' },
  preview:     { padding: '8px 12px', background: '#FFF', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 14, fontFamily: 'monospace', fontWeight: 700, color: '#1E3A5F', minWidth: 100 },
  ticketPreview:{ marginTop: 12, padding: 10, background: '#FFF', border: '1px dashed #D1D5DB', borderRadius: 6, fontFamily: 'monospace' },
  btnGuardar:  { padding: '8px 18px', background: '#1E3A5F', color: '#FFF', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
}
