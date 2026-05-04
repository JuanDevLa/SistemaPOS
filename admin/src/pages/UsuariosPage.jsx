import { useState, useEffect } from 'react'
import { api } from '../api'

const NEGOCIOS = [
  { id: 1, nombre: 'Farmacia Noriega' },
  { id: 2, nombre: 'Crucero Independencia' },
]

const PERMISOS_TABS = [
  {
    key: 'ventas', label: 'Ventas',
    permisos: [
      { clave: 'usar_producto_comun',   label: 'Utilizar Producto Común' },
      { clave: 'aplicar_mayoreo',       label: 'Aplicar Mayoreo' },
      { clave: 'aplicar_descuento',     label: 'Aplicar Descuento' },
      { clave: 'historial_ventas',      label: 'Revisar historial de Ventas' },
      { clave: 'entrada_efectivo',      label: 'Registrar Entradas de Efectivo' },
      { clave: 'salida_efectivo',       label: 'Registrar Salidas de Efectivo' },
      { clave: 'cobrar_ticket',         label: 'Cobrar un ticket' },
      { clave: 'cobrar_credito',        label: 'Cobrar a crédito' },
      { clave: 'cancelar_devolver',     label: 'Cancelar tickets y devolver artículos' },
      { clave: 'eliminar_articulo_venta', label: 'Eliminar artículos de venta' },
      { clave: 'facturar',              label: 'Facturar / Ver Facturas' },
      { clave: 'vender_servicios',      label: 'Vender un pago de servicio' },
      { clave: 'vender_recargas',       label: 'Vender Recargas Electrónicas' },
      { clave: 'buscar_productos',      label: 'Usar buscador de productos' },
    ],
  },
  {
    key: 'clientes', label: 'Clientes',
    permisos: [
      { clave: 'clientes_crud',       label: 'Crear, modificar o eliminar clientes' },
      { clave: 'asignar_cliente',     label: 'Asignar cliente a una venta' },
      { clave: 'credito_clientes',    label: 'Asignar o remover crédito a clientes' },
      { clave: 'ver_cuentas_credito', label: 'Ver cuenta, recibir abonos y reportes de clientes a crédito' },
    ],
  },
  {
    key: 'productos', label: 'Productos',
    permisos: [
      { clave: 'crear_productos',    label: 'Crear nuevos productos' },
      { clave: 'modificar_productos', label: 'Modificar productos' },
      { clave: 'eliminar_productos', label: 'Eliminar productos' },
      { clave: 'ver_reporte_ventas', label: 'Ver reporte de ventas' },
      { clave: 'crear_promociones',  label: 'Crear promociones' },
      { clave: 'modificar_varios',   label: 'Modificar Varios' },
    ],
  },
  {
    key: 'inventario', label: 'Inventario',
    permisos: [
      { clave: 'agregar_mercancia',    label: 'Agregar mercancía' },
      { clave: 'ver_existencias',      label: 'Ver reportes de existencias y mínimos' },
      { clave: 'ver_movimientos_inv',  label: 'Ver movimiento de inventarios' },
      { clave: 'ajustar_inventario',   label: 'Ajustar el inventario' },
    ],
  },
  {
    key: 'otros', label: 'Otros',
    permisos: [
      { clave: 'corte_propio',          label: 'Realizar el corte de su turno y ver efectivo esperado en caja' },
      { clave: 'corte_todos',           label: 'Realizar el corte de todos los turnos' },
      { clave: 'corte_dia',             label: 'Realizar el corte del día (Todos los turnos)' },
      { clave: 'ver_ganancia_dia',      label: 'Ver la ganancia del día' },
      { clave: 'cambiar_config',        label: 'Cambiar la configuración del programa' },
      { clave: 'ver_reportes',          label: 'Acceder a los reportes de ventas y ganancias' },
      { clave: 'crear_ordenes_compra',  label: 'Crear órdenes de compra' },
      { clave: 'recibir_ordenes_compra', label: 'Recibir órdenes de compra' },
    ],
  },
]

