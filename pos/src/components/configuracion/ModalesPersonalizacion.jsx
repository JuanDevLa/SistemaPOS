import { ModalConfigNegocio } from './ModalConfigNegocio'
import { s } from './estilos'

export function ModalImpuestos({ onClose }) {
  return (
    <ModalConfigNegocio titulo="Impuestos (IVA)"
      desc="Porcentaje de IVA aplicado a productos gravados. 0% = sin IVA."
      getVals={cfg => ({ iva_porcentaje: cfg.iva_porcentaje ?? 16 })}
      renderCampos={(nid, v, set) => (
        <div>
          <label style={s.fieldLabel}>IVA (%)</label>
          <input style={{ ...s.fieldInput, width: 100 }} type="number" min={0} max={100} step={0.01}
            value={v.iva_porcentaje ?? 16}
            onChange={e => set(nid, 'iva_porcentaje', e.target.value)} />
        </div>
      )}
      onClose={onClose} />
  )
}

export function ModalMoneda({ onClose }) {
  return (
    <ModalConfigNegocio titulo="Símbolo de moneda"
      desc="Símbolo que aparece antes de los precios en tickets e interfaz (ej: $, USD, €)."
      getVals={cfg => ({ moneda_simbolo: cfg.moneda_simbolo ?? '$' })}
      renderCampos={(nid, v, set) => (<>
        <div>
          <label style={s.fieldLabel}>Símbolo</label>
          <input style={{ ...s.fieldInput, width: 80 }} value={v.moneda_simbolo ?? '$'}
            onChange={e => set(nid, 'moneda_simbolo', e.target.value)} maxLength={5} />
        </div>
        <div>
          <label style={s.fieldLabel}>Vista previa</label>
          <div style={s.preview}>{v.moneda_simbolo ?? '$'}1,234.00</div>
        </div>
      </>)}
      onClose={onClose} />
  )
}

export function ModalSeguridad({ onClose }) {
  return (
    <ModalConfigNegocio titulo="Seguridad"
      desc="Cierre de sesión automático por inactividad y bloqueo por intentos de PIN fallidos."
      getVals={cfg => ({ sesion_inactividad_min: cfg.sesion_inactividad_min ?? 30, pin_max_intentos: cfg.pin_max_intentos ?? 5 })}
      renderCampos={(nid, v, set) => (<>
        <div>
          <label style={s.fieldLabel}>Inactividad</label>
          <select style={s.fieldInput} value={v.sesion_inactividad_min ?? 30}
            onChange={e => set(nid, 'sesion_inactividad_min', parseInt(e.target.value))}>
            {[5,10,15,30,60,120].map(m => <option key={m} value={m}>{m} min</option>)}
          </select>
        </div>
        <div>
          <label style={s.fieldLabel}>Intentos PIN máx.</label>
          <input style={{ ...s.fieldInput, width: 80 }} type="number" min={1} max={10}
            value={v.pin_max_intentos ?? 5}
            onChange={e => set(nid, 'pin_max_intentos', parseInt(e.target.value))} />
        </div>
      </>)}
      onClose={onClose} />
  )
}

export function ModalDevoluciones({ onClose }) {
  return (
    <ModalConfigNegocio titulo="Política de devoluciones"
      desc="Días hábiles para aceptar devoluciones y si requieren autorización del administrador."
      getVals={cfg => ({ devolucion_dias: cfg.devolucion_dias ?? 30, devolucion_requiere_auth: cfg.devolucion_requiere_auth ?? false })}
      renderCampos={(nid, v, set) => (<>
        <div>
          <label style={s.fieldLabel}>Días permitidos</label>
          <input style={{ ...s.fieldInput, width: 90 }} type="number" min={0} max={365}
            value={v.devolucion_dias ?? 30}
            onChange={e => set(nid, 'devolucion_dias', parseInt(e.target.value))} />
          <p style={s.hint}>0 = sin límite</p>
        </div>
        <div>
          <label style={s.fieldLabel}>Autorización admin</label>
          <label style={s.checkLabel}>
            <input type="checkbox" checked={v.devolucion_requiere_auth ?? false}
              onChange={e => set(nid, 'devolucion_requiere_auth', e.target.checked)} />
            Sí, pedir PIN de admin
          </label>
        </div>
      </>)}
      onClose={onClose} />
  )
}

export function ModalStockAlertas({ onClose }) {
  return (
    <ModalConfigNegocio titulo="Alertas de stock"
      desc="Cantidad mínima de existencias a partir de la cual se muestra alerta en el POS."
      getVals={cfg => ({ stock_alerta_global: cfg.stock_alerta_global ?? 5 })}
      renderCampos={(nid, v, set) => (
        <div>
          <label style={s.fieldLabel}>Umbral de alerta (unidades)</label>
          <input style={{ ...s.fieldInput, width: 110 }} type="number" min={0} max={9999}
            value={v.stock_alerta_global ?? 5}
            onChange={e => set(nid, 'stock_alerta_global', parseInt(e.target.value))} />
          <p style={s.hint}>Stock ≤ este valor se marca en rojo</p>
        </div>
      )}
      onClose={onClose} />
  )
}

export function ModalCreditoGlobal({ onClose }) {
  return (
    <ModalConfigNegocio titulo="Límite de crédito"
      desc="Monto máximo de crédito asignado a clientes nuevos. Ajustable por cliente individualmente."
      getVals={cfg => ({ credito_limite_default: cfg.credito_limite_default ?? 500 })}
      renderCampos={(nid, v, set) => (
        <div>
          <label style={s.fieldLabel}>Límite default para clientes nuevos</label>
          <input style={{ ...s.fieldInput, width: 130 }} type="number" min={0} step={50}
            value={v.credito_limite_default ?? 500}
            onChange={e => set(nid, 'credito_limite_default', parseFloat(e.target.value))} />
          <p style={s.hint}>0 = sin crédito por defecto</p>
        </div>
      )}
      onClose={onClose} />
  )
}
