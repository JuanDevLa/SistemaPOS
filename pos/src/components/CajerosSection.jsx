import { useState, useEffect } from 'react'
import { api } from '../api'

const NEGOCIOS_FIJOS = [
  { id: 1, nombre: 'Farmacia Noriega' },
  { id: 2, nombre: 'Crucero Independencia' },
]

const PERMISOS_TABS = {
  ventas: [
    { clave: 'cobrar_ticket',           label: 'Cobrar un ticket' },
    { clave: 'usar_producto_comun',     label: 'Utilizar Producto Común' },
    { clave: 'aplicar_mayoreo',         label: 'Aplicar Mayoreo' },
    { clave: 'aplicar_descuento',       label: 'Aplicar Descuento' },
    { clave: 'historial_ventas',        label: 'Revisar el historial de Ventas' },
    { clave: 'entrada_efectivo',        label: 'Registrar Entradas de Efectivo' },
    { clave: 'salida_efectivo',         label: 'Registrar Salidas de Efectivo' },
    { clave: 'cobrar_credito',          label: 'Cobrar a crédito' },
    { clave: 'cancelar_devolver',       label: 'Cancelar tickets y devolver artículos' },
    { clave: 'eliminar_articulo_venta', label: 'Eliminar artículos de venta' },
    { clave: 'facturar',                label: 'Facturar / Ver Facturas' },
    { clave: 'vender_servicios',        label: 'Vender un pago de servicio' },
    { clave: 'vender_recargas',         label: 'Vender Recargas Electrónicas' },
    { clave: 'buscar_productos',        label: 'Usar buscador de productos' },
  ],
  clientes: [
    { clave: 'clientes_crud',        label: 'Crear, modificar o eliminar clientes' },
    { clave: 'asignar_cliente',      label: 'Asignar cliente a una venta' },
    { clave: 'credito_clientes',     label: 'Asignar o remover crédito a clientes' },
    { clave: 'ver_cuentas_credito',  label: 'Ver estado de cuenta y reportes de crédito' },
  ],
  productos: [
    { clave: 'crear_productos',    label: 'Crear nuevos productos' },
    { clave: 'modificar_productos', label: 'Modificar productos' },
    { clave: 'eliminar_productos', label: 'Eliminar productos' },
    { clave: 'ver_reporte_ventas', label: 'Ver reporte de ventas' },
    { clave: 'crear_promociones',  label: 'Crear promociones' },
    { clave: 'modificar_varios',   label: 'Modificar Varios' },
  ],
  inventario: [
    { clave: 'agregar_mercancia',   label: 'Agregar mercancía' },
    { clave: 'ver_existencias',     label: 'Ver reportes de existencias y mínimos' },
    { clave: 'ver_movimientos_inv', label: 'Ver movimiento de inventarios' },
    { clave: 'ajustar_inventario',  label: 'Ajustar el inventario' },
  ],
  otros: [
    { clave: 'corte_propio',         label: 'Realizar el corte de su turno' },
    { clave: 'corte_todos',          label: 'Realizar el corte de todos los turnos' },
    { clave: 'corte_dia',            label: 'Realizar el corte del día' },
    { clave: 'ver_ganancia_dia',     label: 'Ver la ganancia del día' },
    { clave: 'cambiar_config',       label: 'Cambiar la configuración del programa' },
    { clave: 'ver_reportes',         label: 'Acceder a los reportes de ventas y ganancias' },
    { clave: 'crear_ordenes_compra', label: 'Crear órdenes de compra' },
    { clave: 'recibir_ordenes_compra', label: 'Recibir órdenes de compra' },
  ],
}

const TABS = ['ventas', 'clientes', 'productos', 'inventario', 'otros']
const TAB_LABEL = { ventas: 'Ventas', clientes: 'Clientes', productos: 'Productos', inventario: 'Inventario', otros: 'Otros' }

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
  aplicar_descuento:      true,
  entrada_efectivo:       true,
  cancelar_devolver:      true,
  eliminar_articulo_venta: true,
  agregar_mercancia:      true,
  clientes_crud:          true,
  corte_todos:            true,
  ver_ganancia_dia:       true,
  ver_reportes:           true,
  recibir_ordenes_compra: true,
}

const defaultsPorRol = { cajero: PERMISOS_DEFAULT_CAJERO, supervisor: PERMISOS_DEFAULT_SUPERVISOR }

