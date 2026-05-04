import { useState, useRef, useEffect } from 'react'
import { X, Check } from 'lucide-react'
import { api } from '../../api'

export default function ModalAsignarCliente({ clienteActual, negocio_id, onSeleccionar, onCerrar }) {
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState([])
  const [error, setError] = useState('')
  const inputRef = useRef()

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const buscar = async (q) => {
    setBusqueda(q)
    setError('')
    if (!q.trim()) {
      setResultados([])
      return
    }
    try {
      const res = await api.buscarClientes(q, negocio_id)
      setResultados(Array.isArray(res) ? res : [])
    } catch (e) {
      setError('Error al buscar clientes')
    }
  }

  const seleccionar = (cliente) => {
    onSeleccionar(cliente)
    onCerrar()
  }

  const limpiarCliente = () => {
    onSeleccionar(null)
    onCerrar()
  }

  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal-dialog" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Asignar Cliente (CTRL+C)</h3>
          <button className="close-btn" onClick={onCerrar}><X size={16} /></button>
        </div>

        <div className="modal-body">
          {clienteActual && (
            <div style={{ padding: '10px', backgroundColor: '#d1fae5', borderRadius: '4px', marginBottom: '12px' }}>
              <p style={{ fontSize: '12px', margin: '0 0 6px 0', fontWeight: '600', color: '#065f46' }}>Cliente seleccionado:</p>
              <p style={{ fontSize: '13px', margin: '0', color: '#065f46' }}>
                <strong>{clienteActual.nombre}</strong>
                {clienteActual.telefono && <span> - {clienteActual.telefono}</span>}
              </p>
            </div>
          )}

          <div className="form-group">
            <label>Buscar cliente</label>
            <input
              ref={inputRef}
              type="text"
              value={busqueda}
              onChange={e => buscar(e.target.value)}
              placeholder="Nombre, teléfono o documento..."
              autoComplete="off"
            />
          </div>

          {resultados.length > 0 && (
            <div style={{ marginTop: '14px' }}>
              <p style={{ fontSize: '12px', fontWeight: '600', color: '#666', marginBottom: '8px' }}>
                {resultados.length} resultado(s)
              </p>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {resultados.map(cliente => (
                  <div
                    key={cliente.id}
                    style={{
                      padding: '10px',
                      borderBottom: '1px solid #f0f0f0',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                    onClick={() => seleccionar(cliente)}
                  >
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: '600', margin: '0 0 3px 0', color: '#1a1a1a' }}>
                        {cliente.nombre}
                      </p>
                      <p style={{ fontSize: '11px', color: '#666', margin: '0' }}>
                        {cliente.telefono} {cliente.documento && `• ${cliente.documento}`}
                      </p>
                    </div>
                    <button className="pos-btn" style={{ padding: '4px 8px', fontSize: '11px' }}>
                      Seleccionar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {busqueda && resultados.length === 0 && (
            <p className="error-msg">No se encontraron clientes</p>
          )}

          {error && <p className="error-msg">{error}</p>}
        </div>

        <div className="modal-footer">
          {clienteActual && (
            <button onClick={limpiarCliente} className="pos-btn" style={{ padding: '6px 10px' }}>
              Limpiar cliente
            </button>
          )}
          <button onClick={onCerrar} className="btn-cancel">Cancelar</button>
        </div>
      </div>
    </div>
  )
}
