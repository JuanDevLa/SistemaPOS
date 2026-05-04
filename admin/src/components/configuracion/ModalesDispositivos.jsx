import { ModalConfigNegocio } from './ModalConfigNegocio'
import { s } from './estilos'

export function ModalImpresora({ onClose }) {
  return (
    <ModalConfigNegocio
      titulo="Impresora de tickets"
      desc="Configura los parámetros de impresión. El nombre de la impresora se selecciona desde la aplicación POS en la computadora."
      ancho={580}
      getVals={cfg => ({
        impresora_nombre:      cfg.impresora_nombre      ?? '',
        impresora_corte_auto:  cfg.impresora_corte_auto  ?? true,
        impresora_copias:      cfg.impresora_copias      ?? 1,
      })}
      renderCampos={(nid, v, set) => (<>
        <div style={{ flex: 1 }}>
          <label style={s.fieldLabel}>Nombre de impresora (desde el POS)</label>
          <input style={s.fieldInput} value={v.impresora_nombre ?? ''}
            onChange={e => set(nid, 'impresora_nombre', e.target.value)}
            placeholder="Blackpos WW-5888T" maxLength={100} />
          <p style={{ fontSize: 11, color: '#9CA3AF', margin: '3px 0 0' }}>
            Debe coincidir con el nombre en Windows → Dispositivos e impresoras
          </p>
        </div>
        <div>
          <label style={s.fieldLabel}>Copias por ticket</label>
          <input style={{ ...s.fieldInput, width: 70 }} type="number" min={1} max={5}
            value={v.impresora_copias ?? 1}
            onChange={e => set(nid, 'impresora_copias', parseInt(e.target.value))} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={s.fieldLabel}>Opciones</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={v.impresora_corte_auto ?? true}
              onChange={e => set(nid, 'impresora_corte_auto', e.target.checked)} />
            Corte automático de papel
          </label>
        </div>
      </>)}
      onClose={onClose}
    />
  )
}

export function ModalCajon({ onClose }) {
  return (
    <ModalConfigNegocio
      titulo="Cajón de dinero"
      desc="Apertura automática del cajón al cobrar. Se activa a través del puerto RJ11 de la impresora de tickets."
      getVals={cfg => ({
        cajon_activo: cfg.cajon_activo ?? false,
        cajon_pin:    cfg.cajon_pin    ?? 0,
      })}
      renderCampos={(nid, v, set) => (<>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={s.fieldLabel}>Cajón conectado</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={v.cajon_activo ?? false}
              onChange={e => set(nid, 'cajon_activo', e.target.checked)} />
            Abrir cajón al cobrar
          </label>
        </div>
        <div>
          <label style={s.fieldLabel}>Pin del puerto RJ11</label>
          <select style={{ ...s.fieldInput, width: 80 }} value={v.cajon_pin ?? 0}
            onChange={e => set(nid, 'cajon_pin', parseInt(e.target.value))}
            disabled={!v.cajon_activo}>
            <option value={0}>Pin 2</option>
            <option value={5}>Pin 5</option>
          </select>
          <p style={{ fontSize: 11, color: '#9CA3AF', margin: '3px 0 0' }}>
            La mayoría de cajones usan Pin 2
          </p>
        </div>
      </>)}
      onClose={onClose}
    />
  )
}

export function ModalTerminalTPV({ onClose }) {
  return (
    <ModalConfigNegocio
      titulo="Terminal de pago (TPV)"
      desc="Configura cómo se procesan los pagos con tarjeta en el POS."
      ancho={560}
      getVals={cfg => ({
        terminal_tipo:    cfg.terminal_tipo    ?? 'manual',
        terminal_api_key: cfg.terminal_api_key ?? '',
      })}
      renderCampos={(nid, v, set) => (<>
        <div>
          <label style={s.fieldLabel}>Tipo de terminal</label>
          <select style={s.fieldInput} value={v.terminal_tipo ?? 'manual'}
            onChange={e => set(nid, 'terminal_tipo', e.target.value)}>
            <option value="manual">Manual (captura referencia)</option>
            <option value="clip">Clip</option>
            <option value="conekta">Conekta</option>
            <option value="stripe">Stripe Terminal</option>
          </select>
        </div>
        {v.terminal_tipo !== 'manual' && (
          <div style={{ flex: 1 }}>
            <label style={s.fieldLabel}>API Key del proveedor</label>
            <input style={s.fieldInput} type="password" placeholder="••••••••"
              value={v.terminal_api_key ?? ''}
              onChange={e => set(nid, 'terminal_api_key', e.target.value)} />
          </div>
        )}
      </>)}
      onClose={onClose}
    />
  )
}

export function ModalLectorCodigos({ onClose }) {
  return (
    <ModalConfigNegocio
      titulo="Lector de códigos de barras"
      desc="Algunos lectores agregan caracteres al inicio o final del código. Configúralos aquí para que el POS los ignore."
      ancho={580}
      getVals={cfg => ({
        scanner_prefijo:    cfg.scanner_prefijo    ?? '',
        scanner_sufijo:     cfg.scanner_sufijo     ?? '',
        scanner_enter_auto: cfg.scanner_enter_auto ?? true,
      })}
      renderCampos={(nid, v, set) => (<>
        <div>
          <label style={s.fieldLabel}>Prefijo a ignorar</label>
          <input style={{ ...s.fieldInput, width: 90, fontFamily: 'monospace' }}
            value={v.scanner_prefijo ?? ''}
            onChange={e => set(nid, 'scanner_prefijo', e.target.value)}
            maxLength={10} placeholder="(vacío)" />
        </div>
        <div>
          <label style={s.fieldLabel}>Sufijo a ignorar</label>
          <input style={{ ...s.fieldInput, width: 90, fontFamily: 'monospace' }}
            value={v.scanner_sufijo ?? ''}
            onChange={e => set(nid, 'scanner_sufijo', e.target.value)}
            maxLength={10} placeholder="(vacío)" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={s.fieldLabel}>Confirmar con Enter automático</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
            <input type="checkbox" checked={v.scanner_enter_auto ?? true}
              onChange={e => set(nid, 'scanner_enter_auto', e.target.checked)} />
            El lector envía Enter al terminar
          </label>
        </div>
      </>)}
      onClose={onClose}
    />
  )
}
