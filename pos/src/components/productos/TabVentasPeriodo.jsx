import { useState, useEffect, useCallback } from 'react'
import { api } from '../../api'

const hoy = () => {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

const rangoPeriodo = (periodo) => {
  const ahora = new Date()
  const añoActual = ahora.getFullYear()
  const mesActual = ahora.getMonth()
  const diaActual = ahora.getDate()

  const fmt = (d) => d.toISOString().slice(0, 10)

  switch (periodo) {
    case 'hoy': {
      const h = fmt(ahora)
      return { inicio: h, fin: h }
    }
    case 'ayer': {
      const a = new Date(ahora)
      a.setDate(diaActual - 1)
      const s = fmt(a)
      return { inicio: s, fin: s }
    }
    case 'semana': {
      const dow = ahora.getDay() || 7
      const lun = new Date(ahora)
      lun.setDate(diaActual - dow + 1)
      return { inicio: fmt(lun), fin: hoy() }
    }
    case 'semana_pasada': {
      const dow = ahora.getDay() || 7
      const lun = new Date(ahora)
      lun.setDate(diaActual - dow + 1 - 7)
      const dom = new Date(lun)
      dom.setDate(lun.getDate() + 6)
      return { inicio: fmt(lun), fin: fmt(dom) }
    }
    case 'mes': {
      const inicio = new Date(añoActual, mesActual, 1)
      return { inicio: fmt(inicio), fin: hoy() }
    }
    case 'mes_pasado': {
      const inicio = new Date(añoActual, mesActual - 1, 1)
      const fin = new Date(añoActual, mesActual, 0)
      return { inicio: fmt(inicio), fin: fmt(fin) }
    }
    case 'anio': {
      return { inicio: `${añoActual}-01-01`, fin: hoy() }
    }
    default:
      return null
  }
}

const PERIODOS = [
  { value: '',             label: '- Elegir periodo -' },
  { value: 'hoy',         label: 'Hoy' },
  { value: 'ayer',        label: 'Ayer' },
  { value: 'semana',      label: 'Esta semana' },
  { value: 'semana_pasada', label: 'Semana pasada' },
  { value: 'mes',         label: 'Este mes' },
  { value: 'mes_pasado',  label: 'Mes pasado' },
  { value: 'anio',        label: 'Este año' },
  { value: 'personalizado', label: 'Personalizado' },
]

export default function TabVentasPeriodo({ usuario }) {
  const [periodo, setPeriodo]       = useState('')
  const [inicio, setInicio]         = useState(hoy())
  const [fin, setFin]               = useState(hoy())
  const [productos, setProductos]   = useState([])
  const [totalVendido, setTotal]    = useState(0)
  const [cargando, setCargando]     = useState(false)
  const [error, setError]           = useState('')

  const buscar = useCallback(async (fi, ff) => {
    if (!fi || !ff) return
    setCargando(true)
    setError('')
    try {
      const res = await api.productosVendidos(usuario.negocio_id, fi, ff)
      setProductos(res.productos || [])
      setTotal(res.total_vendido || 0)
    } catch(e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }, [usuario.negocio_id])

  const onPeriodoChange = (valor) => {
    setPeriodo(valor)
    setProductos([])
    setTotal(0)
    setError('')
    if (valor && valor !== 'personalizado') {
      const rango = rangoPeriodo(valor)
      if (rango) {
        setInicio(rango.inicio)
        setFin(rango.fin)
        buscar(rango.inicio, rango.fin)
      }
    }
  }

  return (
    <div style={e.shell}>
      <div style={e.titulo}>REPORTE DE PRODUCTOS VENDIDOS</div>

      {/* Filtros */}
      <div style={e.filtrosBar}>
        <div style={e.filtroGrupo}>
          <span style={e.filtroLabel}>Mostrar ventas de</span>
          <select
            className="pos-input"
            style={e.select}
            value={periodo}
            onChange={ev => onPeriodoChange(ev.target.value)}
          >
            {PERIODOS.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        {periodo === 'personalizado' && (
          <div style={e.filtroGrupo}>
            <span style={e.filtroLabel}>Del</span>
            <input
              type="date"
              className="pos-input"
              style={e.inputFecha}
              value={inicio}
              onChange={ev => setInicio(ev.target.value)}
            />
            <span style={e.filtroLabel}>al</span>
            <input
              type="date"
              className="pos-input"
              style={e.inputFecha}
              value={fin}
              onChange={ev => setFin(ev.target.value)}
            />
            <button
              className="pos-btn pos-btn-primary"
              style={e.btnBuscar}
              onClick={() => buscar(inicio, fin)}
              disabled={cargando}
            >
              {cargando ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
        )}

        <div style={{ flex: 1 }} />

        <div style={e.filtroGrupo}>
          <span style={e.filtroLabel}>De la Caja</span>
          <select className="pos-input" style={e.select}>
            <option>Caja Principal</option>
          </select>
        </div>
      </div>

      {/* Mensaje de error */}
      {error && <div style={e.errorMsg}>{error}</div>}

      {/* Tabla */}
      <div style={e.tablaWrap}>
        <table style={e.tabla}>
          <thead>
            <tr>
              <th style={{ ...e.th, width: 100 }}>Codigo</th>
              <th style={{ ...e.th, textAlign: 'left' }}>Descripcion del Producto</th>
              <th style={{ ...e.th, width: 80 }}>Cantidad</th>
              <th style={{ ...e.th, width: 110 }}>Precio Venta</th>
              <th style={{ ...e.th, width: 160 }}>Departamento</th>
            </tr>
          </thead>
          <tbody>
            {cargando && (
              <tr><td colSpan={5} style={e.tdCentro}>Cargando...</td></tr>
            )}
            {!cargando && productos.length === 0 && (
              <tr><td colSpan={5} style={e.tdCentro}>Sin datos para el periodo seleccionado</td></tr>
            )}
            {productos.map((p, i) => (
              <tr key={i} style={i % 2 === 1 ? e.trImpar : undefined}>
                <td style={{ ...e.td, textAlign: 'center', color: '#555' }}>{p.codigo || '—'}</td>
                <td style={e.td}>{p.descripcion}</td>
                <td style={{ ...e.td, textAlign: 'center' }}>{parseFloat(p.cantidad).toFixed(2)}</td>
                <td style={{ ...e.td, textAlign: 'right' }}>${parseFloat(p.precio_venta).toFixed(2)}</td>
                <td style={e.td}>{p.departamento}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={e.footer}>
        <span style={e.footerLabel}>Total Vendido:</span>
        <span style={e.footerTotal}>${totalVendido.toFixed(2)}</span>
      </div>
    </div>
  )
}

const e = {
  shell: {
    display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden',
    background: '#fff', color: '#1a1a1a',
  },
  titulo: {
    fontSize: 14, fontWeight: 700, color: '#c8860a',
    padding: '8px 14px 6px', borderBottom: '1px solid #e8e0d0',
  },
  filtrosBar: {
    display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 14,
    padding: '7px 14px', borderBottom: '1px solid #e0e0e0', background: '#fafaf8',
  },
  filtroGrupo: {
    display: 'flex', alignItems: 'center', gap: 6,
  },
  filtroLabel: {
    fontSize: 12, color: '#555', whiteSpace: 'nowrap',
  },
  select: {
    fontSize: 12, padding: '3px 6px', height: 26, minWidth: 150,
  },
  inputFecha: {
    fontSize: 12, padding: '3px 6px', height: 26, width: 130,
  },
  btnBuscar: {
    fontSize: 12, padding: '3px 12px', height: 26,
  },
  errorMsg: {
    margin: '6px 14px', fontSize: 12, color: '#c00',
  },
  tablaWrap: {
    flex: 1, overflowY: 'auto',
  },
  tabla: {
    width: '100%', borderCollapse: 'collapse', fontSize: 12,
  },
  th: {
    padding: '5px 10px', background: '#f0ede5', color: '#333',
    fontWeight: 600, textAlign: 'center',
    borderBottom: '2px solid #d8d0c0', position: 'sticky', top: 0, zIndex: 1,
  },
  td: {
    padding: '4px 10px', color: '#1a1a1a',
    borderBottom: '1px solid #eee', textAlign: 'left',
  },
  trImpar: {
    background: '#fffff0',
  },
  tdCentro: {
    padding: '30px', textAlign: 'center', color: '#999', fontSize: 13,
  },
  footer: {
    display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
    gap: 12, padding: '7px 16px', borderTop: '1px solid #ddd',
    background: '#fafaf8',
  },
  footerLabel: {
    fontSize: 13, color: '#555',
  },
  footerTotal: {
    fontSize: 14, fontWeight: 700, color: '#2a7a2a',
  },
}