const formVacio = { nombre: '', pin: '', rol: 'cajero', negocio_id: 1, permisos: { ...PERMISOS_DEFAULT_CAJERO } }

export default function CajerosSection({ onBack }) {
  const [cajeros, setCajeros]           = useState([])
  const [cargando, setCargando]         = useState(true)
  const [busqueda, setBusqueda]         = useState('')
  const [seleccionado, setSeleccionado] = useState(null)
  const [modo, setModo]                 = useState(null)
  const [form, setForm]                 = useState(formVacio)
  const [tabPermisos, setTabPermisos]   = useState('ventas')
  const [guardando, setGuardando]       = useState(false)
  const [error, setError]               = useState('')
  const [mensaje, setMensaje]           = useState('')
  const [confirmGuardar, setConfirmGuardar] = useState(false)
  const [confirmToggle, setConfirmToggle]   = useState(false)

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    setCargando(true)
    try {
      const res = await api.listarUsuarios({ rol: 'cajero' })
      setCajeros(Array.isArray(res) ? res : [])
    } catch {
      setCajeros([])
    }
    setCargando(false)
  }

  const cajerosFiltrados = cajeros.filter(c =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  const abrirNuevo = () => {
    setSeleccionado(null)
    setForm({ ...formVacio, permisos: { ...PERMISOS_DEFAULT_CAJERO } })
    setTabPermisos('ventas')
    setError(''); setMensaje('')
    setModo('nuevo')
  }

  const abrirEditar = (cajero) => {
    setSeleccionado(cajero)
    setForm({
      nombre:     cajero.nombre,
      pin:        '',
      rol:        cajero.rol || 'cajero',
      negocio_id: cajero.negocio_id || 1,
      permisos:   cajero.permisos || {},
    })
    setTabPermisos('ventas')
    setError(''); setMensaje('')
    setModo('editar')
  }

  const cancelar = () => {
    setModo(null); setSeleccionado(null)
    setError(''); setMensaje('')
  }

  const togglePermiso = (clave) => {
    setForm(prev => ({
      ...prev,
      permisos: { ...prev.permisos, [clave]: !prev.permisos[clave] }
    }))
  }

  const guardar = async () => {
    if (!form.nombre.trim()) { setError('El nombre es requerido'); return }
    if (modo === 'nuevo' && !form.pin) { setError('El PIN es requerido'); return }

    setGuardando(true); setError('')

    const data = {
      nombre:     form.nombre.trim(),
      negocio_id: parseInt(form.negocio_id),
      permisos:   form.permisos,
      ...(form.pin && { pin: form.pin }),
      ...(modo === 'nuevo' && { rol: form.rol }),
    }

    try {
      const res = modo === 'nuevo'
        ? await api.crearUsuario(data)
        : await api.editarUsuario(seleccionado.id, data)

      setMensaje(modo === 'nuevo' ? 'Cajero creado correctamente' : 'Cambios guardados')
      setModo(null); setSeleccionado(null)
      cargar()
    } catch(e) {
      setError(e.message)
    }
    setGuardando(false)
  }

  const toggleActivo = async (cajero) => {
    try {
      await api.toggleUsuario(cajero.id)
      await cargar()
    } catch(e) {
      setError(e.message)
    }
  }

  return (
    <div style={s.root}>
      <div style={s.header}>
        <button style={s.btnBack} onClick={onBack}>← Configuración</button>
        <h2 style={s.titulo}>Administración de Cajeros</h2>
      </div>

      <div style={s.split}>
        <div style={s.panelIzq}>
          <input
            style={s.search}
            placeholder="Buscar cajero..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
          <button style={s.btnNuevo} onClick={abrirNuevo}>+ Nuevo Cajero</button>

          <div style={s.lista}>
            {cargando ? (
              <p style={s.listaVacia}>Cargando...</p>
            ) : cajerosFiltrados.length === 0 ? (
              <p style={s.listaVacia}>Sin cajeros registrados</p>
            ) : cajerosFiltrados.map(c => (
              <div
                key={c.id}
                style={{ ...s.listaItem, ...(seleccionado?.id === c.id ? s.listaItemActivo : {}) }}
                onClick={() => abrirEditar(c)}
              >
                <span style={{ fontWeight: 600, fontSize: 13, color: seleccionado?.id === c.id ? '#1E3A5F' : '#111827' }}>
                  {c.nombre}
                </span>
                <span style={{ fontSize: 11, color: '#6B7280' }}>{c.negocio}</span>
                {!c.activo && <span style={s.badgeInactivo}>Inactivo</span>}
              </div>
            ))}
          </div>
        </div>

        <div style={s.panelDer}>
          {!modo ? (
            <div style={s.sinSeleccion}>
              <p style={{ color: '#9CA3AF', fontSize: 14 }}>
                Selecciona un cajero para editar o crea uno nuevo.
              </p>
            </div>
          ) : (
            <>
              <h3 style={s.formTitulo}>{modo === 'nuevo' ? 'NUEVO CAJERO' : `EDITAR: ${seleccionado?.nombre}`}</h3>

              <div style={s.camposRow}>
                <div style={s.campo}>
                  <label style={s.label}>Usuario (nombre)</label>
                  <input style={s.input} value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} autoFocus />
                </div>
                <div style={s.campo}>
                  <label style={s.label}>PIN numérico {modo === 'editar' && '(dejar vacío = sin cambio)'}</label>
                  <input style={s.input} type="password" inputMode="numeric" maxLength={8} value={form.pin} onChange={e => setForm(f => ({ ...f, pin: e.target.value }))} />
                </div>
                {modo === 'nuevo' && (
                  <div style={s.campo}>
                    <label style={s.label}>Rol</label>
                    <select
                      style={s.input}
                      value={form.rol}
                      onChange={e => {
                        const rol = e.target.value
                        setForm(f => ({ ...f, rol, permisos: { ...(defaultsPorRol[rol] || PERMISOS_DEFAULT_CAJERO) } }))
                      }}
                    >
                      <option value="cajero">Cajero</option>
                      <option value="supervisor">Supervisor</option>
                    </select>
                  </div>
                )}
                <div style={s.campo}>
                  <label style={s.label}>Negocio</label>
                  <select style={s.input} value={form.negocio_id} onChange={e => setForm(f => ({ ...f, negocio_id: e.target.value }))}>
                    {NEGOCIOS_FIJOS.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
                  </select>
                </div>
              </div>

              <div style={s.tabsRow}>
                {TABS.map(t => (
                  <button
                    key={t}
                    style={{ ...s.tab, ...(tabPermisos === t ? s.tabActivo : {}) }}
                    onClick={() => setTabPermisos(t)}
                  >
                    {TAB_LABEL[t]}
                  </button>
                ))}
              </div>

              <div style={s.permisosBox}>
                <div style={s.permisosGrid}>
                  {PERMISOS_TABS[tabPermisos].map(p => (
                    <label key={p.clave} style={s.checkLabel}>
                      <input
                        type="checkbox"
                        checked={!!form.permisos[p.clave]}
                        onChange={() => togglePermiso(p.clave)}
                        style={{ marginRight: 6 }}
                      />
                      {p.label}
                    </label>
                  ))}
                </div>
              </div>

              {error && <p style={s.error}>{error}</p>}
              {mensaje && <p style={s.msgOk}>{mensaje}</p>}

              <div style={s.footer}>
                {modo === 'editar' && seleccionado && (
                  <button style={s.btnBaja} onClick={() => setConfirmToggle(true)}>
                    {seleccionado.activo ? 'Dar de baja' : 'Reactivar'}
                  </button>
                )}
                <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                  <button style={s.btnCancelar} onClick={cancelar}>Cancelar</button>
                  <button style={{ ...s.btnGuardar, opacity: guardando ? 0.6 : 1 }} onClick={() => setConfirmGuardar(true)} disabled={guardando}>
                    {guardando ? 'Guardando...' : 'Guardar Cajero y Permisos'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      {/* CONFIRM GUARDAR */}
      {confirmGuardar && (
        <div style={s.overlay}>
          <div style={s.confirmCard}>
            <p style={s.confirmMsg}>
              ¿{modo === 'nuevo' ? 'Crear cajero' : 'Guardar los cambios'} <strong>{form.nombre}</strong>?
            </p>
            <div style={s.confirmBtns}>
              <button style={s.btnCancelar} onClick={() => setConfirmGuardar(false)}>Cancelar</button>
              <button style={s.btnGuardar} onClick={() => { setConfirmGuardar(false); guardar() }}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM TOGGLE */}
      {confirmToggle && seleccionado && (
        <div style={s.overlay}>
          <div style={s.confirmCard}>
            <p style={s.confirmMsg}>
              ¿{seleccionado.activo ? 'Dar de baja' : 'Reactivar'} a <strong>{seleccionado.nombre}</strong>?
              {seleccionado.activo && ' No podrá iniciar sesión.'}
            </p>
            <div style={s.confirmBtns}>
              <button style={s.btnCancelar} onClick={() => setConfirmToggle(false)}>Cancelar</button>
              <button
                style={{ ...s.btnGuardar, background: seleccionado.activo ? '#DC2626' : '#065F46' }}
                onClick={async () => { setConfirmToggle(false); await toggleActivo(seleccionado); cancelar() }}
              >
                {seleccionado.activo ? 'Dar de baja' : 'Reactivar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  root:          { display: 'flex', flexDirection: 'column', height: '100%', padding: 20, color: '#1a1a1a' },
  header:        { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 },
  btnBack:       { background: 'none', border: 'none', color: '#1E3A5F', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '4px 0' },
  titulo:        { fontSize: 18, fontWeight: 700, margin: 0, color: '#1a1a1a' },
  split:         { display: 'flex', gap: 24, flex: 1, minHeight: 0 },
  panelIzq:      { width: 260, display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 },
  search:        { padding: '7px 10px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 13, width: '100%', color: '#1a1a1a' },
  btnNuevo:      { padding: '7px 10px', background: '#1E3A5F', color: '#FFF', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  lista:         { flex: 1, overflowY: 'auto', border: '1px solid #E5E7EB', borderRadius: 6, background: '#FFF' },
  listaVacia:    { textAlign: 'center', color: '#9CA3AF', fontSize: 13, padding: 20 },
  listaItem:     { display: 'flex', flexDirection: 'column', gap: 2, padding: '10px 12px', borderBottom: '1px solid #F3F4F6', cursor: 'pointer' },
  listaItemActivo: { background: '#EFF6FF', borderLeft: '3px solid #1E3A5F' },
  badgeInactivo: { fontSize: 10, background: '#FEE2E2', color: '#991B1B', padding: '1px 5px', borderRadius: 4, alignSelf: 'flex-start' },
  panelDer:      { flex: 1, background: '#FFF', border: '1px solid #E5E7EB', borderRadius: 8, padding: 24, display: 'flex', flexDirection: 'column', overflow: 'auto' },
  sinSeleccion:  { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  formTitulo:    { fontSize: 15, fontWeight: 700, color: '#1E3A5F', marginBottom: 16 },
  camposRow:     { display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' },
  campo:         { display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 160px' },
  label:         { fontSize: 12, fontWeight: 600, color: '#374151' },
  input:         { padding: '8px 10px', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 13, color: '#1a1a1a' },
  tabsRow:       { display: 'flex', gap: 2, borderBottom: '2px solid #E5E7EB' },
  tab:           { padding: '7px 14px', background: 'none', border: 'none', fontSize: 13, color: '#6B7280', cursor: 'pointer', borderBottom: '2px solid transparent', marginBottom: -2 },
  tabActivo:     { color: '#1E3A5F', fontWeight: 700, borderBottomColor: '#1E3A5F' },
  permisosBox:   { border: '1px solid #E5E7EB', borderTop: 'none', borderRadius: '0 0 6px 6px', padding: '14px 16px', marginBottom: 16, background: '#FAFAFA', flex: 1 },
  permisosGrid:  { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px' },
  checkLabel:    { display: 'flex', alignItems: 'center', fontSize: 13, color: '#374151', cursor: 'pointer', userSelect: 'none' },
  error:         { color: '#DC2626', fontSize: 13, marginBottom: 8 },
  msgOk:         { color: '#065F46', fontSize: 13, marginBottom: 8 },
  footer:        { display: 'flex', alignItems: 'center', gap: 8, paddingTop: 12, borderTop: '1px solid #E5E7EB', marginTop: 'auto' },
  btnBaja:       { padding: '8px 14px', background: '#FFF', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 6, fontSize: 13, cursor: 'pointer' },
  btnCancelar:   { padding: '8px 14px', background: '#FFF', color: '#374151', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 13, cursor: 'pointer' },
  btnGuardar:    { padding: '8px 18px', background: '#1E3A5F', color: '#FFF', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  overlay:       { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  confirmCard:   { background: '#FFF', borderRadius: 10, padding: '24px 28px', width: 380, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', color: '#1a1a1a' },
  confirmMsg:    { fontSize: 14, color: '#374151', marginBottom: 20, lineHeight: 1.5 },
  confirmBtns:   { display: 'flex', justifyContent: 'flex-end', gap: 8 },
}
