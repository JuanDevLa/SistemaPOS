import { useState, useEffect, useRef } from 'react'
import { api } from '../api'
import ModalAutorizacionAdmin from '../components/venta/ModalAutorizacionAdmin'
import { usePermisos } from '../hooks/usePermisos'
import { useFieldNavigation } from '../hooks/useFieldNavigation'
import { exportarCSV } from '../utils/exportarCSV'
import ListaClientes from '../components/clientes/ListaClientes'
import FormularioCliente from '../components/clientes/FormularioCliente'

const FORM_VACIO = {
  nombre: '', apellidos: '', telefono: '', email: '',
  domicilio1: '', domicilio2: '', colonia: '',
  municipio: '', estado_residencia: 'Chiapas', codigo_postal: '',
  notas: '', credito_habilitado: false,
  limite_tipo: 'ilimitado', limite_credito: 0
}

export default function ClientesScreen({ usuario }) {
  const { puede } = usePermisos(usuario)
  const puedeCRUD = puede('clientes_crud')
  const negocio_id = usuario?.negocio_id

  const [clientes, setClientes]                   = useState([])
  const [seleccionado, setSeleccionado]           = useState(null)
  const [form, setForm]                           = useState(null)
  const [formOriginal, setFormOriginal]           = useState(null)
  const [modoNuevo, setModoNuevo]                 = useState(false)
  const [guardando, setGuardando]                 = useState(false)
  const [modalAuthEliminar, setModalAuthEliminar] = useState(false)
  const [busqueda, setBusqueda]                   = useState('')
  const [msg, setMsg]                             = useState('')
  const [montoPendiente, setMontoPendiente]       = useState(0)

  const busquedaRef = useRef()
  const { refs: fieldRefs, focusNext } = useFieldNavigation(() => guardar())

  useEffect(() => { cargar(); nuevoCliente() }, [])

  const cargar = async () => {
    try {
      const res = await api.listarClientes(negocio_id)
      if (Array.isArray(res)) {
        setClientes(res)
        setMontoPendiente(res.reduce((acc, c) => acc + parseFloat(c.saldo_actual || 0), 0))
      }
    } catch (e) { setMsg(e.message || 'Error al cargar clientes') }
  }

  const filtrados = clientes.filter(c =>
    busqueda === '' ||
    c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.apellidos?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.telefono?.includes(busqueda) ||
    String(c.id) === busqueda
  )

  const seleccionar = (c) => {
    setSeleccionado(c); setModoNuevo(false); setMsg('')
    const f = {
      nombre: c.nombre || '', apellidos: c.apellidos || '', telefono: c.telefono || '',
      email: c.email || '', domicilio1: c.domicilio1 || '', domicilio2: c.domicilio2 || '',
      colonia: c.colonia || '', municipio: c.municipio || '',
      estado_residencia: c.estado_residencia || '', codigo_postal: c.codigo_postal || '',
      notas: c.notas || '', credito_habilitado: c.credito_habilitado || false,
      limite_credito: parseFloat(c.limite_credito) || 0,
      limite_tipo: parseFloat(c.limite_credito) > 0 ? 'limitado' : 'ilimitado'
    }
    setForm(f); setFormOriginal(f)
  }

  const nuevoCliente = () => {
    setSeleccionado(null); setModoNuevo(true); setMsg('')
    setForm({ ...FORM_VACIO }); setFormOriginal(null)
  }

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const guardar = async () => {
    if (!form?.nombre?.trim()) { setMsg('El nombre es requerido'); return }
    setGuardando(true); setMsg('')
    const datos = {
      ...form,
      limite_credito: form.limite_tipo === 'ilimitado' ? 0 : parseFloat(form.limite_credito) || 0,
      negocio_id
    }
    try {
      const res = modoNuevo
        ? await api.crearCliente(datos)
        : await api.editarCliente(seleccionado.id, datos)
      if (res?.id) {
        setMsg('Guardado')
        await cargar()
        setModoNuevo(false)
        setSeleccionado(res)
        seleccionar(res)
      } else {
        setMsg(res?.error || 'Error al guardar')
      }
    } catch (e) { setMsg(e.message || 'Error al guardar') }
    setGuardando(false)
  }

  const eliminar = async (overrideToken) => {
    if (!seleccionado) return
    try {
      await api.eliminarCliente(seleccionado.id, overrideToken)
      setModalAuthEliminar(false)
      setSeleccionado(null); setForm(null); setFormOriginal(null); setMsg('')
      await cargar()
    } catch (e) { setMsg(e.message || 'Error al eliminar') }
  }

  const onExportar = () => {
    exportarCSV([
      ['Folio', 'Nombre', 'Apellidos', 'Teléfono', 'Email', 'Saldo', 'Crédito habilitado'],
      ...filtrados.map(c => [
        c.id, c.nombre || '', c.apellidos || '', c.telefono || '', c.email || '',
        parseFloat(c.saldo_actual || 0).toFixed(2), c.credito_habilitado ? 'Sí' : 'No'
      ])
    ], 'clientes.csv')
  }

  return (
    <div style={s.root}>
      <div style={s.cabecera}>
        <h2 style={s.titulo}>ADMINISTRACION DE CLIENTES</h2>
        <p style={s.subtitulo}>Administra a todos los clientes de tu negocio (crédito, facturación, etc.) de forma centralizada.</p>
      </div>

      <div style={s.toolbar}>
        <div style={s.toolbarBtns}>
          <button
            style={{ ...s.tbBtn, ...s.tbBtnPrimary, ...(modoNuevo ? s.tbBtnPressed : {}), ...(!puedeCRUD ? s.tbBtnDis : {}) }}
            disabled={!puedeCRUD}
            onClick={() => puedeCRUD ? nuevoCliente() : setMsg('Sin permiso: crear/editar clientes')}
          >
            <span style={s.tbBtnIcon}>👤</span> Nuevo Cliente
          </button>
          <button
            style={{ ...s.tbBtn, ...((!seleccionado || modoNuevo || !puedeCRUD) ? s.tbBtnDis : {}) }}
            disabled={!seleccionado || modoNuevo || !puedeCRUD}
            onClick={() => seleccionado && !modoNuevo && puedeCRUD && setModalAuthEliminar(true)}
          >
            <span style={s.tbBtnIcon}>✕</span> Eliminar
          </button>
          <button
            style={{ ...s.tbBtn, ...((!form || !puedeCRUD) ? s.tbBtnDis : {}) }}
            disabled={!form || !puedeCRUD}
            onClick={form && puedeCRUD ? guardar : undefined}
          >
            <span style={s.tbBtnIcon}>✓</span> Guardar
          </button>
        </div>
      </div>

      <div style={s.contenido}>
        <ListaClientes
          filtrados={filtrados}
          seleccionado={seleccionado}
          onSeleccionar={seleccionar}
          busqueda={busqueda}
          onBuscar={setBusqueda}
          busquedaRef={busquedaRef}
          onExportar={onExportar}
        />
        <FormularioCliente
          form={form}
          formOriginal={formOriginal}
          modoNuevo={modoNuevo}
          seleccionado={seleccionado}
          guardando={guardando}
          msg={msg}
          set={set}
          guardar={guardar}
          fieldRefs={fieldRefs}
          focusNext={focusNext}
        />
      </div>

      <div style={s.footerBar}>
        <span style={s.footerLabel}>Monto Pendiente:</span>
        <span style={s.footerMonto}>${parseFloat(montoPendiente).toFixed(2)}</span>
      </div>

      {modalAuthEliminar && (
        <ModalAutorizacionAdmin
          permiso="clientes_crud"
          negocio_id={usuario?.negocio_id}
          onConfirmar={token => eliminar(token)}
          onCancelar={() => setModalAuthEliminar(false)}
        />
      )}
    </div>
  )
}

