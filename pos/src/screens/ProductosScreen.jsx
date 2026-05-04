import { useState, useEffect } from 'react'
import TabNuevo          from '../components/productos/TabNuevo'
import TabModificar      from '../components/productos/TabModificar'
import TabDepartamentos  from '../components/productos/TabDepartamentos'
import TabCatalogo       from '../components/productos/TabCatalogo'
import TabVentasPeriodo  from '../components/productos/TabVentasPeriodo'
import TabPromociones    from '../components/productos/TabPromociones'
import TabEliminar       from '../components/productos/TabEliminar'
import TabImportar       from '../components/productos/TabImportar'
import { usePermisos }   from '../hooks/usePermisos'

const TABS = [
  { id: 'catalogo',       label: 'Productos',          permiso: null                     },
  { id: 'nuevo',          label: 'Nuevo',              permiso: 'crear_productos'        },
  { id: 'modificar',      label: 'Modificar',          permiso: 'modificar_productos'    },
  { id: 'eliminar',       label: 'Eliminar',           permiso: 'eliminar_productos'     },
  { id: 'departamentos',  label: 'Departamentos',      permiso: null                     },
  { id: 'ventas_periodo', label: 'Ventas por Periodo', permiso: 'ver_reporte_ventas'},
  { id: 'promociones',    label: 'Promociones',        permiso: 'crear_promociones'      },
  { id: 'importar',       label: 'Importar',           permiso: 'crear_productos'        },
]

export default function ProductosScreen({ usuario }) {
  const { puede } = usePermisos(usuario)
  const visibles = TABS.filter(t => !t.permiso || puede(t.permiso))
  const [tab, setTab] = useState(visibles.find(t => t.id === 'nuevo')?.id ?? visibles[0]?.id ?? '')

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

      {tab === 'nuevo'          && <TabNuevo        usuario={usuario} />}
      {tab === 'modificar'      && <TabModificar    usuario={usuario} />}
      {tab === 'eliminar'       && <TabEliminar     usuario={usuario} />}
      {tab === 'departamentos'  && <TabDepartamentos usuario={usuario} />}
      {tab === 'ventas_periodo' && <TabVentasPeriodo usuario={usuario} />}
      {tab === 'promociones'    && <TabPromociones  usuario={usuario} />}
      {tab === 'importar'       && <TabImportar     usuario={usuario} />}
      {tab === 'catalogo'       && <TabCatalogo     usuario={usuario} />}
    </div>
  )
}
