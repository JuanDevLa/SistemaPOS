import { useState, useEffect } from 'react'
import { api } from '../api'

const NEGOCIOS = [
  { id: 1, nombre: 'Farmacia Noriega' },
  { id: 2, nombre: 'Crucero Independencia' },
]

const CLIENTE_VACIO = {
  nombre: '', apellidos: '', telefono: '', email: '',
  domicilio1: '', colonia: '', municipio: '', codigo_postal: '',
  estado_residencia: 'Chiapas', notas: '', limite_credito: '', credito_habilitado: false,
}

export default function ClientesPage() {
  const [negocioId, setNegocioId]   = useState(1)
  const [clientes, setClientes]     = useState([])
  const [busqueda, setBusqueda]     = useState('')
  const [cargando, setCargando]     = useState(true)
  const [modal, setModal]           = useState(null)   // null | { modo: 'crear'|'editar', datos }
  const [estadoCuenta, setEstadoCuenta] = useState(null)
  const [guardando, setGuardando]   = useState(false)
  const [error, setError]           = useState('')

  useEffect(() => { cargar() }, [negocioId])

  const cargar = async () => {
    setCargando(true)
    const res = await api.listarClientes(negocioId)
    setClientes(Array.isArray(res) ? res : [])
    setCargando(false)
  }

  const filtrados = clientes.filter(c => {
    const q = busqueda.toLowerCase()
    return !q ||
      c.nombre?.toLowerCase().includes(q) ||
      c.apellidos?.toLowerCase().includes(q) ||
      c.telefono?.includes(q)
  })

  const abrirCrear = () => {
    setError('')
    setModal({ modo: 'crear', datos: { ...CLIENTE_VACIO } })
  }

  const abrirEditar = (c) => {
    setError('')
    setModal({
      modo: 'editar',
      id: c.id,
      datos: {
        nombre: c.nombre || '',
        apellidos: c.apellidos || '',
        telefono: c.telefono || '',
        email: c.email || '',
        domicilio1: c.domicilio1 || '',
        colonia: c.colonia || '',
        municipio: c.municipio || '',
        codigo_postal: c.codigo_postal || '',
        estado_residencia: c.estado_residencia || 'Chiapas',
        notas: c.notas || '',
        limite_credito: c.limite_credito || '',
        credito_habilitado: c.credito_habilitado || false,
      }
    })
  }

  const verEstadoCuenta = async (c) => {
    setEstadoCuenta({ cargando: true, nombre: c.nombre })
    const res = await api.estadoCuentaCliente(c.id, negocioId)
    setEstadoCuenta(res.error ? { error: res.error } : { ...res, nombre: c.nombre })
  }

  const guardar = async () => {
    if (!modal.datos.nombre.trim()) { setError('El nombre es requerido'); return }
    setGuardando(true)
    setError('')
    const payload = { ...modal.datos, negocio_id: negocioId, limite_credito: parseFloat(modal.datos.limite_credito) || 0 }
    const res = modal.modo === 'crear'
      ? await api.crearCliente(payload)
      : await api.editarCliente(modal.id, payload)
    setGuardando(false)
    if (res.error) { setError(res.error); return }
    setModal(null)
    cargar()
  }

  const desactivar = async (id) => {
    if (!confirm('¿Desactivar este cliente?')) return
    await api.desactivarCliente(id)
    cargar()
  }

  return (
    <div>
      <div style={s.pageHeader}>
        <div>
          <h2 style={s.pageTitle}>Clientes</h2>
          <p style={s.pageSub}>{filtrados.length} clientes</p>
        </div>
        <button style={s.btnNuevo} onClick={abrirCrear}>+ Nuevo cliente</button>
      </div>

      <div style={s.controls}>
        <div style={s.negocioTabs}>
          {NEGOCIOS.map(n => (
            <button key={n.id}
              style={{ ...s.tabBtn, ...(negocioId === n.id ? s.tabBtnActive : {}) }}
              onClick={() => setNegocioId(n.id)}
            >
              {n.nombre}
            </button>
          ))}
        </div>
        <input
          style={s.searchInput}
          placeholder="Buscar por nombre o teléfono..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
      </div>

      {cargando ? (
        <p style={{ color: '#6B7280', padding: 20 }}>Cargando...</p>
      ) : filtrados.length === 0 ? (
        <div style={s.empty}>Sin clientes registrados.</div>
      ) : (
        <div className="tbl-wrap">
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Nombre</th>
                <th style={s.th}>Teléfono</th>
                <th style={s.th}>Crédito</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Límite</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Saldo</th>
                <th style={s.th}></th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(c => (
                <tr key={c.id} style={s.tr}>
                  <td style={s.td}>
                    <div style={{ fontWeight: 600 }}>{c.nombre} {c.apellidos || ''}</div>
                    {c.email && <div style={{ fontSize: 12, color: '#6B7280' }}>{c.email}</div>}
                  </td>
                  <td style={{ ...s.td, color: '#6B7280' }}>{c.telefono || '—'}</td>
                  <td style={s.td}>
                    <span style={{ ...s.badge, ...(c.credito_habilitado ? s.badgeGreen : s.badgeGray) }}>
                      {c.credito_habilitado ? 'Habilitado' : 'No'}
                    </span>
                  </td>
                  <td style={{ ...s.td, textAlign: 'right' }}>
                    {c.limite_credito > 0 ? `$${parseFloat(c.limite_credito).toFixed(2)}` : '—'}
                  </td>
                  <td style={{ ...s.td, textAlign: 'right', fontWeight: parseFloat(c.saldo_actual) > 0 ? 700 : 400, color: parseFloat(c.saldo_actual) > 0 ? '#DC2626' : '#111827' }}>
                    {parseFloat(c.saldo_actual) > 0 ? `$${parseFloat(c.saldo_actual).toFixed(2)}` : '—'}
                  </td>
                  <td style={{ ...s.td, textAlign: 'right' }}>
                    <button style={s.btnVer} onClick={() => verEstadoCuenta(c)}>Estado</button>
                    <button style={{ ...s.btnVer, marginLeft: 4 }} onClick={() => abrirEditar(c)}>Editar</button>
                    <button style={{ ...s.btnVer, ...s.btnDanger, marginLeft: 4 }} onClick={() => desactivar(c.id)}>Baja</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL CREAR/EDITAR */}
      {modal && (
        <div style={s.overlay}>
          <div style={s.modalCard}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>{modal.modo === 'crear' ? 'Nuevo cliente' : 'Editar cliente'}</h3>
              <button style={s.btnCerrar} onClick={() => setModal(null)}>✕</button>
            </div>
            <div style={s.formGrid}>
              <Field label="Nombre *" value={modal.datos.nombre} onChange={v => setModal(m => ({ ...m, datos: { ...m.datos, nombre: v } }))} />
              <Field label="Apellidos" value={modal.datos.apellidos} onChange={v => setModal(m => ({ ...m, datos: { ...m.datos, apellidos: v } }))} />
              <Field label="Teléfono" value={modal.datos.telefono} onChange={v => setModal(m => ({ ...m, datos: { ...m.datos, telefono: v } }))} />
              <Field label="Email" value={modal.datos.email} onChange={v => setModal(m => ({ ...m, datos: { ...m.datos, email: v } }))} />
              <Field label="Domicilio" value={modal.datos.domicilio1} onChange={v => setModal(m => ({ ...m, datos: { ...m.datos, domicilio1: v } }))} span={2} />
              <Field label="Colonia" value={modal.datos.colonia} onChange={v => setModal(m => ({ ...m, datos: { ...m.datos, colonia: v } }))} />
              <Field label="Municipio" value={modal.datos.municipio} onChange={v => setModal(m => ({ ...m, datos: { ...m.datos, municipio: v } }))} />
              <Field label="Estado" value={modal.datos.estado_residencia} onChange={v => setModal(m => ({ ...m, datos: { ...m.datos, estado_residencia: v } }))} />
              <Field label="Notas" value={modal.datos.notas} onChange={v => setModal(m => ({ ...m, datos: { ...m.datos, notas: v } }))} span={2} />
              <Field label="Límite de crédito ($)" value={modal.datos.limite_credito} onChange={v => setModal(m => ({ ...m, datos: { ...m.datos, limite_credito: v } }))} type="number" />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 20 }}>
                <input type="checkbox" id="cred" checked={modal.datos.credito_habilitado}
                  onChange={e => setModal(m => ({ ...m, datos: { ...m.datos, credito_habilitado: e.target.checked } }))} />
                <label htmlFor="cred" style={{ fontSize: 13 }}>Crédito habilitado</label>
              </div>
            </div>
            {error && <p style={s.errorMsg}>{error}</p>}
            <div style={s.modalFooter}>
              <button style={s.btnCancelar} onClick={() => setModal(null)}>Cancelar</button>
              <button style={s.btnGuardar} onClick={guardar} disabled={guardando}>
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ESTADO DE CUENTA */}
      {estadoCuenta && (
        <div style={s.overlay}>
          <div style={{ ...s.modalCard, width: 600, maxHeight: '85vh' }}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>Estado de cuenta — {estadoCuenta.nombre}</h3>
              <button style={s.btnCerrar} onClick={() => setEstadoCuenta(null)}>✕</button>
            </div>
            {estadoCuenta.cargando ? (
              <p style={{ textAlign: 'center', padding: 40, color: '#6B7280' }}>Cargando...</p>
            ) : estadoCuenta.error ? (
              <p style={{ color: '#DC2626', padding: 20 }}>{estadoCuenta.error}</p>
            ) : (
              <EstadoCuenta datos={estadoCuenta} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', span = 1 }) {
  return (
    <div style={{ gridColumn: `span ${span}` }}>
      <label style={s.fieldLabel}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={s.fieldInput}
      />
    </div>
  )
}

function EstadoCuenta({ datos }) {
  const { cliente, creditos = [], abonos = [] } = datos
  const saldo = parseFloat(cliente?.saldo_actual || 0)
  return (
    <div style={{ overflow: 'auto', flex: 1 }}>
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={s.statCard}>
          <span style={s.statLabel}>Saldo pendiente</span>
          <span style={{ ...s.statVal, color: saldo > 0 ? '#DC2626' : '#065F46' }}>
            ${saldo.toFixed(2)}
          </span>
        </div>
        <div style={s.statCard}>
          <span style={s.statLabel}>Límite de crédito</span>
          <span style={s.statVal}>${parseFloat(cliente?.limite_credito || 0).toFixed(2)}</span>
        </div>
      </div>

      {creditos.length > 0 && (
        <>
          <h4 style={s.secTitle}>Créditos</h4>
          <table style={{ ...s.table, marginBottom: 20 }}>
            <thead>
              <tr>
                <th style={s.th}>Fecha</th>
                <th style={s.th}>Cajero</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Monto original</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Saldo</th>
                <th style={s.th}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {creditos.map(cr => (
                <tr key={cr.id} style={s.tr}>
                  <td style={s.td}>{new Date(cr.creado_en).toLocaleDateString('es-MX')}</td>
                  <td style={s.td}>{cr.cajero || '—'}</td>
                  <td style={{ ...s.td, textAlign: 'right' }}>${parseFloat(cr.monto_original).toFixed(2)}</td>
                  <td style={{ ...s.td, textAlign: 'right', color: parseFloat(cr.saldo_pendiente) > 0 ? '#DC2626' : '#065F46', fontWeight: 700 }}>
                    ${parseFloat(cr.saldo_pendiente).toFixed(2)}
                  </td>
                  <td style={s.td}>
                    <span style={{ ...s.badge, ...(cr.estado === 'liquidado' ? s.badgeGreen : s.badgeYellow) }}>
                      {cr.estado}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {abonos.length > 0 && (
        <>
          <h4 style={s.secTitle}>Abonos</h4>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Fecha</th>
                <th style={s.th}>Cajero</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Monto</th>
                <th style={s.th}>Comentarios</th>
              </tr>
            </thead>
            <tbody>
              {abonos.map(a => (
                <tr key={a.id} style={s.tr}>
                  <td style={s.td}>{new Date(a.creado_en).toLocaleDateString('es-MX')}</td>
                  <td style={s.td}>{a.cajero || '—'}</td>
                  <td style={{ ...s.td, textAlign: 'right', color: '#065F46', fontWeight: 600 }}>
                    +${parseFloat(a.monto).toFixed(2)}
                  </td>
                  <td style={{ ...s.td, color: '#6B7280' }}>{a.comentarios || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {creditos.length === 0 && abonos.length === 0 && (
        <p style={{ color: '#9CA3AF', textAlign: 'center', padding: 20 }}>Sin movimientos registrados.</p>
      )}
    </div>
  )
}

const s = {
  pageHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  pageTitle: { fontSize: 22, fontWeight: 700 },
  pageSub: { color: '#6B7280', fontSize: 13, marginTop: 2 },
  btnNuevo: { padding: '8px 16px', background: '#1E3A5F', color: '#FFF', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  controls: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' },
  negocioTabs: { display: 'flex', gap: 4 },
  tabBtn: { padding: '7px 16px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 13, background: '#FFF', color: '#374151', cursor: 'pointer' },
  tabBtnActive: { background: '#1E3A5F', color: '#FFF', borderColor: '#1E3A5F' },
  searchInput: { padding: '7px 12px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 13, width: 260 },
  empty: { padding: 40, textAlign: 'center', color: '#9CA3AF', background: '#FFF', borderRadius: 8, border: '1px solid #E5E7EB' },
  tableWrap: { background: '#FFF', borderRadius: 8, border: '1px solid #E5E7EB', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 14px', background: '#F9FAFB', fontSize: 12, fontWeight: 600, color: '#6B7280', textAlign: 'left', borderBottom: '1px solid #E5E7EB' },
  tr: { borderBottom: '1px solid #F3F4F6' },
  td: { padding: '10px 14px', fontSize: 13, verticalAlign: 'middle' },
  badge: { display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 500 },
  badgeGreen: { background: '#D1FAE5', color: '#065F46' },
  badgeGray: { background: '#F3F4F6', color: '#6B7280' },
  badgeYellow: { background: '#FEF3C7', color: '#92400E' },
  btnVer: { padding: '4px 10px', background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', borderRadius: 4, fontSize: 12, cursor: 'pointer' },
  btnDanger: { background: '#FEF2F2', color: '#DC2626', borderColor: '#FECACA' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modalCard: { background: '#FFF', borderRadius: 10, padding: 28, width: 520, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', maxHeight: '85vh', display: 'flex', flexDirection: 'column', gap: 16 },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: 700, margin: 0 },
  btnCerrar: { background: 'none', border: 'none', fontSize: 18, color: '#9CA3AF', cursor: 'pointer', padding: 4 },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 16px', overflow: 'auto' },
  fieldLabel: { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 },
  fieldInput: { width: '100%', padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' },
  errorMsg: { color: '#DC2626', fontSize: 13, margin: 0 },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: 8 },
  btnCancelar: { padding: '8px 16px', background: '#FFF', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 13, cursor: 'pointer' },
  btnGuardar: { padding: '8px 20px', background: '#1E3A5F', color: '#FFF', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  statCard: { background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 4 },
  statLabel: { fontSize: 12, color: '#6B7280', fontWeight: 600 },
  statVal: { fontSize: 22, fontWeight: 700, color: '#111827' },
  secTitle: { fontSize: 14, fontWeight: 700, color: '#374151', marginBottom: 8, marginTop: 4 },
}
