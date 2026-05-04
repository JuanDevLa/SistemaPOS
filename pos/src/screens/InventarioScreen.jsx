import { useState, useEffect } from 'react'
import TabEntrada            from '../components/inventario/TabEntrada'
import TabAjustes            from '../components/inventario/TabAjustes'
import TabProductosBajos     from '../components/inventario/TabProductosBajos'
import TabReporteInventario  from '../components/inventario/TabReporteInventario'
import TabMovimientos        from '../components/inventario/TabMovimientos'
import TabKardex             from '../components/inventario/TabKardex'
import { usePermisos }       from '../hooks/usePermisos'

const TABS = [
  { id: 'entrada',  label: 'Agregar',     permiso: 'agregar_mercancia'   },
  { id: 'ajustes',  label: 'Ajustes',     permiso: 'ajustar_inventario'  },
  { id: 'bajos',    label: 'Stock Bajo',  permiso: null                  },
  { id: 'reporte',  label: 'Reporte',     permiso: null                  },
  { id: 'movs',     label: 'Movimientos', permiso: null                  },
  { id: 'kardex',   label: 'Kardex',      permiso: null                  },
]

export default function InventarioScreen({ usuario, tabInicial, onSeleccionarProductoCompra }) {
  const { puede } = usePermisos(usuario)
  const visibles = TABS.filter(t => !t.permiso || puede(t.permiso))
  const [tab, setTab] = useState(tabInicial && visibles.find(t => t.id === tabInicial) ? tabInicial : visibles[0]?.id ?? '')

  const handlePedirProducto = (producto) => {
    onSeleccionarProductoCompra?.({ ...producto, id: producto.id ?? producto.producto_id })
  }

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

      {tab === 'entrada'  && <TabEntrada           usuario={usuario} />}
      {tab === 'ajustes'  && <TabAjustes           usuario={usuario} />}
      {tab === 'bajos'    && <TabProductosBajos    usuario={usuario} onPedirProducto={handlePedirProducto} />}
      {tab === 'reporte'  && <TabReporteInventario usuario={usuario} />}
      {tab === 'movs'     && <TabMovimientos       usuario={usuario} />}
      {tab === 'kardex'   && <TabKardex            usuario={usuario} />}
    </div>
  )
}
