import { ModalConfigNegocio } from './ModalConfigNegocio'
import { s } from './estilos'

export function ModalPagoServicios({ onClose }) {
  return (
    <ModalConfigNegocio
      titulo="Pago de servicios"
      desc="Usa el mismo proveedor que Recargas electrónicas. Activa el módulo y configura las credenciales en Recargas."
      getVals={cfg => ({ activo_servicios: cfg.activo ?? true })}
      renderCampos={() => (
        <p style={{ fontSize: 13, color: '#6B7280', background: '#F0F7FF', padding: '10px 14px', borderRadius: 6, border: '1px solid #BFDBFE' }}>
          El módulo de Pago de servicios comparte configuración con <strong>Recargas electrónicas</strong>
          (mismo proveedor, misma API key). Actívalo desde esa sección.
        </p>
      )}
      onClose={onClose}
    />
  )
}

export function ModalCompras({ onClose }) {
  return (
    <ModalConfigNegocio
      titulo="Compras / Proveedores"
      desc="Configuración del módulo de órdenes de compra y recepción de mercancía."
      getVals={cfg => ({
        compras_notif_email:          cfg.compras_notif_email          ?? '',
        compras_aprobacion_requerida: cfg.compras_aprobacion_requerida ?? false,
      })}
      renderCampos={(nid, v, set) => (<>
        <div style={{ flex: 1 }}>
          <label style={s.fieldLabel}>Email para notificación de órdenes</label>
          <input style={s.fieldInput} type="email" placeholder="compras@negocio.com"
            value={v.compras_notif_email ?? ''}
            onChange={e => set(nid, 'compras_notif_email', e.target.value)}
            maxLength={100} />
          <p style={{ fontSize: 11, color: '#9CA3AF', margin: '3px 0 0' }}>
            Se notifica al crear y al recibir órdenes de compra
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={s.fieldLabel}>Aprobación</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={v.compras_aprobacion_requerida ?? false}
              onChange={e => set(nid, 'compras_aprobacion_requerida', e.target.checked)} />
            Requerir aprobación de admin
          </label>
        </div>
      </>)}
      onClose={onClose}
    />
  )
}

export function ModalRespaldo({ onClose }) {
  return (
    <ModalConfigNegocio
      titulo="Respaldo automático"
      desc="Configura la frecuencia y el destino del respaldo automático de datos."
      getVals={cfg => ({
        backup_frecuencia: cfg.backup_frecuencia ?? 'semanal',
        backup_email:      cfg.backup_email      ?? '',
      })}
      renderCampos={(nid, v, set) => (<>
        <div>
          <label style={s.fieldLabel}>Frecuencia</label>
          <select style={s.fieldInput} value={v.backup_frecuencia ?? 'semanal'}
            onChange={e => set(nid, 'backup_frecuencia', e.target.value)}>
            <option value="diario">Diario</option>
            <option value="semanal">Semanal</option>
            <option value="mensual">Mensual</option>
            <option value="nunca">Desactivado</option>
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={s.fieldLabel}>Enviar backup a este email</label>
          <input style={s.fieldInput} type="email" placeholder="admin@negocio.com"
            value={v.backup_email ?? ''}
            onChange={e => set(nid, 'backup_email', e.target.value)}
            maxLength={100} />
        </div>
      </>)}
      onClose={onClose}
    />
  )
}
