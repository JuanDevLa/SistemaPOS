import { useState, useEffect } from 'react'
import { api } from '../../api'

export default function TabComprasSugeridas({ usuario, onNuevaEntrada }) {
  const [items, setItems]         = useState([])
  const [cargando, setCargando]   = useState(true)
  const [filtroDep, setFiltroDep] = useState('')
  const [filtroProv, setFiltroProv] = useState('')
  const [seleccionados, setSelec] = useState(new Set())

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    setCargando(true)
    try {
      const res = await api.comprasSugeridas(usuario.negocio_id)
      setItems(Array.isArray(res) ? res : [])
    } catch { setItems([]) }
    finally { setCargando(false) }
  }

  const departamentos = [...new Set(items.map(i => i.departamento).filter(Boolean))]
  const proveedores   = [...new Set(items.map(i => i.proveedor).filter(Boolean))]

  const filtrados = items.filter(i => {
    if (filtroDep  && i.departamento !== filtroDep)  return false
    if (filtroProv && i.proveedor    !== filtroProv)  return false
    return true
  })

  const toggleTodos = () =>
    setSelec(seleccionados.size === filtrados.length
      ? new Set()
      : new Set(filtrados.map(i => i.id)))

  const toggleUno = (id) =>
    setSelec(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const todosMarcados = filtrados.length > 0 && seleccionados.size === filtrados.length

  return (
    <div style={e.shell}>
      <div style={e.titulo}>COMPRAS SUGERIDAS</div>
      <p style={e.desc}>
        Los siguientes productos tienen bajo inventario o bajo su ritmo de venta este agotarse.
        Selecciona aquellos que deseas re-ordenar.
      </p>

      {/* Filtros */}
      <div style={e.filtrosBar}>
        <div style={e.filtroGrupo}>
          <span style={e.filtroLabel}>Filtrar por Departamento</span>
          <select className="pos-input" style={e.select} value={filtroDep} onChange={ev => setFiltroDep(ev.target.value)}>
            <option value="">Todos los departamentos</option>
            {departamentos.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div style={e.filtroGrupo}>
          <span style={e.filtroLabel}>Filtrar por Proveedor</span>
          <select className="pos-input" style={e.select} value={filtroProv} onChange={ev => setFiltroProv(ev.target.value)}>
            <option value="">Todos los proveedores</option>
            {proveedores.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div style={{ flex: 1 }} />
        <button className="pos-btn" onClick={cargar} style={e.btnAccion}>Actualizar</button>
        {onNuevaEntrada && (
          <button className="pos-btn pos-btn-primary" onClick={onNuevaEntrada} style={e.btnAccion}>
            + Nueva Entrada
          </button>
        )}
      </div>

      {/* Tabla */}
      <div style={e.tablaWrap}>
        {cargando ? (
          <div style={e.centro}>Cargando...</div>
        ) : filtrados.length === 0 ? (
          <div style={e.centro}>No hay productos con stock bajo. ¡Todo en orden!</div>
        ) : (
          <table style={e.tabla}>
            <thead>
              <tr>
                <th style={{ ...e.th, width: 30 }}>
                  <input type="checkbox" checked={todosMarcados} onChange={toggleTodos} />
                </th>
                <th style={{ ...e.th, width: 110 }}>Codigo Producto</th>
                <th style={{ ...e.th, textAlign: 'left' }}>Producto</th>
                <th style={{ ...e.th, width: 130 }}>Departamento</th>
                <th style={{ ...e.th, width: 80 }}>Existencia</th>
                <th style={{ ...e.th, width: 70 }}>Minimo</th>
                <th style={{ ...e.th, width: 140, textAlign: 'left' }}>Proveedor</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((p, i) => {
                const sel = seleccionados.has(p.id)
                return (
                  <tr key={p.id} style={sel ? e.trSel : i % 2 === 1 ? e.trImpar : undefined}
                    onClick={() => toggleUno(p.id)}>
                    <td style={{ ...e.td, textAlign: 'center' }} onClick={ev => ev.stopPropagation()}>
                      <input type="checkbox" checked={sel} onChange={() => toggleUno(p.id)} />
                    </td>
                    <td style={{ ...e.td, fontFamily: 'monospace', fontSize: 11 }}>{p.codigo_barras || '—'}</td>
                    <td style={{ ...e.td, textAlign: 'left', fontWeight: 600 }}>{p.nombre}</td>
                    <td style={e.td}>{p.departamento || '- Sin Departamento -'}</td>
                    <td style={{ ...e.td, textAlign: 'center', color: parseFloat(p.existencia) <= 0 ? '#c00' : '#e07000', fontWeight: 700 }}>
                      {parseFloat(p.existencia)}
                    </td>
                    <td style={{ ...e.td, textAlign: 'center' }}>{parseFloat(p.minimo)}</td>
                    <td style={{ ...e.td, textAlign: 'left', color: '#555' }}>{p.proveedor || '- Sin Proveedor -'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {seleccionados.size > 0 && (
        <div style={e.footer}>
          <span style={e.footerTxt}>{seleccionados.size} producto(s) seleccionado(s)</span>
        </div>
      )}
    </div>
  )
}

const e = {
  shell:       { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', background: '#fff', color: '#1a1a1a' },
  titulo:      { fontSize: 14, fontWeight: 700, color: '#c8860a', padding: '8px 14px 2px' },
  desc:        { fontSize: 12, color: '#555', padding: '0 14px 6px', margin: 0 },
  filtrosBar:  { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12, padding: '6px 14px', borderBottom: '1px solid #e0e0e0', background: '#fafaf8' },
  filtroGrupo: { display: 'flex', alignItems: 'center', gap: 6 },
  filtroLabel: { fontSize: 12, color: '#555', whiteSpace: 'nowrap' },
  select:      { fontSize: 12, padding: '3px 6px', height: 26, minWidth: 160 },
  btnAccion:   { fontSize: 12, padding: '3px 12px', height: 26 },
  tablaWrap:   { flex: 1, overflowY: 'auto', overflowX: 'auto' },
  tabla:       { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
  th:          { padding: '4px 8px', background: '#f0ede5', color: '#333', fontWeight: 600, textAlign: 'center', borderBottom: '2px solid #d8d0c0', position: 'sticky', top: 0, zIndex: 1, whiteSpace: 'nowrap' },
  td:          { padding: '3px 8px', color: '#1a1a1a', borderBottom: '1px solid #eee', textAlign: 'center' },
  trImpar:     { background: '#fffff0' },
  trSel:       { background: '#cce5ff' },
  centro:      { padding: 30, textAlign: 'center', color: '#999', fontSize: 13 },
  footer:      { display: 'flex', alignItems: 'center', padding: '5px 14px', borderTop: '1px solid #ddd', background: '#fafaf8' },
  footerTxt:   { fontSize: 12, color: '#1E3A5F', fontWeight: 600 },
}
