// Bloque genérico tipo eleventa: título + lista de filas (label / monto, signo opcional)
// Si no hay filas, muestra el `vacio` en gris.
export default function SeccionLista({ titulo, filas = [], vacio = '— Sin movimientos —', total }) {
  return (
    <div style={s.bloque}>
      <div style={s.titulo}>{titulo}</div>
      {filas.length === 0 ? (
        <div style={s.vacio}>{vacio}</div>
      ) : (
        filas.map((f, i) => (
          <div key={i} style={s.fila}>
            <span style={{ color: f.color || '#333' }}>{f.label}</span>
            <span style={{ color: f.color || '#1a1a1a', fontWeight: 600 }}>
              {f.signo || ''}{formatMonto(f.monto)}
            </span>
          </div>
        ))
      )}
      {total !== undefined && (
        <div style={{ ...s.fila, borderTop: '1px solid #ddd', fontWeight: 700, marginTop: 4, paddingTop: 6 }}>
          <span style={{ color: '#1a1a1a' }}>Total</span>
          <span style={{ color: '#1a1a1a' }}>{formatMonto(total)}</span>
        </div>
      )}
    </div>
  )
}

function formatMonto(n) {
  return `$${parseFloat(n || 0).toFixed(2)}`
}

const s = {
  bloque: { marginBottom: 18 },
  titulo: { fontSize: 13, fontWeight: 700, color: '#1E3A5F', borderBottom: '1px solid #BFDBFE', paddingBottom: 4, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  fila:   { display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13, color: '#333' },
  vacio:  { fontSize: 12, color: '#9CA3AF', fontStyle: 'italic', padding: '4px 0' },
}
