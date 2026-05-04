import { useState, useEffect, useRef } from 'react'
import { api } from '../../api'

const formVacio = {
  nombre:         '',
  codigo_barras:  '',
  producto_id:    null,
  precio_normal:  0,
  precio_costo:   0,
  cantidad_desde: '0.00',
  cantidad_hasta: '0.00',
  precio_promo:   '0.00',
}

export default function TabPromociones({ usuario }) {
  const [form, setForm]           = useState(formVacio)
  const [lista, setLista]         = useState([])
  const [seleccionada, setSelec]  = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [error, setError]         = useState('')
  const [mensaje, setMensaje]     = useState('')
  const codigoRef = useRef()

  const cargar = async () => {
    try {
      const res = await api.listarPromociones(usuario.negocio_id)
      setLista(Array.isArray(res) ? res : [])
    } catch(e) { setError(e.message) }
  }

  useEffect(() => {
    cargar()
    codigoRef.current?.focus()
  }, [])

  const set = (campo, valor) => {
    setError(''); setMensaje('')
    setForm(prev => ({ ...prev, [campo]: valor }))
  }

  const buscarProducto = async () => {
    const q = form.codigo_barras.trim()
    if (!q) return
    try {
      const res = await api.buscarProducto(q, usuario.negocio_id)
      const p = Array.isArray(res) ? res[0] : res
      if (!p || !p.id) { setError('Producto no encontrado'); return }
      setForm(prev => ({
        ...prev,
        producto_id:   p.id,
        precio_normal: parseFloat(p.precio) || 0,
        precio_costo:  parseFloat(p.costo) || 0,
        precio_promo:  (parseFloat(p.precio) || 0).toFixed(2),
      }))
      setError('')
    } catch(e) {
      setError(e.message)
    }
  }

  const guardar = async () => {
    if (!form.nombre.trim()) { setError('El nombre de la promocion es requerido'); return }
    if (!form.producto_id)   { setError('Busca un producto por codigo de barras'); return }
    if (parseFloat(form.precio_promo) <= 0) { setError('El precio de promocion debe ser mayor a 0'); return }

    setGuardando(true); setError('')
    try {
      const res = await api.crearPromocion({
        negocio_id:     usuario.negocio_id,
        nombre:         form.nombre.trim(),
        producto_id:    form.producto_id,
        cantidad_desde: parseFloat(form.cantidad_desde) || 0,
        cantidad_hasta: parseFloat(form.cantidad_hasta) || 0,
        precio_promo:   parseFloat(form.precio_promo),
      })
      setMensaje('Promocion guardada correctamente')
      setForm(formVacio)
      await cargar()
      codigoRef.current?.focus()
    } catch(e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  const eliminar = async () => {
    if (!seleccionada) return
    setEliminando(true)
    try {
      await api.eliminarPromocion(seleccionada)
      setSelec(null)
      await cargar()
    } catch(e) {
      setError(e.message)
    } finally {
      setEliminando(false)
    }
  }

  return (
    <div style={e.shell}>
      {/* ---- Formulario ---- */}
      <div style={e.seccion}>
        <div style={e.titulo}>NUEVA PROMOCION</div>

        <div style={e.form}>
          <div style={e.fila}>
            <label style={e.label}>Nombre de la Promocion</label>
            <input
              className="pos-input"
              style={{ ...e.input, width: 320 }}
              value={form.nombre}
              onChange={ev => set('nombre', ev.target.value)}
            />
          </div>

          <div style={e.fila}>
            <label style={e.label}>Codigo de Barras</label>
            <input
              ref={codigoRef}
              className="pos-input"
              style={{ ...e.input, width: 200 }}
              value={form.codigo_barras}
              onChange={ev => set('codigo_barras', ev.target.value)}
              onKeyDown={ev => ev.key === 'Enter' && buscarProducto()}
            />
            <button className="pos-btn" style={e.btnIcono} onClick={buscarProducto} title="Buscar">
              &#128269;
            </button>
          </div>

          <div style={e.fila}>
            <label style={e.label}>Cuando la cantidad vaya desde</label>
            <input
              className="pos-input"
              style={{ ...e.input, width: 80 }}
              type="number" step="0.01" min="0"
              value={form.cantidad_desde}
              onChange={ev => set('cantidad_desde', ev.target.value)}
            />
            <span style={e.separador}>hasta</span>
            <input
              className="pos-input"
              style={{ ...e.input, width: 80 }}
              type="number" step="0.01" min="0"
              value={form.cantidad_hasta}
              onChange={ev => set('cantidad_hasta', ev.target.value)}
            />
          </div>

          <div style={e.fila}>
            <label style={e.label}>Usar precio unitario</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <input
                className="pos-input"
                style={{ ...e.input, width: 110 }}
                type="number" step="0.01" min="0"
                value={form.precio_promo}
                onChange={ev => set('precio_promo', ev.target.value)}
              />
              {form.producto_id && (
                <div style={e.refPrecios}>
                  <span>Precio Normal: <strong>${form.precio_normal.toFixed(2)}</strong></span>
                  <span>Precio Costo: <strong>${form.precio_costo.toFixed(2)}</strong></span>
                </div>
              )}
            </div>
          </div>

          {error   && <div style={e.errorMsg}>{error}</div>}
          {mensaje && <div style={e.okMsg}>{mensaje}</div>}

          <div style={{ marginTop: 10 }}>
            <button
              className="pos-btn pos-btn-primary"
              style={e.btnGuardar}
              onClick={guardar}
              disabled={guardando}
            >
              {guardando ? 'Guardando...' : 'Guardar Nueva Promocion'}
            </button>
          </div>
        </div>
      </div>

      {/* ---- Lista ---- */}
      <div style={e.seccionLista}>
        <div style={e.listaHeader}>
          <div style={e.titulo}>PROMOCIONES VIGENTES</div>
          <button
            className="pos-btn pos-btn-danger"
            style={e.btnEliminar}
            onClick={eliminar}
            disabled={!seleccionada || eliminando}
          >
            {eliminando ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>

        <div style={e.tablaWrap}>
          <table style={e.tabla}>
            <thead>
              <tr>
                <th style={e.th}>Nombre de la Promocion</th>
                <th style={{ ...e.th, width: 130 }}>Codigo Producto</th>
                <th style={{ ...e.th, width: 80 }}>Desde</th>
                <th style={{ ...e.th, width: 80 }}>Hasta</th>
                <th style={{ ...e.th, width: 120 }}>Precio Promocion</th>
              </tr>
            </thead>
            <tbody>
              {lista.length === 0 && (
                <tr><td colSpan={5} style={e.tdCentro}>Sin promociones vigentes</td></tr>
              )}
              {lista.map((p, i) => (
                <tr
                  key={p.id}
                  style={seleccionada === p.id ? e.trSel : i % 2 === 1 ? e.trImpar : undefined}
                  onClick={() => setSelec(seleccionada === p.id ? null : p.id)}
                >
                  <td style={e.td}>{p.nombre}</td>
                  <td style={{ ...e.td, textAlign: 'center', color: '#555' }}>{p.codigo_barras || '—'}</td>
                  <td style={{ ...e.td, textAlign: 'center' }}>{p.cantidad_desde.toFixed(2)}</td>
                  <td style={{ ...e.td, textAlign: 'center' }}>{p.cantidad_hasta.toFixed(2)}</td>
                  <td style={{ ...e.td, textAlign: 'right', fontWeight: 600, color: '#2a7a2a' }}>
                    ${p.precio_promo.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

const e = {
  shell: {
    display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden',
    background: '#fff', color: '#1a1a1a',
  },
  seccion: {
    borderBottom: '1px solid #e0e0e0',
    padding: '8px 0 10px',
  },
  seccionLista: {
    display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden',
  },
  titulo: {
    fontSize: 14, fontWeight: 700, color: '#c8860a',
    padding: '2px 14px 6px',
  },
  form: {
    padding: '0 14px',
    display: 'flex', flexDirection: 'column', gap: 6,
  },
  fila: {
    display: 'flex', alignItems: 'center', gap: 8,
  },
  label: {
    fontSize: 12, color: '#555', minWidth: 200, textAlign: 'right',
  },
  input: {
    fontSize: 12, padding: '3px 6px', height: 26,
  },
  btnIcono: {
    fontSize: 13, padding: '2px 8px', height: 26,
  },
  separador: {
    fontSize: 12, color: '#555',
  },
  refPrecios: {
    display: 'flex', flexDirection: 'column', gap: 1,
    fontSize: 11, color: '#666',
  },
  btnGuardar: {
    fontSize: 12, padding: '4px 16px',
  },
  errorMsg: {
    fontSize: 12, color: '#c00', marginLeft: 208,
  },
  okMsg: {
    fontSize: 12, color: '#2a7a2a', marginLeft: 208,
  },
  listaHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '6px 14px',
  },
  btnEliminar: {
    fontSize: 12, padding: '3px 12px',
  },
  tablaWrap: {
    flex: 1, overflowY: 'auto',
  },
  tabla: {
    width: '100%', borderCollapse: 'collapse', fontSize: 12,
  },
  th: {
    padding: '5px 10px', background: '#f0ede5', color: '#333',
    fontWeight: 600, textAlign: 'left',
    borderBottom: '2px solid #d8d0c0', position: 'sticky', top: 0, zIndex: 1,
  },
  td: {
    padding: '4px 10px', color: '#1a1a1a',
    borderBottom: '1px solid #eee', textAlign: 'left',
  },
  trImpar: { background: '#fffff0' },
  trSel:   { background: '#cce5ff' },
  tdCentro: {
    padding: 24, textAlign: 'center', color: '#999', fontSize: 13,
  },
}
