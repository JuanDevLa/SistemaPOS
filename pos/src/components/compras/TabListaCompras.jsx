import { useState, useEffect, useRef } from 'react'
import { api } from '../../api'

const fmtFecha = (f) => new Date(f).toLocaleString('es-MX', {
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit',
})

export default function TabListaCompras({ usuario, onIrAOrdenes, productoPreseleccionado, onProductoAgregado }) {
  const [lista, setLista]             = useState([])
  const [proveedores, setProveedores] = useState([])
  const [filtroDept, setFiltroDept]   = useState('')
  const [seleccionados, setSelec]     = useState(new Set())
  const [cargando, setCargando]       = useState(false)
  const [editandoId, setEditandoId]   = useState(null)
  const [editCantidad, setEditCant]   = useState('')
  const [editProvId, setEditProvId]   = useState('')
  const [mostrarBuscador, setMostrarBuscador] = useState(false)
  const [busqueda, setBusqueda]       = useState('')
  const [resultados, setResultados]   = useState([])
  const [errorBus, setErrorBus]       = useState('')
  const [agregando, setAgregando]     = useState(false)
  const [mensajeOk, setMensajeOk]     = useState('')
  const [productoAgregar, setProductoAgregar] = useState(null)
  const [cantidadAgregar, setCantidadAgregar] = useState('1')
  const cantidadRef = useRef()
  // Modal orden
  const [modalOrden, setModalOrden]   = useState(false)
  const [busqProv, setBusqProv]       = useState('')
  const [provSel, setProvSel]         = useState(null)
  const [creandoOrden, setCreandoOrden] = useState(false)
  const busRef = useRef()
  const [productoAgregadoAhora, setProductoAgregadoAhora] = useState(null)

  const cargar = async () => {
    setCargando(true)
    try {
      const [lst, provs] = await Promise.all([
        api.listarListaCompras(usuario.negocio_id),
        api.listarProveedores(),
      ])
      setLista(Array.isArray(lst) ? lst : [])
      setProveedores(Array.isArray(provs) ? provs : [])
    } catch { setLista([]) }
    finally { setCargando(false) }
  }

  useEffect(() => { cargar() }, [])

  useEffect(() => {
    if (productoPreseleccionado && productoPreseleccionado.id) {
      setAgregando(true)
      api.agregarListaCompras({
        negocio_id:   usuario.negocio_id,
        producto_id:  productoPreseleccionado.id,
        proveedor_id: null,
        cantidad:     Math.ceil((productoPreseleccionado.alerta_minima || 0) - (productoPreseleccionado.cantidad || 0)),
      })
        .then(async () => {
          setProductoAgregadoAhora(productoPreseleccionado.id)
          await cargar()
          onProductoAgregado?.()
        })
        .catch(e => console.error('Error agregando producto:', e))
        .finally(() => setAgregando(false))
    }
  }, [productoPreseleccionado])

  const departamentos = [...new Set(lista.map(i => i.departamento).filter(Boolean))]
  const filtrada = filtroDept ? lista.filter(i => i.departamento === filtroDept) : lista

  const buscar = async (q) => {
    setBusqueda(q)
    if (!q.trim()) { setResultados([]); return }
    try {
      const res = await api.buscarProducto(q, usuario.negocio_id)
      setResultados(Array.isArray(res) ? res : [])
    } catch { setResultados([]) }
  }

  const seleccionarParaAgregar = (p) => {
    setProductoAgregar(p)
    setCantidadAgregar('1')
    setTimeout(() => cantidadRef.current?.select(), 30)
  }

  const confirmarAgregarProducto = async () => {
    if (!productoAgregar) return
    const cantidad = parseInt(cantidadAgregar) || 1
    setAgregando(true); setErrorBus('')
    try {
      await api.agregarListaCompras({
        negocio_id:   usuario.negocio_id,
        producto_id:  productoAgregar.id,
        proveedor_id: productoAgregar.proveedor_id || null,
        cantidad,
      })
      setBusqueda(''); setResultados([])
      setProductoAgregar(null); setCantidadAgregar('1')
      setMostrarBuscador(false)
      await cargar()
    } catch(e) {
      setErrorBus(e.message)
    } finally {
      setAgregando(false)
    }
  }

  const toggleTodos = () =>
    setSelec(seleccionados.size === filtrada.length ? new Set() : new Set(filtrada.map(i => i.id)))

  const toggleUno = (id) =>
    setSelec(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const todosMarcados = filtrada.length > 0 && seleccionados.size === filtrada.length

  const abrirEdicion = (item) => {
    setEditandoId(item.id)
    setEditCant(String(item.cantidad))
    setEditProvId(item.proveedor_id ? String(item.proveedor_id) : '')
  }

  const guardarEdicion = async (id) => {
    try {
      await api.actualizarListaCompras(id, {
        cantidad:     parseFloat(editCantidad) || 1,
        proveedor_id: editProvId ? parseInt(editProvId) : null,
      })
      setEditandoId(null); await cargar()
    } catch { /* silencioso */ }
  }

  const eliminarItem = async (id) => {
    try {
      await api.eliminarListaCompras(id)
      setSelec(prev => { const n = new Set(prev); n.delete(id); return n })
      await cargar()
    } catch { /* silencioso */ }
  }

  const eliminarSeleccionados = async () => {
    for (const id of seleccionados) await api.eliminarListaCompras(id).catch(() => {})
    setSelec(new Set()); await cargar()
  }

  const totalImporte = filtrada
    .filter(i => seleccionados.has(i.id))
    .reduce((s, i) => s + i.importe, 0)

  const proveedoresFiltrados = proveedores.filter(p =>
    !busqProv.trim() || p.nombre.toLowerCase().includes(busqProv.toLowerCase())
  )

  const abrirModalOrden = () => {
    if (seleccionados.size === 0) return
    setBusqProv(''); setProvSel(null); setMensajeOk(''); setModalOrden(true)
  }

  const confirmarOrden = async () => {
    if (!provSel) return
    setCreandoOrden(true)
    try {
      const itemsOrden = [...seleccionados]
        .map(id => lista.find(i => i.id === id))
        .filter(Boolean)

      const res = await api.crearOrdenCompra({
        negocio_id:      usuario.negocio_id,
        proveedor_id:    provSel.id,
        proveedor_nombre: provSel.nombre,
        items: itemsOrden.map(i => ({
          producto_id:    i.producto_id,
          cantidad:       i.cantidad,
          costo_unitario: i.costo || null,
        })),
      })

      for (const id of seleccionados) await api.eliminarListaCompras(id).catch(() => {})

      setSelec(new Set())
      setModalOrden(false)
      await cargar()
      onIrAOrdenes?.()
    } catch(e) {
      alert(e.message)
    } finally {
      setCreandoOrden(false)
    }
  }

  return (
    <div style={e.shell}>
      {/* Cabecera */}
      <div style={e.cabecera}>
        <div>
          <div style={e.titulo}>LISTA DE COMPRAS</div>
          <div style={e.desc}>
            Captura los productos que necesitas resurtir. Cuando esten listos, genera la orden de compra.
          </div>
        </div>
        <div style={e.filtroGrupo}>
          <select className="pos-input" style={e.selectDept}
            value={filtroDept} onChange={ev => setFiltroDept(ev.target.value)}>
            <option value="">Todos los departamentos</option>
            {departamentos.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      {/* Barra de acciones */}
      <div style={e.acciones}>
        <button className="pos-btn pos-btn-primary" style={e.btnAccion}
          onClick={() => { setMostrarBuscador(v => !v); setTimeout(() => busRef.current?.focus(), 50) }}>
          + Agregar...
        </button>
        {seleccionados.size > 0 && (
          <button className="pos-btn pos-btn-danger" style={e.btnAccion} onClick={eliminarSeleccionados}>
            Eliminar ({seleccionados.size})
          </button>
        )}
        {productoAgregadoAhora && (
          <span style={{ fontSize: 12, color: '#1a7a1a', fontWeight: 600, marginLeft: 8, padding: '4px 12px', background: '#D1FAE5', borderRadius: 4 }}>
            ✓ Producto agregado - Solo falta llenar Proveedor y Cantidad
          </span>
        )}
        {mensajeOk && (
          <span style={{ fontSize: 12, color: '#1a7a3a', fontWeight: 600, marginLeft: 8 }}>
            {mensajeOk}
            <button className="pos-btn" style={{ fontSize: 11, padding: '1px 8px', marginLeft: 8 }}
              onClick={onIrAOrdenes}>
              Ver ordenes
            </button>
          </span>
        )}
      </div>

      {/* Buscador desplegable */}
      {mostrarBuscador && (
        <div style={e.buscadorPanel}>
          <input ref={busRef} className="pos-input" style={e.buscadorInput}
            placeholder="Codigo de barras o nombre del producto..."
            value={busqueda}
            onChange={ev => { setErrorBus(''); buscar(ev.target.value) }}
            disabled={agregando} />
          {errorBus && (
            <div style={{ padding: '6px 10px', color: '#c00', fontSize: 12, background: '#FEF2F2', borderRadius: 3 }}>
              {errorBus}
            </div>
          )}
          {agregando && <div style={{ padding: '6px 10px', color: '#555', fontSize: 12 }}>Agregando...</div>}
          {!productoAgregar && resultados.map(p => (
            <div key={p.id} style={{ ...e.resultadoFila, opacity: agregando ? 0.5 : 1 }}
              onClick={() => !agregando && seleccionarParaAgregar(p)}>
              <span style={e.resCod}>{p.codigo_barras || '—'}</span>
              <span style={e.resNom}>{p.nombre}</span>
              <span style={e.resPrc}>${parseFloat(p.precio).toFixed(2)}</span>
            </div>
          ))}
          {productoAgregar && (
            <div style={{ padding: '8px 12px', background: '#EFF6FF', borderTop: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#1e3a5f', flex: 1 }}>{productoAgregar.nombre}</span>
              <label style={{ fontSize: 11, color: '#444' }}>Cantidad:</label>
              <input
                ref={cantidadRef}
                className="pos-input"
                type="number" min="1" step="1"
                style={{ width: 70, fontSize: 13, padding: '3px 6px', textAlign: 'center' }}
                value={cantidadAgregar}
                onChange={ev => setCantidadAgregar(ev.target.value)}
                onKeyDown={ev => { if (ev.key === 'Enter') confirmarAgregarProducto(); if (ev.key === 'Escape') setProductoAgregar(null) }}
              />
              <button className="pos-btn pos-btn-success" style={{ fontSize: 11, padding: '3px 12px' }}
                onClick={confirmarAgregarProducto} disabled={agregando}>
                {agregando ? 'Agregando...' : 'Agregar'}
              </button>
              <button className="pos-btn" style={{ fontSize: 11, padding: '3px 10px' }}
                onClick={() => setProductoAgregar(null)}>✕</button>
            </div>
          )}
          {!productoAgregar && busqueda && resultados.length === 0 && !agregando && (
            <div style={{ padding: '8px 12px', color: '#999', fontSize: 12 }}>Sin resultados</div>
          )}
        </div>
      )}

      {/* Tabla */}
      <div style={e.tablaWrap}>
        {cargando ? (
          <div style={e.centro}>Cargando...</div>
        ) : filtrada.length === 0 ? (
          <div style={e.centro}>La lista esta vacia. Usa "+ Agregar..." para agregar productos a resurtir.</div>
        ) : (
          <table style={e.tabla}>
            <thead>
              <tr>
                <th style={{ ...e.th, width: 30 }}>
                  <input type="checkbox" checked={todosMarcados} onChange={toggleTodos} />
                </th>
                <th style={{ ...e.th, width: 100 }}>Codigo</th>
                <th style={{ ...e.th, textAlign: 'left' }}>Producto</th>
                <th style={{ ...e.th, width: 140 }}>Departamento</th>
                <th style={{ ...e.th, width: 160 }}>Proveedor</th>
                <th style={{ ...e.th, width: 80 }}>Ordenar</th>
                <th style={{ ...e.th, width: 90 }}>Importe</th>
                <th style={{ ...e.th, width: 130 }}>Agregado En</th>
                <th style={{ ...e.th, width: 70 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtrada.map((item, i) => {
                const sel = seleccionados.has(item.id)
                const editando = editandoId === item.id
                const esNuevo = productoAgregadoAhora === item.producto_id
                return (
                  <tr key={item.id}
                    style={esNuevo ? { ...e.trNuevo, outline: '2px solid #1a7a1a' } : sel ? e.trSel : i % 2 === 1 ? e.trImpar : undefined}
                    onDoubleClick={() => abrirEdicion(item)}
                    onClick={() => !editando && toggleUno(item.id)}>
                    <td style={{ ...e.td, textAlign: 'center' }} onClick={ev => ev.stopPropagation()}>
                      <input type="checkbox" checked={sel} onChange={() => toggleUno(item.id)} />
                    </td>
                    <td style={{ ...e.td, fontFamily: 'monospace', fontSize: 11 }}>{item.codigo_barras || '—'}</td>
                    <td style={{ ...e.td, textAlign: 'left', fontWeight: 600 }}>{item.nombre}</td>
                    <td style={e.td}>{item.departamento}</td>
                    <td style={e.td} onClick={ev => editando && ev.stopPropagation()}>
                      {editando ? (
                        <select className="pos-input" style={{ fontSize: 11, padding: '2px 4px', width: '100%' }}
                          value={editProvId} onChange={ev => setEditProvId(ev.target.value)}>
                          <option value="">Sin Proveedor</option>
                          {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                        </select>
                      ) : (
                        <span style={{ color: item.proveedor ? '#1a1a1a' : '#bbb' }}>
                          {item.proveedor || '- Sin Proveedor -'}
                        </span>
                      )}
                    </td>
                    <td style={{ ...e.td, textAlign: 'center' }} onClick={ev => editando && ev.stopPropagation()}>
                      {editando ? (
                        <input className="pos-input"
                          style={{ fontSize: 11, padding: '2px 4px', width: 60, textAlign: 'center' }}
                          type="number" min="0.01" step="1"
                          value={editCantidad}
                          onChange={ev => setEditCant(ev.target.value)}
                          onKeyDown={ev => ev.key === 'Enter' && guardarEdicion(item.id)}
                          autoFocus />
                      ) : (
                        <span style={{ fontWeight: 600 }}>{item.cantidad}</span>
                      )}
                    </td>
                    <td style={{ ...e.td, textAlign: 'right' }}>${item.importe.toFixed(2)}</td>
                    <td style={{ ...e.td, fontSize: 11, color: '#666' }}>{fmtFecha(item.creado_en)}</td>
                    <td style={e.td} onClick={ev => ev.stopPropagation()}>
                      {editando ? (
                        <button className="pos-btn pos-btn-success" style={{ fontSize: 10, padding: '2px 6px' }}
                          onClick={() => guardarEdicion(item.id)}>OK</button>
                      ) : (
                        <>
                          <button className="pos-btn" style={{ fontSize: 10, padding: '2px 5px' }}
                            onClick={() => abrirEdicion(item)}>Editar</button>
                          <button className="pos-btn pos-btn-danger" style={{ fontSize: 10, padding: '2px 5px', marginLeft: 3 }}
                            onClick={() => eliminarItem(item.id)}>✕</button>
                        </>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <div style={e.footer}>
        <span style={e.footerTxt}>
          {lista.length} producto(s) en lista
          {seleccionados.size > 0 && ` · ${seleccionados.size} seleccionado(s) · $${totalImporte.toFixed(2)}`}
        </span>
        <div style={{ flex: 1 }} />
        <button className="pos-btn pos-btn-primary" style={e.btnCrear}
          disabled={seleccionados.size === 0} onClick={abrirModalOrden}>
          Generar Orden de Compra
        </button>
      </div>

      {/* Modal: Generar orden de compra */}
      {modalOrden && (
        <div style={e.overlay}>
          <div style={e.modal}>
            <div style={e.modalHeader}>
              <span style={e.modalTitulo}>Generar orden de compra — {seleccionados.size} producto(s)</span>
              <button style={e.btnX} onClick={() => setModalOrden(false)}>&#10005;</button>
            </div>
            <div style={e.modalCuerpo}>
              <div style={e.modalDesc}>Selecciona el proveedor al que se enviara la orden:</div>
              <div style={e.provBuscadorRow}>
                <span style={e.lupaIcon}>&#128269;</span>
                <input className="pos-input" style={e.provBuscador}
                  placeholder="Buscar proveedor..." value={busqProv} autoFocus
                  onChange={ev => { setBusqProv(ev.target.value); setProvSel(null) }} />
              </div>
              <div style={e.provLista}>
                <div style={e.provListaHeader}>
                  <span style={e.provColClave}>Clave</span>
                  <span style={e.provColDesc}>Descripcion</span>
                </div>
                <div style={e.provListaBody}>
                  {proveedoresFiltrados.length === 0 ? (
                    <div style={e.provVacio}>Sin proveedores registrados.</div>
                  ) : proveedoresFiltrados.map(p => (
                    <div key={p.id}
                      style={{ ...e.provFila, ...(provSel?.id === p.id ? e.provFilaSel : {}) }}
                      onClick={() => setProvSel(p)}>
                      <span style={{ ...e.provColClave, color: provSel?.id === p.id ? '#fff' : '#444' }}>
                        {p.nombre.slice(0, 6).toUpperCase()}
                      </span>
                      <span style={{ ...e.provColDesc, color: provSel?.id === p.id ? '#fff' : '#1a1a1a' }}>
                        {p.nombre}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={e.modalFooter}>
              <div style={{ flex: 1 }} />
              <button className="pos-btn pos-btn-success" style={e.btnAceptar}
                disabled={!provSel || creandoOrden} onClick={confirmarOrden}>
                {creandoOrden ? 'Creando...' : 'Generar Orden'}
              </button>
              <button className="pos-btn" style={e.btnAceptar}
                onClick={() => setModalOrden(false)} disabled={creandoOrden}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const e = {
  shell:        { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', background: '#fff', color: '#1a1a1a' },
  cabecera:     { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '8px 14px 6px', borderBottom: '1px solid #e0e0e0' },
  titulo:       { fontSize: 14, fontWeight: 700, color: '#c8860a', marginBottom: 3 },
  desc:         { fontSize: 12, color: '#555', maxWidth: 600 },
  filtroGrupo:  { display: 'flex', alignItems: 'center', gap: 6 },
  selectDept:   { fontSize: 12, padding: '3px 6px', height: 26, minWidth: 180 },
  acciones:     { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderBottom: '1px solid #e8e8e8', background: '#fafaf8' },
  btnAccion:    { fontSize: 12, padding: '3px 12px', height: 26 },
  buscadorPanel: { padding: '8px 14px', borderBottom: '1px solid #e0e0e0', background: '#f5f5f3', display: 'flex', flexDirection: 'column', gap: 4 },
  buscadorInput: { fontSize: 12, padding: '4px 8px', width: 340 },
  resultadoFila: { display: 'flex', alignItems: 'center', gap: 10, padding: '5px 8px', background: '#fff', border: '1px solid #e0e0e0', borderRadius: 3, cursor: 'pointer' },
  resCod:       { fontSize: 11, fontFamily: 'monospace', color: '#888', width: 100, flexShrink: 0 },
  resNom:       { flex: 1, fontSize: 12, fontWeight: 500 },
  resPrc:       { fontSize: 12, fontWeight: 700, color: '#1E3A5F' },
  tablaWrap:    { flex: 1, overflowY: 'auto', overflowX: 'auto' },
  tabla:        { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th:           { padding: '4px 8px', background: '#f0ede5', color: '#333', fontWeight: 600, textAlign: 'center', borderBottom: '2px solid #d8d0c0', position: 'sticky', top: 0, zIndex: 1, whiteSpace: 'nowrap' },
  td:           { padding: '4px 8px', color: '#1a1a1a', borderBottom: '1px solid #eee', textAlign: 'center', cursor: 'pointer' },
  trImpar:      { background: '#fffff0' },
  trSel:        { background: '#cce5ff' },
  trNuevo:      { background: '#f0fdf4' },
  centro:       { padding: 30, textAlign: 'center', color: '#999', fontSize: 13 },
  footer:       { display: 'flex', alignItems: 'center', gap: 12, padding: '7px 14px', borderTop: '1px solid #ddd', background: '#fafaf8' },
  footerTxt:    { fontSize: 12, color: '#555' },
  btnCrear:     { fontSize: 12, padding: '4px 18px' },
  overlay:      { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 },
  modal:        { background: '#fff', border: '1px solid #999', borderRadius: 3, width: 420, boxShadow: '0 6px 24px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column' },
  modalHeader:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#1E3A5F', borderRadius: '3px 3px 0 0' },
  modalTitulo:  { fontSize: 13, fontWeight: 700, color: '#fff' },
  btnX:         { background: 'transparent', border: 'none', color: '#fff', fontSize: 14, cursor: 'pointer', padding: '0 4px', lineHeight: 1 },
  modalCuerpo:  { padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 },
  modalDesc:    { fontSize: 12, color: '#444' },
  provBuscadorRow: { display: 'flex', alignItems: 'center', border: '1px solid #bbb', borderRadius: 3, overflow: 'hidden' },
  lupaIcon:     { padding: '0 8px', fontSize: 14, color: '#888', background: '#f0f0f0', borderRight: '1px solid #bbb', lineHeight: '26px', userSelect: 'none' },
  provBuscador: { flex: 1, border: 'none', outline: 'none', fontSize: 12, padding: '3px 8px', background: 'transparent' },
  provLista:    { border: '1px solid #ccc', borderRadius: 3, overflow: 'hidden' },
  provListaHeader: { display: 'flex', background: '#e8e8e8', borderBottom: '1px solid #ccc' },
  provListaBody:{ maxHeight: 180, overflowY: 'auto' },
  provColClave: { width: 80, flexShrink: 0, fontSize: 11, fontWeight: 600, padding: '4px 8px' },
  provColDesc:  { flex: 1, fontSize: 12, padding: '4px 8px' },
  provFila:     { display: 'flex', cursor: 'pointer', borderBottom: '1px solid #eee' },
  provFilaSel:  { background: '#1E3A5F' },
  provVacio:    { padding: 16, textAlign: 'center', color: '#999', fontSize: 12 },
  modalFooter:  { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderTop: '1px solid #e0e0e0', background: '#f5f5f3' },
  btnAceptar:   { fontSize: 12, padding: '4px 16px' },
}
