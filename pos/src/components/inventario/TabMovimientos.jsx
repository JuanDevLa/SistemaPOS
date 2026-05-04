import { useState, useEffect, useMemo } from 'react'
import { api } from '../../api'

const hoy = () => new Date().toISOString().slice(0, 10)
const manana = (fecha) => {
  const d = new Date(fecha)
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

const LABEL_TIPO = {
  venta:         'Venta',
  entrada:       'Entrada',
  ajuste:        'Ajuste',
  carga_inicial: 'Carga inicial',
  merma:         'Merma',
  robo:          'Robo',
  dañado:        'Dañado',
  error_captura: 'Error captura',
}

export default function TabMovimientos({ usuario }) {
  const [movimientos, setMovimientos] = useState([])
  const [cargando, setCargando]       = useState(true)
  const [error, setError]             = useState(null)
  const [fecha, setFecha]             = useState(hoy())
  const [busqueda, setBusqueda]       = useState('')
  const [filtroTipo, setFiltroTipo]   = useState('todos')

  useEffect(() => {
    cargar()
  }, [fecha])

  const cargar = async () => {
    setCargando(true)
    setError(null)
    try {
      const data = await api.movimientosInventario({
        negocio_id: usuario.negocio_id,
        desde: fecha,
        hasta: manana(fecha),
      })
      setMovimientos(Array.isArray(data) ? data : [])
    } catch(e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }

  const tipos = useMemo(() =>
    [...new Set(movimientos.map(m => m.tipo))].sort(),
    [movimientos]
  )

  const filtrados = useMemo(() => {
    const q = busqueda.toLowerCase()
    return movimientos.filter(m => {
      if (filtroTipo !== 'todos' && m.tipo !== filtroTipo) return false
      if (q && !m.producto?.toLowerCase().includes(q) &&
               !m.usuario?.toLowerCase().includes(q) &&
               !m.departamento?.toLowerCase().includes(q)) return false
      return true
    })
  }, [movimientos, busqueda, filtroTipo])

  const exportarCSV = () => {
    const filas = [
      ['Hora', 'Producto', 'Movimiento', 'Habia', 'Tipo', 'Cantidad', 'Hay', 'Cajero', 'Departamento'],
      ...filtrados.map(m => [
        new Date(m.creado_en).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }),
        m.producto,
        m.notas || LABEL_TIPO[m.tipo] || m.tipo,
        m.habia ?? 0,
        LABEL_TIPO[m.tipo] || m.tipo,
        m.cantidad,
        m.hay ?? 0,
        m.usuario || '—',
        m.departamento || '—',
      ])
    ]
    const csv = filas.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `movimientos_${fecha}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={e.contenedor}>
      {/* Cabecera */}
      <div style={e.cabecera}>
        <div style={e.titulo}>HISTORIAL DE MOVIMIENTOS DE INVENTARIO</div>
        <div style={e.filtros}>
          <div style={e.filtroGrupo}>
            <label style={e.filtroLabel}>Del día:</label>
            <input
              type="date"
              className="pos-input"
              style={{ width: 150 }}
              value={fecha}
              onChange={ev => setFecha(ev.target.value)}
            />
          </div>
          <div style={e.filtroGrupo}>
            <label style={e.filtroLabel}>Buscar por:</label>
            <input
              className="pos-input"
              style={{ width: 220 }}
              placeholder="Cajero, Producto o Departamento"
              value={busqueda}
              onChange={ev => setBusqueda(ev.target.value)}
            />
          </div>
          <div style={e.filtroGrupo}>
            <label style={e.filtroLabel}>Movimientos:</label>
            <select className="pos-input" style={{ width: 160 }} value={filtroTipo} onChange={ev => setFiltroTipo(ev.target.value)}>
              <option value="todos">Todos</option>
              {tipos.map(t => <option key={t} value={t}>{LABEL_TIPO[t] || t}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div style={e.tablaWrap}>
        {cargando ? (
          <div style={e.centro}>Cargando...</div>
        ) : error ? (
          <div style={{ ...e.centro, color: '#c02020' }}>{error}</div>
        ) : (
          <table style={e.tabla}>
            <thead>
              <tr style={e.thead}>
                <th style={e.th}>Hora</th>
                <th style={{ ...e.th, textAlign: 'left' }}>Descripción del Producto</th>
                <th style={{ ...e.th, textAlign: 'left' }}>Movimiento</th>
                <th style={e.th}>Había</th>
                <th style={e.th}>Tipo</th>
                <th style={e.th}>Cantidad</th>
                <th style={e.th}>Hay</th>
                <th style={e.th}>Cajero</th>
                <th style={e.th}>Departamento</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={9} style={e.vacio}>
                    No hay registro de movimientos de inventario para el periodo seleccionado
                  </td>
                </tr>
              ) : filtrados.map((m, i) => {
                const esVenta    = m.tipo === 'venta'
                const colorCant  = esVenta ? '#c02020' : m.cantidad > 0 ? '#1a7a1a' : '#1a1a1a'
                return (
                  <tr key={m.id} style={{ background: i % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                    <td style={{ ...e.td, color: '#666', whiteSpace: 'nowrap' }}>
                      {new Date(m.creado_en).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ ...e.td, textAlign: 'left', fontWeight: 500, color: '#1a1a1a' }}>{m.producto}</td>
                    <td style={{ ...e.td, textAlign: 'left', color: '#555', fontSize: 12 }}>{m.notas || LABEL_TIPO[m.tipo] || m.tipo}</td>
                    <td style={{ ...e.td, color: '#555' }}>{m.habia ?? 0}</td>
                    <td style={{ ...e.td, color: '#1a1a1a' }}>{LABEL_TIPO[m.tipo] || m.tipo}</td>
                    <td style={{ ...e.td, fontWeight: 700, color: colorCant }}>{m.cantidad}</td>
                    <td style={{ ...e.td, color: '#1a1a1a' }}>{m.hay ?? 0}</td>
                    <td style={{ ...e.td, color: '#555' }}>{m.usuario || '—'}</td>
                    <td style={{ ...e.td, color: '#555' }}>{m.departamento || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <div style={e.footer}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={e.kitBadge}>KIT</span>
          <span style={{ fontSize: 12, color: '#555' }}>El producto fue vendido dentro de un kit</span>
        </div>
        <button className="pos-btn" style={e.btnFooter} onClick={exportarCSV}>Exportar movimientos...</button>
      </div>
    </div>
  )
}

const e = {
  contenedor: { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', background: '#f9f9f9' },
  cabecera:   { padding: '12px 20px', borderBottom: '1px solid #e0e0e0', background: '#fafafa' },
  titulo:     { fontSize: 16, fontWeight: 700, color: '#1e3a5f', marginBottom: 10 },
  filtros:    { display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-end' },
  filtroGrupo:{ display: 'flex', flexDirection: 'column', gap: 3 },
  filtroLabel:{ fontSize: 12, fontWeight: 600, color: '#555' },
  tablaWrap:  { flex: 1, overflow: 'auto' },
  tabla:      { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  thead:      { background: '#1e3a5f', position: 'sticky', top: 0 },
  th:         { padding: '8px 10px', color: '#fff', fontWeight: 600, textAlign: 'center', whiteSpace: 'nowrap' },
  td:         { padding: '6px 10px', borderBottom: '1px solid #eee', textAlign: 'center', color: '#1a1a1a' },
  vacio:      { padding: 30, textAlign: 'left', color: '#666', fontSize: 13 },
  centro:     { display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, fontSize: 14, color: '#888' },
  footer:     { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', borderTop: '1px solid #ddd', background: '#f0f0f0' },
  kitBadge:   { background: '#6a0dad', color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 3 },
  btnFooter:  { fontSize: 12, padding: '5px 14px', background: '#fff', border: '1px solid #aaa', color: '#333' },
}
