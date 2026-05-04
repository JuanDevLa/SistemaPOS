import { useState } from 'react'
import { api } from '../api'
import { printCorteSnapshot } from '../printer-client'
import { usePermisos } from '../hooks/usePermisos'
import { useCorteSnapshot } from '../hooks/useCorteSnapshot'
import CorteBody from '../components/corte/CorteBody'
import ModalCerrarTurno from '../components/corte/ModalCerrarTurno'
import HistorialCortes from '../components/corte/HistorialCortes'

// Pantalla principal de Corte de Caja (réplica eleventa).
// Si no hay turno abierto → AbrirTurno. Si hay → vista de corte en vivo.
export default function CorteScreen({ usuario, corteActivo, onCorteChange }) {
  const { puede } = usePermisos(usuario)
  const [tipo, setTipo] = useState('cajero')        // 'cajero' | 'dia'
  const [vista, setVista] = useState('corte')      // 'corte' | 'historial'
  const [franjaCorte, setFranjaCorte] = useState(null) // snapshot generado tras "hacer corte"
  const [cerrandoTurno, setCerrandoTurno] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [imprimiendo, setImprimiendo] = useState(false)

  const { snapshot, cargando, error, recargar } = useCorteSnapshot({ usuario, tipo, corteId: corteActivo?.id })

  // Sin turno abierto → vista de abrir turno
  if (!corteActivo && tipo === 'cajero') {
    return <AbrirTurno usuario={usuario} onAbierto={c => onCorteChange(c)} />
  }

  const hacerCorte = async (tipoCorte) => {
    if (!snapshot) { setMensaje('Sin datos para corte'); return }
    if (tipoCorte === 'cajero' && !puede('corte_propio')) { setMensaje('Sin permiso: Hacer corte'); return }
    if (tipoCorte === 'dia'    && !puede('corte_dia'))    { setMensaje('Sin permiso: Hacer corte del día'); return }
    try {
      const r = await api.guardarHistorialCorte(tipoCorte, snapshot)
      setFranjaCorte({ ...snapshot, _historial_id: r.id, tipo: tipoCorte })
      setMensaje('')
      try { await printCorteSnapshot(snapshot, {}) } catch { /* impresora puede no estar conectada */ }
    } catch (e) {
      setMensaje(e.message)
    }
  }

  const imprimirFranja = async () => {
    if (!franjaCorte) return
    setImprimiendo(true)
    try { await printCorteSnapshot(franjaCorte, {}) } catch { /* silencioso */ }
    setImprimiendo(false)
  }

  const cerrarTurno = async ({ efectivoContado, diferencia, restablecer }) => {
    await api.cerrarCorte(corteActivo.id, efectivoContado, null)
    // Snapshot final + historial tipo 'cierre'
    const final = { ...(snapshot || {}), efectivo_contado: efectivoContado, diferencia, tipo: 'cierre' }
    try { await api.guardarHistorialCorte('cierre', final) } catch { /* ya cerró el corte; historial es secundario */ }
    try { await printCorteSnapshot(final, { efectivoContado, diferencia, titulo: 'CIERRE DE TURNO' }) } catch { /* impresora */ }

    setCerrandoTurno(false)
    setFranjaCorte(null)

    if (restablecer) {
      try {
        const nuevo = await api.abrirCorte(usuario.negocio_id, 0)
        onCorteChange(nuevo)
      } catch (e) {
        setMensaje(`Turno cerrado, pero no se pudo abrir nuevo: ${e.message}`)
        onCorteChange(null)
      }
    } else {
      onCorteChange(null)
    }
  }

  if (vista === 'historial') {
    return (
      <div style={s.root}>
        <div style={s.tabBar}>
          <button style={s.tabBtn} onClick={() => setVista('corte')}>← Volver al corte</button>
        </div>
        <HistorialCortes usuario={usuario} />
      </div>
    )
  }

  return (
    <div style={s.root}>
      {/* Barra superior CORTE */}
      <div style={s.barraTop}>
        <div style={s.btnsTop}>
          <button style={s.btnAccion} onClick={() => hacerCorte('cajero')} disabled={!snapshot}>Hacer corte de cajero</button>
          <button style={s.btnAccion} onClick={() => hacerCorte('dia')}    disabled={!snapshot}>Hacer corte del día</button>
        </div>
        <div style={s.btnsRight}>
          <button style={s.btnSec} onClick={() => setVista('historial')}>Historial</button>
          <select value={tipo} onChange={e => { setTipo(e.target.value); setFranjaCorte(null) }} style={s.select}>
            <option value="cajero">Mi turno</option>
            <option value="dia">Día completo</option>
          </select>
        </div>
      </div>

      {/* Franja informativa que solo aparece después de "Hacer corte de cajero/día" */}
      {franjaCorte && (
        <div style={s.franja}>
          <div style={s.franjaTexto}>
            {franjaCorte.tipo === 'dia' ? (
              <>Corte del <strong>{new Date().toLocaleDateString('es-MX')}</strong> · <strong>{franjaCorte.negocio || ''}</strong></>
            ) : (
              <>
                Corte de <strong>{franjaCorte.cajero || 'Cajero'}</strong> iniciado el{' '}
                <strong>{new Date(franjaCorte.apertura).toLocaleString('es-MX')}</strong> de la{' '}
                <strong>{franjaCorte.negocio || 'Caja'}</strong>
              </>
            )}
            <div style={s.franjaSub}>
              De {new Date(franjaCorte.apertura).toLocaleString('es-MX')} a {new Date().toLocaleString('es-MX')} — (Turno Activo)
            </div>
          </div>
          <div style={s.franjaBtns}>
            <button style={s.btnSec} onClick={imprimirFranja} disabled={imprimiendo}>
              {imprimiendo ? 'Imprimiendo...' : '🖨 Imprimir'}
            </button>
            <button style={s.btnDanger} onClick={() => setCerrandoTurno(true)}>Cerrar turno</button>
          </div>
        </div>
      )}

      {mensaje && <div style={s.mensaje}>{mensaje}</div>}

      {cargando ? (
        <div style={{ padding: 30, color: '#6B7280' }}>Cargando corte...</div>
      ) : error ? (
        <div style={{ padding: 30, color: '#DC2626' }}>{error}</div>
      ) : (
        <CorteBody snapshot={snapshot} />
      )}

      {cerrandoTurno && (
        <ModalCerrarTurno
          snapshot={snapshot}
          onClose={() => setCerrandoTurno(false)}
          onConfirmar={cerrarTurno}
        />
      )}

      <button style={s.btnRefresh} onClick={recargar}>↻ Refrescar</button>
    </div>
  )
}

