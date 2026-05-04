const ESTADOS_MX = [
  'Aguascalientes','Baja California','Baja California Sur','Campeche','Chiapas',
  'Chihuahua','Ciudad de México','Coahuila','Colima','Durango','Guanajuato',
  'Guerrero','Hidalgo','Jalisco','México','Michoacán','Morelos','Nayarit',
  'Nuevo León','Oaxaca','Puebla','Querétaro','Quintana Roo','San Luis Potosí',
  'Sinaloa','Sonora','Tabasco','Tamaulipas','Tlaxcala','Veracruz','Yucatán','Zacatecas'
]

export default function FormularioCliente({ form, formOriginal, modoNuevo, seleccionado, guardando, msg, set, guardar, fieldRefs, focusNext }) {
  if (!form) {
    return (
      <div style={s.formPanel}>
        <div style={s.formVacio}>Selecciona un cliente o presiona <strong>Nuevo Cliente</strong></div>
      </div>
    )
  }

  const dirty = modoNuevo
    ? !!form?.nombre?.trim()
    : formOriginal && JSON.stringify(form) !== JSON.stringify(formOriginal)

  return (
    <div style={s.formPanel}>
      <div style={s.formBody}>
        <h3 style={s.formTitulo}>
          {modoNuevo ? 'Nuevo cliente' : [seleccionado?.nombre, seleccionado?.apellidos].filter(Boolean).join(' ')}
        </h3>

        <F label="Nombres"            v={form.nombre}     onChange={v => set('nombre', v)}     inputRef={fieldRefs.nombre}        onEnter={() => focusNext('nombre')} />
        <F label="Apellidos"          v={form.apellidos}  onChange={v => set('apellidos', v)}  inputRef={fieldRefs.apellidos}     onEnter={() => focusNext('apellidos')} />
        <F label="Teléfono"           v={form.telefono}   onChange={v => set('telefono', v)}   inputRef={fieldRefs.telefono}      onEnter={() => focusNext('telefono')} />
        <F label="Correo electrónico" optional v={form.email}      onChange={v => set('email', v)}      inputRef={fieldRefs.email}         onEnter={() => focusNext('email')} />
        <F label="Domicilio1"         v={form.domicilio1} onChange={v => set('domicilio1', v)} inputRef={fieldRefs.domicilio1}    onEnter={() => focusNext('domicilio1')} />
        <F label="Domicilio2"         optional v={form.domicilio2} onChange={v => set('domicilio2', v)} inputRef={fieldRefs.domicilio2}    onEnter={() => focusNext('domicilio2')} />
        <F label="Colonia"            v={form.colonia}    onChange={v => set('colonia', v)}    inputRef={fieldRefs.colonia}       onEnter={() => focusNext('colonia')} />

        <div style={s.fila}>
          <label style={s.label}>Municipio / Estado</label>
          <div style={{ display: 'flex', gap: 4 }}>
            <input
              ref={fieldRefs.municipio}
              style={{ ...s.input, width: 130 }}
              value={form.municipio}
              onChange={e => set('municipio', e.target.value)}
              onKeyDown={e => e.key === 'Enter' && focusNext('municipio')}
              placeholder="Municipio"
            />
            <select style={{ ...s.input, width: 130 }} value={form.estado_residencia} onChange={e => set('estado_residencia', e.target.value)}>
              {ESTADOS_MX.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
        </div>

        <div style={s.fila}>
          <label style={s.label}>Código Postal</label>
          <input
            ref={fieldRefs.codigo_postal}
            style={{ ...s.input, width: 90 }}
            value={form.codigo_postal}
            onChange={e => set('codigo_postal', e.target.value)}
            onKeyDown={e => e.key === 'Enter' && focusNext('codigo_postal')}
            maxLength={5}
          />
        </div>

        <div style={s.fila}>
          <label style={s.label}>Notas / Comentarios</label>
          <textarea
            ref={fieldRefs.notas}
            style={{ ...s.input, width: 340, height: 52, resize: 'vertical', padding: '4px 6px' }}
            value={form.notas}
            onChange={e => set('notas', e.target.value)}
          />
        </div>

        <div style={s.creditoSec}>
          <div style={s.creditoTitulo}>Crédito</div>
          <div style={s.creditoFila}>
            <input type="checkbox" id="cred_hab" checked={form.credito_habilitado}
              onChange={e => set('credito_habilitado', e.target.checked)}
              style={{ marginRight: 6, cursor: 'pointer' }} />
            <label htmlFor="cred_hab" style={{ fontSize: 12, cursor: 'pointer', color: '#222' }}>
              Tiene crédito autorizado
            </label>
          </div>

          {form.credito_habilitado && (
            <div style={s.creditoLimite}>
              <label style={{ ...s.label, width: 100 }}>Límite de crédito</label>
              <select style={{ ...s.input, width: 120 }} value={form.limite_tipo} onChange={e => set('limite_tipo', e.target.value)}>
                <option value="limitado">limitado</option>
                <option value="ilimitado">De máximo:</option>
              </select>
              {form.limite_tipo === 'limitado' && (
                <input style={{ ...s.input, width: 90, marginLeft: 4 }} type="number" min="0" step="0.01"
                  value={form.limite_credito} onChange={e => set('limite_credito', e.target.value)} placeholder="0.00" />
              )}
            </div>
          )}

          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
            {msg && (
              <span style={{ fontSize: 11, color: msg === 'Guardado' ? '#1a7a3a' : '#c02020' }}>{msg}</span>
            )}
            <button
              style={{ ...s.btnGuardar, ...(dirty ? { background: '#1e3a5f', color: '#fff', border: '1px solid #1e3a5f', cursor: 'pointer' } : { opacity: 0.5, cursor: 'not-allowed' }) }}
              onClick={guardar}
              disabled={guardando || !dirty}
            >
              {guardando ? 'Guardando...' : '✓ Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function F({ label, v, onChange, optional, inputRef, onEnter }) {
  return (
    <div style={s.fila}>
      <label style={s.label}>{label}</label>
      <input
        ref={inputRef}
        style={s.input}
        value={v}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onEnter?.()}
        placeholder={optional ? 'opcional' : ''}
      />
    </div>
  )
}

const s = {
  formPanel:    { flex: 1, overflowY: 'auto', padding: '12px 20px', background: '#fff' },
  formVacio:    { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#aaa', fontSize: 12 },
  formBody:     { maxWidth: 600 },
  formTitulo:   { margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: '#1e3a5f', paddingBottom: 6, borderBottom: '1px solid #e0e0e0' },
  fila:         { display: 'flex', alignItems: 'center', marginBottom: 5, gap: 6 },
  label:        { width: 148, flexShrink: 0, textAlign: 'right', fontSize: 12, color: '#444' },
  input:        { padding: '3px 6px', fontSize: 12, border: '1px solid #bbb', borderRadius: 1, outline: 'none', flex: 1, fontFamily: 'Segoe UI, Tahoma, Arial, sans-serif', boxSizing: 'border-box', color: '#222' },
  creditoSec:   { marginTop: 14, padding: '10px 12px', border: '1px solid #d0d0d0', background: '#fafafa' },
  creditoTitulo:{ fontWeight: 700, fontSize: 12, color: '#222', marginBottom: 8 },
  creditoFila:  { display: 'flex', alignItems: 'center', marginBottom: 8 },
  creditoLimite:{ display: 'flex', alignItems: 'center', gap: 6 },
  btnGuardar:   { padding: '4px 16px', fontSize: 12, border: '1px solid #aaa', borderRadius: 2, background: '#e8e8e8', cursor: 'pointer', color: '#333' },
}