const PERMISOS_DEFAULT_CAJERO = {
  cobrar_ticket:       true,
  usar_producto_comun: true,
  buscar_productos:    true,
  asignar_cliente:     true,
  cobrar_credito:      true,
  historial_ventas:    true,
  vender_recargas:     true,
  ver_existencias:     true,
  ver_cuentas_credito: true,
  corte_propio:        true,
  corte_dia:           true,
}

const PERMISOS_DEFAULT_SUPERVISOR = {
  ...PERMISOS_DEFAULT_CAJERO,
  aplicar_descuento:       true,
  entrada_efectivo:        true,
  cancelar_devolver:       true,
  eliminar_articulo_venta: true,
  agregar_mercancia:       true,
  clientes_crud:           true,
  corte_todos:             true,
  ver_ganancia_dia:        true,
  ver_reportes:            true,
  recibir_ordenes_compra:  true,
}

const defaultsPorRol = { cajero: PERMISOS_DEFAULT_CAJERO, supervisor: PERMISOS_DEFAULT_SUPERVISOR }

const formVacio = {
  nombre: '',
  rol: 'cajero',
  pin: '',
  password: '',
  negocio_id: 1,
  permisos: { ...PERMISOS_DEFAULT_CAJERO },
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(formVacio)
  const [editandoId, setEditandoId] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [confirmToggle, setConfirmToggle] = useState(null)
  const [tabPermisos, setTabPermisos] = useState('ventas')

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    setCargando(true)
    const res = await api.listarUsuarios()
    setUsuarios(Array.isArray(res) ? res : [])
    setCargando(false)
  }

  const cajeros     = usuarios.filter(u => u.rol === 'cajero')
  const supervisores = usuarios.filter(u => u.rol === 'supervisor')
  const admins      = usuarios.filter(u => u.rol === 'admin')

  const abrirNuevo = () => {
    setForm({ ...formVacio, permisos: { ...PERMISOS_DEFAULT_CAJERO } })
    setEditandoId(null)
    setTabPermisos('ventas')
    setError('')
    setModal('form')
  }

  const abrirEditar = (u) => {
    setForm({
      nombre: u.nombre,
      rol: u.rol,
      pin: '',
      password: '',
      negocio_id: u.negocio_id || 1,
      permisos: u.permisos || {},
    })
    setEditandoId(u.id)
    setTabPermisos('ventas')
    setError('')
    setModal('form')
  }

  const cerrarModal = () => {
    setModal(null)
    setEditandoId(null)
    setError('')
  }

  const togglePermiso = (clave, valor) => {
    setForm(f => ({ ...f, permisos: { ...f.permisos, [clave]: valor } }))
  }

  const handleGuardar = async (e) => {
    e.preventDefault()
    if (!form.nombre.trim()) { setError('El nombre es requerido'); return }
    const rolConPin = ['cajero', 'supervisor'].includes(form.rol)
    if (!editandoId) {
      if (rolConPin && !form.pin) { setError('El PIN es requerido'); return }
      if (form.rol === 'admin' && !form.password) { setError('La contraseña es requerida'); return }
    }

    setGuardando(true)
    setError('')

    const res = editandoId
      ? await api.editarUsuario(editandoId, {
          nombre: form.nombre,
          pin: form.pin || undefined,
          password: form.password || undefined,
          negocio_id: rolConPin ? form.negocio_id : undefined,
          permisos: rolConPin ? form.permisos : undefined,
        })
      : await api.crearUsuario(form)

    setGuardando(false)

    if (res.error) {
      setError(res.error)
    } else {
      cerrarModal()
      cargar()
    }
  }

  const handleToggle = async (u) => {
    await api.toggleUsuario(u.id)
    setConfirmToggle(null)
    await cargar()
  }

  const tabActual = PERMISOS_TABS.find(t => t.key === tabPermisos)

  return (
    <div>
      <div style={s.pageHeader}>
        <div>
          <h2 style={s.pageTitle}>Usuarios</h2>
          <p style={s.pageSub}>{cajeros.length} cajero{cajeros.length !== 1 ? 's' : ''} · {supervisores.length} supervisor{supervisores.length !== 1 ? 'es' : ''} · {admins.length} admin{admins.length !== 1 ? 's' : ''}</p>
        </div>
        <button style={s.btnPrimary} onClick={abrirNuevo}>+ Nuevo usuario</button>
      </div>

      {cargando ? (
        <p style={{ color: '#6B7280', padding: 20 }}>Cargando...</p>
      ) : (
        <>
          <div style={s.section}>
            <h3 style={s.sectionTitle}>Administradores</h3>
            <div className="tbl-wrap">
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Nombre</th>
                    <th style={s.th}>Acceso</th>
                    <th style={s.th}>Estado</th>
                    <th style={s.th}></th>
                  </tr>
                </thead>
                <tbody>
                  {admins.length === 0 ? (
                    <tr><td colSpan={4} style={{ ...s.td, color: '#9CA3AF', textAlign: 'center' }}>Sin administradores</td></tr>
                  ) : admins.map(u => (
                    <tr key={u.id} style={s.tr}>
                      <td style={s.td}><strong>{u.nombre}</strong></td>
                      <td style={s.td}><span style={s.rolBadge}>Admin · todos los negocios</span></td>
                      <td style={s.td}>
                        <span style={{ ...s.badge, ...(u.activo ? s.badgeActivo : s.badgeInactivo) }}>
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td style={{ ...s.td, textAlign: 'right' }}>
                        <div style={s.actions}>
                          <button style={s.btnEdit} onClick={() => abrirEditar(u)}>Editar</button>
                          <button style={u.activo ? s.btnDesactivar : s.btnActivar} onClick={() => setConfirmToggle(u)}>
                            {u.activo ? 'Desactivar' : 'Activar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {supervisores.length > 0 && (
            <div style={s.section}>
              <h3 style={s.sectionTitle}>Supervisores</h3>
              <div className="tbl-wrap">
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>Nombre</th>
                      <th style={s.th}>Negocio</th>
                      <th style={s.th}>PIN</th>
                      <th style={s.th}>Estado</th>
                      <th style={s.th}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {supervisores.map(u => (
                      <tr key={u.id} style={s.tr}>
                        <td style={s.td}><strong>{u.nombre}</strong></td>
                        <td style={s.td}>{u.negocio || '—'}</td>
                        <td style={s.td}><span style={s.pin}>••••</span></td>
                        <td style={s.td}>
                          <span style={{ ...s.badge, ...(u.activo ? s.badgeActivo : s.badgeInactivo) }}>
                            {u.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td style={{ ...s.td, textAlign: 'right' }}>
                          <div style={s.actions}>
                            <button style={s.btnEdit} onClick={() => abrirEditar(u)}>Editar</button>
                            <button style={u.activo ? s.btnDesactivar : s.btnActivar} onClick={() => setConfirmToggle(u)}>
                              {u.activo ? 'Desactivar' : 'Activar'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div style={s.section}>
            <h3 style={s.sectionTitle}>Cajeros</h3>
            <div className="tbl-wrap">
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Nombre</th>
                    <th style={s.th}>Negocio</th>
                    <th style={s.th}>PIN</th>
                    <th style={s.th}>Estado</th>
                    <th style={s.th}></th>
                  </tr>
                </thead>
                <tbody>
                  {cajeros.length === 0 ? (
                    <tr><td colSpan={5} style={{ ...s.td, color: '#9CA3AF', textAlign: 'center' }}>Sin cajeros</td></tr>
                  ) : cajeros.map(u => (
                    <tr key={u.id} style={s.tr}>
                      <td style={s.td}><strong>{u.nombre}</strong></td>
                      <td style={s.td}>{u.negocio || '—'}</td>
                      <td style={s.td}><span style={s.pin}>••••</span></td>
                      <td style={s.td}>
                        <span style={{ ...s.badge, ...(u.activo ? s.badgeActivo : s.badgeInactivo) }}>
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td style={{ ...s.td, textAlign: 'right' }}>
                        <div style={s.actions}>
                          <button style={s.btnEdit} onClick={() => abrirEditar(u)}>Editar</button>
                          <button style={u.activo ? s.btnDesactivar : s.btnActivar} onClick={() => setConfirmToggle(u)}>
                            {u.activo ? 'Desactivar' : 'Activar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* MODAL FORM */}
      {modal === 'form' && (
        <div style={s.overlay}>
          <div style={s.modalCard}>
            <h3 style={s.modalTitle}>{editandoId ? 'Editar usuario' : 'Nuevo usuario'}</h3>

            <form onSubmit={handleGuardar} style={s.formCol}>
              <div style={s.field}>
                <label style={s.label}>Nombre</label>
                <input style={s.input} value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} autoFocus />
              </div>

              {!editandoId && (
                <div style={s.field}>
                  <label style={s.label}>Rol</label>
                  <select
                    style={s.input}
                    value={form.rol}
                    onChange={e => {
                      const rol = e.target.value
                      const permisos = defaultsPorRol[rol] ? { ...defaultsPorRol[rol] } : {}
                      setForm(f => ({ ...f, rol, permisos }))
                    }}
                  >
                    <option value="cajero">Cajero</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              )}

              {['cajero', 'supervisor'].includes(form.rol) && (
                <>
                  <div style={s.field}>
                    <label style={s.label}>Negocio</label>
                    <select style={s.input} value={form.negocio_id} onChange={e => setForm(f => ({ ...f, negocio_id: parseInt(e.target.value) }))}>
                      {NEGOCIOS.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
                    </select>
                  </div>
                  <div style={s.field}>
                    <label style={s.label}>{editandoId ? 'Nuevo PIN (dejar vacío para no cambiar)' : 'PIN (4-6 dígitos)'}</label>
                    <input
                      style={s.input}
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={form.pin}
                      onChange={e => setForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, '') }))}
                      placeholder={editandoId ? 'Sin cambios' : '1234'}
                    />
                  </div>

                  {/* PERMISOS */}
                  <div style={s.field}>
                    <label style={s.label}>Permisos</label>
                    <div style={s.permTabBar}>
                      {PERMISOS_TABS.map(t => (
                        <button
                          key={t.key}
                          type="button"
                          style={{ ...s.permTab, ...(tabPermisos === t.key ? s.permTabActivo : {}) }}
                          onClick={() => setTabPermisos(t.key)}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                    <div style={s.permGrid}>
                      {tabActual?.permisos.map(p => (
                        <label key={p.clave} style={s.permItem}>
                          <input
                            type="checkbox"
                            checked={!!form.permisos[p.clave]}
                            onChange={e => togglePermiso(p.clave, e.target.checked)}
                            style={{ marginRight: 6, cursor: 'pointer' }}
                          />
                          <span style={s.permLabel}>{p.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {form.rol === 'admin' && (
                <div style={s.field}>
                  <label style={s.label}>{editandoId ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña'}</label>
                  <input
                    style={s.input}
                    type="password"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder={editandoId ? 'Sin cambios' : ''}
                  />
                </div>
              )}

              {error && <p style={s.errorMsg}>{error}</p>}

              <div style={s.modalFooter}>
                <button type="button" style={s.btnSecondary} onClick={cerrarModal}>Cancelar</button>
                <button type="submit" style={{ ...s.btnPrimary, opacity: guardando ? 0.6 : 1 }} disabled={guardando}>
                  {guardando ? 'Guardando...' : editandoId ? 'Guardar cambios' : 'Crear usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM TOGGLE */}
      {confirmToggle && (
        <div style={s.overlay}>
          <div style={{ ...s.modalCard, width: 380 }}>
            <h3 style={s.modalTitle}>{confirmToggle.activo ? 'Desactivar' : 'Activar'} usuario</h3>
            <p style={{ color: '#374151', marginBottom: 20 }}>
              ¿{confirmToggle.activo ? 'Desactivar' : 'Activar'} a <strong>{confirmToggle.nombre}</strong>?
              {confirmToggle.activo && ' No podrá iniciar sesión.'}
            </p>
            <div style={s.modalFooter}>
              <button style={s.btnSecondary} onClick={() => setConfirmToggle(null)}>Cancelar</button>
              <button
                style={{ ...s.btnPrimary, background: confirmToggle.activo ? '#DC2626' : '#065F46' }}
                onClick={() => handleToggle(confirmToggle)}
              >
                {confirmToggle.activo ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  pageHeader:    { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  pageTitle:     { fontSize: 22, fontWeight: 700 },
  pageSub:       { color: '#6B7280', fontSize: 13, marginTop: 2 },
  section:       { marginBottom: 28 },
  sectionTitle:  { fontSize: 15, fontWeight: 600, marginBottom: 10, color: '#374151' },
  tableWrap:     { background: '#FFF', borderRadius: 8, border: '1px solid #E5E7EB', overflow: 'hidden' },
  table:         { width: '100%', borderCollapse: 'collapse' },
  th:            { padding: '10px 14px', background: '#F9FAFB', fontSize: 12, fontWeight: 600, color: '#6B7280', textAlign: 'left', borderBottom: '1px solid #E5E7EB' },
  tr:            { borderBottom: '1px solid #F3F4F6' },
  td:            { padding: '10px 14px', fontSize: 13, verticalAlign: 'middle' },
  rolBadge:      { fontSize: 12, color: '#6B7280' },
  pin:           { fontFamily: 'monospace', letterSpacing: 2, color: '#9CA3AF' },
  badge:         { display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 500 },
  badgeActivo:   { background: '#D1FAE5', color: '#065F46' },
  badgeInactivo: { background: '#FEE2E2', color: '#991B1B' },
  actions:       { display: 'flex', gap: 6, justifyContent: 'flex-end' },
  btnEdit:       { padding: '4px 10px', background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', borderRadius: 4, fontSize: 12, cursor: 'pointer' },
  btnDesactivar: { padding: '4px 10px', background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 4, fontSize: 12, cursor: 'pointer' },
  btnActivar:    { padding: '4px 10px', background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0', borderRadius: 4, fontSize: 12, cursor: 'pointer' },
  overlay:       { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modalCard:     { background: '#FFF', borderRadius: 10, padding: 28, width: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' },
  modalTitle:    { fontSize: 18, fontWeight: 700, marginBottom: 20 },
  formCol:       { display: 'flex', flexDirection: 'column', gap: 14 },
  field:         { display: 'flex', flexDirection: 'column', gap: 5 },
  label:         { fontSize: 12, fontWeight: 600, color: '#374151' },
  input:         { padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 14 },
  errorMsg:      { color: '#DC2626', fontSize: 13 },
  modalFooter:   { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
  btnPrimary:    { padding: '9px 18px', background: '#1E3A5F', color: '#FFF', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnSecondary:  { padding: '9px 18px', background: '#FFF', color: '#374151', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 14, cursor: 'pointer' },
  // Permisos
  permTabBar:    { display: 'flex', gap: 2, marginBottom: 8, borderBottom: '1px solid #E5E7EB', paddingBottom: 6 },
  permTab:       { padding: '4px 12px', fontSize: 12, fontWeight: 500, color: '#6B7280', background: 'none', border: '1px solid transparent', borderRadius: 4, cursor: 'pointer' },
  permTabActivo: { background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' },
  permGrid:      { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', padding: '8px 10px', background: '#F9FAFB', borderRadius: 6, border: '1px solid #E5E7EB' },
  permItem:      { display: 'flex', alignItems: 'flex-start', gap: 0, cursor: 'pointer', fontSize: 13 },
  permLabel:     { color: '#374151', lineHeight: 1.3 },
}
