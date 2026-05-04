import { useState, useEffect, useRef } from 'react'
import { X, Check } from 'lucide-react'

export default function ModalCambiarTicket({ tickets, ticketActivo, onSeleccionar, onCancelar }) {
  const [indice, setIndice] = useState(() => tickets.findIndex(t => t.id === ticketActivo))
  const listRef = useRef()

  useEffect(() => {
    listRef.current?.focus()
  }, [])

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIndice(prev => prev < tickets.length - 1 ? prev + 1 : prev)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIndice(prev => prev > 0 ? prev - 1 : prev)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (tickets[indice]) onSeleccionar(tickets[indice].id)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancelar()
    }
  }

  return (
    <div className="modal-overlay" onClick={onCancelar}>
      <div className="modal-dialog" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
        <div className="modal-header">
          <h3>Cambiar Ticket (F5)</h3>
          <button className="close-btn" onClick={onCancelar}><X size={16} /></button>
        </div>

        <div
          className="modal-body"
          ref={listRef}
          tabIndex={0}
          onKeyDown={handleKeyDown}
          style={{ padding: 0, outline: 'none' }}
        >
          {tickets.map((t, idx) => (
            <div
              key={t.id}
              onClick={() => onSeleccionar(t.id)}
              style={{
                padding: '12px 20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                backgroundColor: idx === indice ? '#dbeafe' : t.id === ticketActivo ? '#f0f9ff' : '#fff',
                borderBottom: '1px solid #eee',
                borderLeft: idx === indice ? '3px solid #2563a8' : '3px solid transparent',
                fontWeight: t.id === ticketActivo ? 600 : 400,
              }}
              onMouseEnter={() => setIndice(idx)}
            >
              <span style={{ fontSize: 16 }}>🧾</span>
              <div>
                <div style={{ fontSize: 13 }}>
                  {(typeof t.nombre === 'string' && t.nombre) ? t.nombre : `Ticket ${t.id}`}
                  {t.id === ticketActivo && <span style={{ fontSize: 11, color: '#2563a8', marginLeft: 8 }}>(actual)</span>}
                </div>
                <div style={{ fontSize: 11, color: '#888' }}>
                  {t.carrito.length} producto{t.carrito.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="modal-footer" style={{ fontSize: 11, color: '#999', justifyContent: 'center' }}>
          ↑↓ para navegar · Enter para seleccionar · Esc para cerrar
        </div>
      </div>
    </div>
  )
}
