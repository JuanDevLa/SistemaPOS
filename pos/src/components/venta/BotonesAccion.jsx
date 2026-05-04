import { Package, Star, Search, TrendingUp, ArrowDownCircle, ArrowUpCircle, Trash2, Tag } from 'lucide-react'

const BOTONES = [
  { Icono: Package,         label: 'INS Varios',        id: 'varios',     tecla: 'Ins'    },
  { Icono: Star,            label: 'CTRL+P Art. Común', id: 'artComun',   tecla: 'Ctrl+P' },
  { Icono: Search,          label: 'F10 Buscar',        id: 'buscar',     tecla: 'F10'    },
  { Icono: TrendingUp,      label: 'Ctrl+M Mayoreo',    id: 'mayoreo',    tecla: 'Ctrl+M' },
  { Icono: ArrowDownCircle, label: 'F7 Entradas',       id: 'entradas',   tecla: 'F7'     },
  { Icono: ArrowUpCircle,   label: 'F8 Salidas',        id: 'salidas',    tecla: 'F8'     },
  { Icono: Trash2,          label: 'DEL Borrar Art.',   id: 'borrar',     tecla: 'Del'    },
  { Icono: Tag,             label: 'F9 Verificador',    id: 'verificador', tecla: 'F9'    },
]

export default function BotonesAccion({ onAccion }) {
  return (
    <div className="venta-acciones-row">
      {BOTONES.map(btn => (
        <button
          key={btn.id}
          className="pos-btn"
          style={s.btn}
          onClick={() => onAccion(btn.id)}
          title={`${btn.tecla} — ${btn.label}`}
          tabIndex={-1}
        >
          <btn.Icono size={13} strokeWidth={1.8} style={{ flexShrink: 0 }} />
          <span style={s.texto}>{btn.label}</span>
        </button>
      ))}
    </div>
  )
}

const s = {
  btn:   { padding: '5px 10px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 5 },
  texto: { fontSize: 12 }
}
