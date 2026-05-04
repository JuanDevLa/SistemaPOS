export default function PestanasTickets({ tickets = [], ticketActivo = 1, onCambiar, onNuevo }) {
  return (
    <div className="venta-tickets-row">
      {tickets.map(t => {
        const displayName = t.nombre ? `${t.nombre}` : `Ticket ${t.id}`
        return (
          <div
            key={t.id}
            className={`ticket-tab${ticketActivo === t.id ? ' active' : ''}`}
            onClick={() => onCambiar?.(t.id)}
            title={t.nombre ? t.nombre : `Ticket ${t.id}`}
          >
            🧾 {displayName}
          </div>
        )
      })}
      <div className="ticket-tab-nuevo" onClick={onNuevo} title="Nuevo ticket en espera">
        ＋ Nuevo
      </div>
    </div>
  )
}
