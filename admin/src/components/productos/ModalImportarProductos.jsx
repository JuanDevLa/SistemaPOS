import { useState } from 'react'
import { api } from '../../api'

export default function ModalImportarProductos({ importPreview, onSuccess, onClose }) {
  const [importando, setImportando]   = useState(false)
  const [importResult, setImportResult] = useState(null)

  const handleConfirmar = async () => {
    if (!importPreview?.length) return
    setImportando(true)
    try {
      const res = await api.importarProductos(importPreview)
      if (res.error) setImportResult({ error: res.error })
      else { setImportResult(res); onSuccess() }
    } catch (e) { setImportResult({ error: e.message || 'Error al importar' }) }
    setImportando(false)
  }

  return (
    <div style={s.overlay}>
      <div style={{ ...s.modalCard, width: 700, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <h3 style={s.modalTitle}>Importar productos</h3>

        {importResult ? (
          <div>
            {importResult.error ? (
              <p style={{ color: '#DC2626', marginBottom: 16 }}>{importResult.error}</p>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                  <span style={{ background: '#D1FAE5', color: '#065F46', padding: '6px 14px', borderRadius: 8, fontWeight: 700 }}>
                    {importResult.creados} creados
                  </span>
                  <span style={{ background: '#FEF3C7', color: '#92400E', padding: '6px 14px', borderRadius: 8, fontWeight: 700 }}>
                    {importResult.duplicados} duplicados (omitidos)
                  </span>
                </div>
                {importResult.errores?.length > 0 && (
                  <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, padding: 12, marginBottom: 12 }}>
                    <p style={{ fontWeight: 600, color: '#DC2626', marginBottom: 6, fontSize: 13 }}>Errores ({importResult.errores.length})</p>
                    {importResult.errores.map((e, i) => (
                      <p key={i} style={{ fontSize: 12, color: '#7F1D1D' }}>{e.nombre}: {e.motivo}</p>
                    ))}
                  </div>
                )}
              </>
            )}
            <div style={s.modalFooter}>
              <button style={s.btnPrimary} onClick={onClose}>Cerrar</button>
            </div>
          </div>
        ) : (
          <>
            <p style={{ color: '#6B7280', fontSize: 13, marginBottom: 12 }}>
              {importPreview?.length || 0} productos detectados. Encabezados esperados:{' '}
              <code>nombre, precio, costo, codigo_barras, unidad, precio_mayoreo, descripcion</code>
            </p>
            <div style={{ overflowY: 'auto', flex: 1, marginBottom: 16 }}>
              <table style={{ ...s.table, fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={s.th}>Nombre</th>
                    <th style={{ ...s.th, textAlign: 'right' }}>Precio</th>
                    <th style={{ ...s.th, textAlign: 'right' }}>Costo</th>
                    <th style={s.th}>Código</th>
                    <th style={s.th}>Unidad</th>
                  </tr>
                </thead>
                <tbody>
                  {(importPreview || []).slice(0, 50).map((p, i) => (
                    <tr key={i} style={s.tr}>
                      <td style={s.td}>{p.nombre || <span style={{ color: '#DC2626' }}>SIN NOMBRE</span>}</td>
                      <td style={{ ...s.td, textAlign: 'right' }}>{p.precio || <span style={{ color: '#DC2626' }}>—</span>}</td>
                      <td style={{ ...s.td, textAlign: 'right', color: '#6B7280' }}>{p.costo || '—'}</td>
                      <td style={{ ...s.td, color: '#6B7280' }}>{p.codigo_barras || '—'}</td>
                      <td style={s.td}>{p.unidad}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {importPreview?.length > 50 && (
                <p style={{ textAlign: 'center', color: '#6B7280', fontSize: 12, padding: 8 }}>
                  ... y {importPreview.length - 50} más
                </p>
              )}
            </div>
            <div style={s.modalFooter}>
              <button style={s.btnSecondary} onClick={onClose}>Cancelar</button>
              <button
                style={{ ...s.btnPrimary, opacity: importando || !importPreview?.length ? 0.6 : 1 }}
                disabled={importando || !importPreview?.length}
                onClick={handleConfirmar}
              >
                {importando ? 'Importando...' : `Importar ${importPreview?.length || 0} productos`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const s = {
  overlay:     { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  modalCard:   { background: '#FFF', borderRadius: 10, padding: 28, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', overflow: 'auto' },
  modalTitle:  { fontSize: 18, fontWeight: 700, marginBottom: 20 },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: 10 },
  btnPrimary:  { padding: '9px 18px', background: '#1E3A5F', color: '#FFF', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  btnSecondary:{ padding: '9px 18px', background: '#FFF', color: '#374151', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 14, cursor: 'pointer' },
  table:       { width: '100%', borderCollapse: 'collapse' },
  th:          { padding: '10px 14px', background: '#F9FAFB', fontSize: 12, fontWeight: 600, color: '#6B7280', textAlign: 'left', borderBottom: '1px solid #E5E7EB' },
  tr:          { borderBottom: '1px solid #F3F4F6' },
  td:          { padding: '10px 14px', fontSize: 13, verticalAlign: 'middle' },
}
