import { useState } from 'react'
import { ModalConfigNegocio } from './ModalConfigNegocio'
import { s } from './estilos'

const sBtnSec = { padding: '6px 12px', background: '#F3F4F6', color: '#374151', border: '1px solid #D1D5DB', borderRadius: 5, fontSize: 12, cursor: 'pointer' }

export function ModalLectorCodigos({ onClose }) {
  return (
    <ModalConfigNegocio titulo="Lector de códigos de barras"
      desc="Configura el prefijo/sufijo que agrega el scanner para que el POS los ignore."
      ancho={560}
      getVals={cfg => ({ scanner_prefijo: cfg.scanner_prefijo ?? '', scanner_sufijo: cfg.scanner_sufijo ?? '', scanner_enter_auto: cfg.scanner_enter_auto ?? true })}
      renderCampos={(nid, v, set) => (<>
        <div>
          <label style={s.fieldLabel}>Prefijo a ignorar</label>
          <input style={{ ...s.fieldInput, width: 90, fontFamily: 'monospace' }}
            value={v.scanner_prefijo ?? ''} maxLength={10} placeholder="(vacío)"
            onChange={e => set(nid, 'scanner_prefijo', e.target.value)} />
        </div>
        <div>
          <label style={s.fieldLabel}>Sufijo a ignorar</label>
          <input style={{ ...s.fieldInput, width: 90, fontFamily: 'monospace' }}
            value={v.scanner_sufijo ?? ''} maxLength={10} placeholder="(vacío)"
            onChange={e => set(nid, 'scanner_sufijo', e.target.value)} />
        </div>
        <div>
          <label style={s.fieldLabel}>Enter automático</label>
          <label style={s.checkLabel}>
            <input type="checkbox" checked={v.scanner_enter_auto ?? true}
              onChange={e => set(nid, 'scanner_enter_auto', e.target.checked)} />
            El lector envía Enter
          </label>
        </div>
      </>)}
      onClose={onClose} />
  )
}

export function ModalImpresora({ onClose }) {
  const [dispositivos, setDispositivos] = useState([])
  const [buscando, setBuscando] = useState(false)

  const detectar = async (set, nid) => {
    if (!window.printerAPI) return
    setBuscando(true)
    try {
      const res = await window.printerAPI.listDevices()
      setDispositivos(res.devices || [])
    } finally {
      setBuscando(false)
    }
  }

  const seleccionarDispositivo = (vid, pid, set, nid) => {
    set(nid, 'printer_vid', vid)
    set(nid, 'printer_pid', pid)
  }

  return (
    <ModalConfigNegocio titulo="Impresora de tickets"
      desc="Identifica la impresora por VID/PID USB. Usa 'Detectar' para encontrar el dispositivo correcto."
      ancho={580}
      getVals={cfg => ({
        impresora_nombre:    cfg.impresora_nombre    ?? '',
        impresora_corte_auto: cfg.impresora_corte_auto ?? true,
        impresora_copias:    cfg.impresora_copias    ?? 1,
        printer_vid:         cfg.printer_vid         ?? null,
        printer_pid:         cfg.printer_pid         ?? null,
        printer_encoding:    cfg.printer_encoding    ?? 'CP850',
      })}
      renderCampos={(nid, v, set) => (<>
        <div style={{ width: '100%' }}>
          <label style={s.fieldLabel}>Identificador USB (VID / PID)</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input style={{ ...s.fieldInput, width: 90, fontFamily: 'monospace' }}
              value={v.printer_vid ? '0x' + v.printer_vid.toString(16).toUpperCase().padStart(4, '0') : ''}
              placeholder="VID"
              onChange={e => {
                const n = parseInt(e.target.value, 16)
                set(nid, 'printer_vid', isNaN(n) ? null : n)
              }} />
            <input style={{ ...s.fieldInput, width: 90, fontFamily: 'monospace' }}
              value={v.printer_pid ? '0x' + v.printer_pid.toString(16).toUpperCase().padStart(4, '0') : ''}
              placeholder="PID"
              onChange={e => {
                const n = parseInt(e.target.value, 16)
                set(nid, 'printer_pid', isNaN(n) ? null : n)
              }} />
            <button style={sBtnSec} onClick={() => detectar(set, nid)} disabled={buscando}>
              {buscando ? 'Buscando...' : 'Detectar dispositivos'}
            </button>
          </div>
          {dispositivos.length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {dispositivos.map((d, i) => (
                <button key={i} style={{ ...sBtnSec, textAlign: 'left', fontFamily: 'monospace', fontSize: 12 }}
                  onClick={() => seleccionarDispositivo(d.vid, d.pid, set, nid)}>
                  {d.vidHex}:{d.pidHex}
                  {d.usbClass === 0x07 ? ' ★ Printer class' : ''}
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <label style={s.fieldLabel}>Encoding (caracteres)</label>
          <select style={{ ...s.fieldInput, width: 110 }}
            value={v.printer_encoding ?? 'CP850'}
            onChange={e => set(nid, 'printer_encoding', e.target.value)}>
            <option value="CP850">CP850 (recomendado — ñ á é)</option>
            <option value="CP437">CP437 (USA)</option>
            <option value="UTF-8">UTF-8</option>
          </select>
        </div>
        <div>
          <label style={s.fieldLabel}>Copias</label>
          <input style={{ ...s.fieldInput, width: 70 }} type="number" min={1} max={5}
            value={v.impresora_copias ?? 1}
            onChange={e => set(nid, 'impresora_copias', parseInt(e.target.value))} />
        </div>
        <div>
          <label style={s.fieldLabel}>Opciones</label>
          <label style={s.checkLabel}>
            <input type="checkbox" checked={v.impresora_corte_auto ?? true}
              onChange={e => set(nid, 'impresora_corte_auto', e.target.checked)} />
            Corte automático
          </label>
        </div>
      </>)}
      onClose={onClose} />
  )
}

export function ModalCajon({ onClose }) {
  return (
    <ModalConfigNegocio titulo="Cajón de dinero"
      desc="Apertura automática del cajón al cobrar en efectivo vía puerto RJ11 de la impresora."
      getVals={cfg => ({ cajon_activo: cfg.cajon_activo ?? false, cajon_pin: cfg.cajon_pin ?? 0 })}
      renderCampos={(nid, v, set) => (<>
        <div>
          <label style={s.fieldLabel}>Cajón conectado</label>
          <label style={s.checkLabel}>
            <input type="checkbox" checked={v.cajon_activo ?? false}
              onChange={e => set(nid, 'cajon_activo', e.target.checked)} />
            Abrir al cobrar
          </label>
        </div>
        <div>
          <label style={s.fieldLabel}>Pin RJ11</label>
          <select style={{ ...s.fieldInput, width: 80 }} value={v.cajon_pin ?? 0}
            disabled={!v.cajon_activo}
            onChange={e => set(nid, 'cajon_pin', parseInt(e.target.value))}>
            <option value={0}>Pin 2</option>
            <option value={5}>Pin 5</option>
          </select>
        </div>
      </>)}
      onClose={onClose} />
  )
}

export function ModalTerminalTPV({ onClose }) {
  return (
    <ModalConfigNegocio titulo="Terminal de pago (TPV)"
      desc="Configura cómo se procesan los pagos con tarjeta en el POS."
      ancho={520}
      getVals={cfg => ({ terminal_tipo: cfg.terminal_tipo ?? 'manual', terminal_api_key: cfg.terminal_api_key ?? '' })}
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
      onClose={onClose} />
  )
}