const s = {
  root:         { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', background: '#fff', fontFamily: 'Segoe UI, Tahoma, Arial, sans-serif', fontSize: 12, position: 'relative' },
  cabecera:     { padding: '10px 14px 6px', borderBottom: '1px solid #d0d0d0', background: '#fff' },
  titulo:       { margin: 0, fontSize: 15, fontWeight: 700, color: '#222', letterSpacing: '0.3px' },
  subtitulo:    { margin: '2px 0 0', fontSize: 11, color: '#666' },
  toolbar:      { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: '#f0f0f0', borderBottom: '1px solid #c8c8c8' },
  toolbarBtns:  { display: 'flex', gap: 4 },
  tbBtn:        { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 12px', fontSize: 12, border: '1px solid #aaa', borderRadius: 2, background: '#e8e8e8', cursor: 'pointer', color: '#333', whiteSpace: 'nowrap' },
  tbBtnPrimary: { background: '#e0eaf5', border: '1px solid #88aacc', color: '#1e3a5f' },
  tbBtnPressed: { background: '#c5daf2', border: '1px solid #5588bb', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.15)' },
  tbBtnDis:     { opacity: 0.45, cursor: 'default' },
  tbBtnIcon:    { fontSize: 13 },
  contenido:    { display: 'flex', flex: 1, overflow: 'hidden' },
  footerBar:    { position: 'absolute', bottom: 0, right: 0, background: '#2a2a2a', color: '#fff', padding: '4px 14px', fontSize: 12, display: 'flex', gap: 8, alignItems: 'center' },
  footerLabel:  { color: '#ccc' },
  footerMonto:  { fontWeight: 700, color: '#fff' },
}
