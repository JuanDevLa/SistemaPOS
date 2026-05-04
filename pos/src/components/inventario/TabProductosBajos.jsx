import { useEffect, useState } from 'react'
import { api } from '../../api'

const estilos = {
  contenedor: { display: 'flex', flexDirection: 'column', flex: 1, padding: '16px 20px', background: '#f9f9f9', overflowY: 'auto' },
  titulo: { fontSize: 18, fontWeight: 700, color: '#c0392b', marginBottom: 4 },
  subtitulo: { fontSize: 13, color: '#555', marginBottom: 16 },
  cabecera: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  btnPedir: { fontSize: 12, padding: '6px 14px', background: '#1a7a1a', border: 'none', borderRadius: 4, cursor: 'pointer', color: '#fff', fontWeight: 600 },
  btnExportar: { fontSize: 12, padding: '5px 12px', background: '#fff', border: '1px solid #aaa', borderRadius: 4, cursor: 'pointer', color: '#333' },
  tabla: { width: '100%', borderCollapse: 'collapse', fontSize: 13, background: '#fff' },
  th: { background: '#e8e8e8', padding: '7px 10px', textAlign: 'left', fontWeight: 600, color: '#333', borderBottom: '1px solid #ccc' },
  td: { padding: '6px 10px', borderBottom: '1px solid #eee', color: '#1a1a1a' },
  tdRojo: { padding: '6px 10px', borderBottom: '1px solid #eee', color: '#c0392b', fontWeight: 700 },
  filaActiva: { background: '#3498db', color: '#fff' },
  vacio: { padding: 40, textAlign: 'center', color: '#888', fontSize: 14 },
  cargando: { padding: 40, textAlign: 'center', color: '#555', fontSize: 14 },
}

export default function TabProductosBajos({ usuario, onPedirProducto }) {
  const [productos, setProductos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [seleccionado, setSeleccionado] = useState(null)

  useEffect(() => {
    cargar()
  }, [])

  const cargar = async () => {
    setCargando(true)
    setError(null)
    try {
      const data = await api.stockBajo(usuario.negocio_id)
      setProductos(data)
    } catch(e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }

  const exportarCSV = () => {
    const filas = [
      ['Codigo', 'Descripcion', 'Precio Venta', 'Departamento', 'Existencia', 'Inv. Minimo', 'Inv. Maximo'],
      ...productos.map(p => [
        p.codigo_barras || '',
        p.nombre,
        parseFloat(p.precio || 0).toFixed(2),
        p.departamento || 'Sin Departamento',
        p.cantidad,
        p.alerta_minima,
        p.maximo ?? 0,
      ])
    ]
    const csv = filas.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'productos_bajos.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (cargando) return <div style={estilos.cargando}>Cargando...</div>
  if (error) return <div style={{ ...estilos.cargando, color: '#c0392b' }}>{error}</div>

  return (
    <div style={estilos.contenedor}>
      <div style={estilos.cabecera}>
        <div>
          <div style={estilos.titulo}>PRODUCTOS BAJOS EN INVENTARIO</div>
          <div style={estilos.subtitulo}>A continuación se muestra un listado con los productos con inventario debajo de su mínimo:</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {seleccionado && (
            <button style={estilos.btnPedir} onClick={() => {
              const p = productos.find(prod => prod.producto_id === seleccionado)
              onPedirProducto?.(p)
            }}>
              Pedir este producto
            </button>
          )}
          <button style={estilos.btnExportar} onClick={exportarCSV}>Exportar a Excel</button>
        </div>
      </div>

      {productos.length === 0 ? (
        <div style={estilos.vacio}>No hay productos con stock bajo</div>
      ) : (
        <table style={estilos.tabla}>
          <thead>
            <tr>
              <th style={estilos.th}>Codigo</th>
              <th style={estilos.th}>Descripción del Producto</th>
              <th style={estilos.th}>Precio Venta</th>
              <th style={estilos.th}>Departamento</th>
              <th style={estilos.th}>Existencia</th>
              <th style={estilos.th}>Inv. Mínimo</th>
              <th style={estilos.th}>Inv. Máximo</th>
            </tr>
          </thead>
          <tbody>
            {productos.map((p, i) => {
              const activo = seleccionado === p.producto_id
              const bg = activo ? '#3498db' : (i % 2 === 0 ? '#fff' : '#f5f5f5')
              const color = activo ? '#fff' : '#1a1a1a'
              const colorRojo = activo ? '#fff' : '#c0392b'
              return (
                <tr key={p.producto_id} style={{ background: bg, cursor: 'pointer' }} onClick={() => setSeleccionado(activo ? null : p.producto_id)}>
                  <td style={{ ...estilos.td, color, fontWeight: 600 }}>{p.codigo_barras || '—'}</td>
                  <td style={{ ...estilos.td, color }}>{p.nombre}</td>
                  <td style={{ ...estilos.td, color }}>${parseFloat(p.precio || 0).toFixed(2)}</td>
                  <td style={{ ...estilos.td, color }}>{p.departamento || '- Sin Departamento -'}</td>
                  <td style={{ ...estilos.td, color: activo ? '#fff' : colorRojo, fontWeight: 700 }}>{p.cantidad}</td>
                  <td style={{ ...estilos.td, color }}>{p.alerta_minima}</td>
                  <td style={{ ...estilos.td, color }}>{p.maximo ?? 0}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
