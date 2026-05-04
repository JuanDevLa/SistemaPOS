import { ModalConfigNegocio } from './ModalConfigNegocio'
import { s } from './estilos'

export function ModalCompras({ onClose }) {
  return (
    <ModalConfigNegocio titulo="Compras / Proveedores"
      desc="Configuración del módulo de órdenes de compra y recepción de mercancía."
      ancho={540}
      getVals={cfg => ({ compras_notif_email: cfg.compras_notif_email ?? '', compras_aprobacion_requerida: cfg.compras_aprobacion_requerida ?? false })}
      renderCampos={(nid, v, set) => (<>
        <div style={{ flex: 1 }}>
          <label style={s.fieldLabel}>Email de notificación de órdenes</label>
          <input style={s.fieldInput} type="email" placeholder="compras@negocio.com"
            value={v.compras_notif_email ?? ''} maxLength={100}
            onChange={e => set(nid, 'compras_notif_email', e.target.value)} />
        </div>
        <div>
          <label style={s.fieldLabel}>Aprobación</label>
          <label style={s.checkLabel}>
            <input type="checkbox" checked={v.compras_aprobacion_requerida ?? false}
              onChange={e => set(nid, 'compras_aprobacion_requerida', e.target.checked)} />
            Requiere admin
          </label>
        </div>
      </>)}
      onClose={onClose} />
  )
}
