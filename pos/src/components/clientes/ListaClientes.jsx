const iniciales = (c) => {
  const p = (c.nombre || '?')[0] || '?'
  const ap = c.apellidos ? c.apellidos[0] : (c.nombre?.[1] || '')
  return (p + ap).toUpperCase()
}

export default function ListaClientes({ filtrados, seleccionado, onSeleccionar, busqueda, onBuscar, busquedaRef, onExportar }) {
  return (
    <div style={s.lista}>
      <div style={s.searchBox}>
        <span style={s.searchIcon}>🔍</span>
        <input
          ref={busquedaRef}
          style={s.searchInput}
          value={busqueda}
          onChange={e => onBuscar(e.target.value)}
          placeholder=""
        />
      </div>

      <div style={s.listaHead}>
        <span style={s.colFolio}>Folio</span>
        <span style={s.colNombre}>Nombre</span>
      </div>

      <div style={s.listaBody}>
        {filtrados.length === 0 && (
          <div style={s.listaEmpty}>{busqueda ? 'Sin resultados' : 'Sin clientes'}</div>
        )}
        {filtrados.map(c => {
          const activo = seleccionado?.id === c.id
          return (
            <div
              key={c.id}
              style={{ ...s.listaFila, ...(activo ? s.listaFilaActiva : {}) }}
              onClick={() => onSeleccionar(c)}
            >
              <div style={{ ...s.avatar, background: activo ? '#4a7fc1' : '#2e6da4' }}>
                {iniciales(c)}
              </div>
              <div style={s.listaInfo}>
                <div style={{ fontWeight: 600, fontSize: 12, color: activo ? '#fff' : '#222' }}>
                  {c.nombre}{c.apellidos ? ' ' + c.apellidos : ''}
                </div>
                <div style={{ fontSize: 11, color: activo ? '#c8dcf0' : '#888' }}>
                  {[c.email, c.telefono].filter(Boolean).join(' - ') || '—'}
                </div>
              </div>
              <div style={{ ...s.colFolio, fontSize: 11, color: activo ? '#c8dcf0' : '#999' }}>
                {c.id}
              </div>
            </div>
          )
        })}
      </div>

      <div style={s.exportar}>
        <button style={s.btnExportar} onClick={onExportar}>Exportar CSV</button>
      </div>
    </div>
  )
}

const s = {
  lista:        { width: 222, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid #d0d0d0', background: '#fff' },
  searchBox:    { display: 'flex', alignItems: 'center', border: '1px solid #bbb', background: '#fff', borderRadius: 2, padding: '3px 6px', margin: '6px 8px' },
  searchIcon:   { fontSize: 12, color: '#888', marginRight: 4 },
  searchInput:  { border: 'none', outline: 'none', fontSize: 12, width: '100%', background: 'transparent', color: '#222' },
  listaHead:    { display: 'flex', alignItems: 'center', padding: '4px 8px', background: '#e8e8e8', borderBottom: '1px solid #ccc', fontWeight: 600, fontSize: 11, color: '#444' },
  colFolio:     { width: 36, flexShrink: 0, textAlign: 'center' },
  colNombre:    { flex: 1, paddingLeft: 4 },
  listaBody:    { flex: 1, overflowY: 'auto' },
  listaEmpty:   { padding: '16px 10px', fontSize: 11, color: '#aaa', textAlign: 'center' },
  listaFila:    { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0', background: '#fff' },
  listaFilaActiva: { background: '#1e3a5f' },
  avatar:       { width: 30, height: 30, borderRadius: '50%', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, flexShrink: 0 },
  listaInfo:    { flex: 1, minWidth: 0 },
  exportar:     { padding: 8, borderTop: '1px solid #e0e0e0' },
  btnExportar:  { width: '100%', padding: '5px 8px', fontSize: 11, border: '1px solid #bbb', borderRadius: 2, background: '#f5f5f5', cursor: 'pointer', color: '#333' },
}