function AbrirTurno({ usuario, onAbierto }) {
  const [efectivo, setEfectivo] = useState('')
  const [mensaje, setMensaje] = useState('')

  const abrir = async () => {
    if (efectivo === '' || parseFloat(efectivo) < 0) { setMensaje('Ingresa el efectivo inicial'); return }
    try {
      const r = await api.abrirCorte(usuario.negocio_id, parseFloat(efectivo))
      onAbierto(r)
    } catch (e) {
      setMensaje(e.message)
    }
  }

  return (
    <div style={{ padding: 40, color: '#1a1a1a' }}>
      <div style={{ maxWidth: 420, margin: '40px auto', background: '#FFF', padding: 24, borderRadius: 8, border: '1px solid #E5E7EB' }}>
        <h3 style={{ marginBottom: 14, color: '#1E3A5F' }}>ABRIR TURNO</h3>
        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 14 }}>
          No hay turno activo. Ingresa el efectivo inicial para comenzar.
        </p>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Efectivo inicial en caja</label>
        <input
          type="number" step="0.01" autoFocus
          value={efectivo}
          onChange={e => setEfectivo(e.target.value)}
          style={{ width: '100%', padding: '8px 12px', fontSize: 18, fontWeight: 700, border: '1px solid #BFDBFE', borderRadius: 4, marginTop: 6, marginBottom: 12, color: '#1a1a1a' }}
          placeholder="0.00"
        />
        {mensaje && <div style={{ fontSize: 12, color: '#DC2626', marginBottom: 8 }}>{mensaje}</div>}
        <button onClick={abrir} style={{ width: '100%', padding: 12, background: '#15803D', color: '#FFF', border: 'none', borderRadius: 4, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>
          ▶ Abrir turno
        </button>
      </div>
    </div>
  )
}

const s = {
  root:    { background: '#F5F5F5', minHeight: '100%', color: '#1a1a1a', overflow: 'auto', position: 'relative' },
  barraTop:{ background: '#FFF', borderBottom: '1px solid #E5E7EB', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  btnsTop: { display: 'flex', gap: 8 },
  btnsRight:{ display: 'flex', gap: 8, alignItems: 'center' },
  btnAccion:{ padding: '8px 14px', background: '#1E3A5F', color: '#FFF', border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnSec:  { padding: '8px 12px', background: '#FFF', color: '#1E3A5F', border: '1px solid #BFDBFE', borderRadius: 4, fontSize: 13, cursor: 'pointer' },
  btnDanger:{ padding: '8px 14px', background: '#DC2626', color: '#FFF', border: 'none', borderRadius: 4, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  select:  { padding: '6px 10px', border: '1px solid #D1D5DB', borderRadius: 4, fontSize: 13, color: '#1a1a1a', background: '#FFF' },
  franja:  { background: '#1E3A5F', color: '#FFF', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  franjaTexto: { fontSize: 13, color: '#FFF' },
  franjaSub:   { fontSize: 11, color: '#BFDBFE', marginTop: 2 },
  franjaBtns:  { display: 'flex', gap: 8 },
  mensaje: { padding: '8px 16px', background: '#FEF3C7', color: '#92400E', fontSize: 13, borderBottom: '1px solid #FCD34D' },
  tabBar:  { padding: '10px 16px', background: '#FFF', borderBottom: '1px solid #E5E7EB' },
  tabBtn:  { padding: '6px 12px', border: '1px solid #BFDBFE', background: '#F0F7FF', color: '#1E3A5F', borderRadius: 4, fontSize: 13, cursor: 'pointer' },
  btnRefresh:{ position: 'fixed', bottom: 20, right: 20, padding: '8px 14px', background: '#FFF', color: '#1E3A5F', border: '1px solid #BFDBFE', borderRadius: 20, fontSize: 12, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' },
}
