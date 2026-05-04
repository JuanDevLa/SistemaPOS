import { useState, useRef, forwardRef, useImperativeHandle } from 'react'
import { api } from '../../api'

const CampoBusqueda = forwardRef(function CampoBusqueda({ negocio_id, onAgregarProducto }, ref) {
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState([])
  const [indiceSeleccionado, setIndiceSeleccionado] = useState(-1)
  const inputRef = useRef()

  useImperativeHandle(ref, () => ({
    focus: () => inputRef.current?.focus(),
    limpiar: () => { setBusqueda(''); setResultados([]); setIndiceSeleccionado(-1) }
  }))

  const buscar = async (q) => {
    setBusqueda(q)
    setIndiceSeleccionado(-1)
    if (!q.trim()) { setResultados([]); return }
    const res = await api.buscarProducto(q, negocio_id)
    setResultados(Array.isArray(res) ? res : [])
  }

  const seleccionar = async (producto) => {
    const resultado = await onAgregarProducto(producto)
    if (resultado?.error) return   // el error ya lo muestra VentaScreen vía setMensaje
    setBusqueda('')
    setResultados([])
    setIndiceSeleccionado(-1)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    // Navegación con flechas
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIndiceSeleccionado(prev =>
        prev < resultados.length - 1 ? prev + 1 : prev
      )
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIndiceSeleccionado(prev => prev > 0 ? prev - 1 : -1)
      return
    }

    // Enter solo si hay algo seleccionado
    if (e.key === 'Enter') {
      e.preventDefault()
      if (indiceSeleccionado >= 0 && resultados[indiceSeleccionado]) {
        seleccionar(resultados[indiceSeleccionado])
      } else if (resultados.length === 1) {
        seleccionar(resultados[0])
      } else if (resultados.length > 1) {
        const exacto = resultados.find(p =>
          p.codigo_barras === busqueda.trim() || String(p.id) === busqueda.trim()
        )
        if (exacto) seleccionar(exacto)
      }
    }

    if (e.key === 'Escape') {
      setBusqueda('')
      setResultados([])
      setIndiceSeleccionado(-1)
    }
  }

  return (
    <div className="venta-busqueda-row">
      <label style={s.label}>Código del Producto:</label>
      <div style={s.inputWrap}>
        <input
          ref={inputRef}
          className="pos-input"
          style={s.input}
          type="text"
          placeholder="Escanee o escriba el código del producto..."
          value={busqueda}
          onChange={e => buscar(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          autoComplete="off"
        />
        {resultados.length > 0 && (
          <div className="busqueda-dropdown">
            {resultados.map((p, idx) => (
              <div
                key={p.id}
                className={`busqueda-item ${idx === indiceSeleccionado ? 'busqueda-item-active' : ''}`}
                onClick={() => seleccionar(p)}
              >
                <span className="busqueda-codigo">{p.codigo_barras || '—'}</span>
                <span className="busqueda-nombre">{p.nombre}</span>
                <span className="busqueda-precio">${parseFloat(p.precio).toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <button
        className="pos-btn"
        style={s.btnAgregar}
        onClick={() => indiceSeleccionado >= 0 && seleccionar(resultados[indiceSeleccionado])}
        tabIndex={-1}
      >
        ENTER - Agregar Producto
      </button>
    </div>
  )
})

export default CampoBusqueda

const s = {
  label: {
    fontSize: 12,
    fontWeight: 700,
    color: '#444',
    whiteSpace: 'nowrap',
    flexShrink: 0
  },
  inputWrap: {
    position: 'relative',
    flex: 0.5
  },
  input: {
    width: '100%',
    fontSize: 14,
    padding: '7px 10px'
  },
  btnAgregar: {
    padding: '7px 14px',
    fontSize: 12,
    fontWeight: 700,
    flexShrink: 0
  }
}
