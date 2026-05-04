import { useState, useEffect } from 'react'
import TabComprasSugeridas from '../components/compras/TabComprasSugeridas'
import TabListaCompras     from '../components/compras/TabListaCompras'
import TabOrdenesCompra    from '../components/compras/TabOrdenesCompra'
import TabProveedores      from '../components/compras/TabProveedores'
import TabHistorialCompras from '../components/compras/TabHistorialCompras'
import { usePermisos }     from '../hooks/usePermisos'

const TABS = [
  { id: 'sugeridas',   label: 'Compras Sugeridas', permiso: 'crear_ordenes_compra'   },
  { id: 'lista',       label: 'Lista de Compras',  permiso: 'crear_ordenes_compra'   },
  { id: 'ordenes',     label: 'Ordenes de Compra', permiso: 'crear_ordenes_compra'   },
  { id: 'proveedores', label: 'Proveedores',       permiso: 'crear_ordenes_compra'   },
  { id: 'historial',   label: 'Historial',         permiso: 'recibir_ordenes_compra' },
]

export default function ComprasScreen({ usuario, productoPreseleccionado, onProductoAgregado }) {
  const { puede } = usePermisos(usuario)
  const visibles = TABS.filter(t => puede(t.permiso))
  const [tab, setTab] = useState('ordenes')

  useEffect(() => {
    if (productoPreseleccionado) setTab('ordenes')
  }, [productoPreseleccionado])

  useEffect(() => {
    if (!visibles.find(t => t.id === tab)) setTab(visibles[0]?.id ?? '')
  }, [usuario])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      <div className="sub-nav">
        {visibles.map(t => (
          <button key={t.id} className={`sub-nav-btn${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'sugeridas'   && <TabComprasSugeridas usuario={usuario} />}
      {tab === 'lista'       && <TabListaCompras usuario={usuario} onIrAOrdenes={() => setTab('ordenes')} productoPreseleccionado={productoPreseleccionado} onProductoAgregado={onProductoAgregado} />}
      {tab === 'ordenes'     && <TabOrdenesCompra usuario={usuario} productoPreseleccionado={productoPreseleccionado} onProductoAgregado={onProductoAgregado} />}
      {tab === 'proveedores' && <TabProveedores />}
      {tab === 'historial'   && <TabHistorialCompras usuario={usuario} />}
    </div>
  )
}
