export default function ReporteSaldos({ reporte, cargando, onVerEstado }) {
  return (
    <div style={s.reporteWrap}>
      <div style={s.reporteHeader}>
        <div>
          <div style={{ fontSize: 13, color: '#555' }}>Total de Créditos Pendientes</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#1a7a3a' }}>
            ${reporte ? parseFloat(reporte.total).toFixed(2) : '0.00'}
          </div>
        </div>
        <button style={s.btnImprimir}>Imprimir Reporte</button>
      </div>

      {cargando ? (
        <p style={{ color: '#999', padding: 20 }}>Cargando...</p>
      ) : (
        <div style={s.tablaWrap}>
          <table style={s.tabla}>
            <thead>
              <tr>
                <th style={s.th}>Número</th>
                <th style={s.th}>Nombre / Dirección del Cliente</th>
                <th style={s.th}>Teléfono</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Límite de Crédito</th>
                <th style={{ ...s.th, textAlign: 'right', background: '#d1fae5' }}>Saldo Actual</th>
                <th style={s.th}>Último Pago</th>
              </tr>
            </thead>
            <tbody>
              {reporte?.clientes?.map((c, i) => (
                <tr key={c.id} style={{ ...s.tr, cursor: 'pointer' }} onClick={() => onVerEstado(c)}>
                  <td style={s.td}>{i + 1}</td>
                  <td style={s.td}>
                    <div style={{ fontWeight: 600, color: '#1a1a1a' }}>{c.nombre}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>{c.id}</div>
                  </td>
                  <td style={s.td}>{c.telefono || '—'}</td>
                  <td style={{ ...s.td, textAlign: 'right' }}>${parseFloat(c.limite_credito).toFixed(2)}</td>
                  <td style={{ ...s.td, textAlign: 'right', background: '#d1fae5', fontWeight: 700 }}>
                    ${parseFloat(c.saldo_actual).toFixed(2)}
                  </td>
                  <td style={s.td}>{c.ultimo_pago ? new Date(c.ultimo_pago).toLocaleDateString('es-MX') : '—'}</td>
                </tr>
              ))}
              {(!reporte?.clientes || reporte.clientes.length === 0) && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20, color: '#999' }}>No hay créditos pendientes</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const s = {
  reporteWrap:  { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 16 },
  reporteHeader:{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  btnImprimir:  { padding: '6px 14px', fontSize: 12, border: '1px solid #ccc', borderRadius: 4, background: '#fff', cursor: 'pointer', color: '#1a1a1a' },
  tablaWrap:    { flex: 1, overflow: 'auto' },
  tabla:        { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th:           { padding: '8px 10px', background: '#f5f5f5', textAlign: 'left', fontWeight: 600, color: '#555', borderBottom: '1px solid #e0e0e0', whiteSpace: 'nowrap' },
  tr:           { borderBottom: '1px solid #f0f0f0' },
  td:           { padding: '8px 10px', verticalAlign: 'middle', color: '#1a1a1a' },
}
