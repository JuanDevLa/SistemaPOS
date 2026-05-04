import { useState, useRef } from 'react'
import { api } from '../../api'

const COLUMNAS_PLANTILLA = [
  'codigo_barras', 'nombre', 'precio', 'costo', 'precio_mayoreo', 'departamento', 'unidad'
]

const descargarPlantilla = () => {
  const ejemplo = [
    COLUMNAS_PLANTILLA.join(','),
    '7501000000001,Coca Cola 600ml,15.00,10.00,13.00,Refrescos,pieza',
    '7501000000002,Agua 1L,8.00,5.00,7.00,Bebidas,pieza',
    ',Chicles sin codigo,2.00,1.00,,Dulces,pieza',
  ].join('\n')
  const blob = new Blob([ejemplo], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'plantilla_productos.csv'; a.click()
  URL.revokeObjectURL(url)
}

const parsearCSV = (texto) => {
  const lineas = texto.trim().split('\n').filter(l => l.trim())
  if (lineas.length < 2) return []
  const encabezado = lineas[0].split(',').map(h => h.trim().toLowerCase())
  return lineas.slice(1).map(linea => {
    const cols = linea.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
    const obj = {}
    encabezado.forEach((h, i) => { obj[h] = cols[i] || '' })
    return {
      codigo_barras:  obj.codigo_barras || null,
      nombre:         obj.nombre || '',
      precio:         parseFloat(obj.precio) || 0,
      costo:          parseFloat(obj.costo) || null,
      precio_mayoreo: parseFloat(obj.precio_mayoreo) || null,
      departamento:   obj.departamento || '',
      unidad:         obj.unidad || 'pieza',
    }
  }).filter(p => p.nombre && p.precio > 0)
}

export default function TabImportar({ usuario }) {
  const [paso, setPaso]           = useState(1)
  const [archivo, setArchivo]     = useState(null)
  const [productos, setProductos] = useState([])
  const [errorParse, setErrorParse] = useState('')
  const [importando, setImportando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const fileRef = useRef()

  const cerrar = () => {
    setPaso(1); setArchivo(null); setProductos([])
    setErrorParse(''); setResultado(null)
  }

  const onArchivo = (ev) => {
    const f = ev.target.files[0]
    if (!f) return
    setArchivo(f); setErrorParse('')
    const reader = new FileReader()
    reader.onload = (e) => {
      const texto = e.target.result
      const parsed = parsearCSV(texto)
      if (parsed.length === 0) {
        setErrorParse('No se encontraron productos validos en el archivo. Revisa el formato.')
      } else {
        setProductos(parsed)
      }
    }
    reader.readAsText(f)
  }

  const siguiente = () => {
    if (paso === 1) { setPaso(2); return }
  }

  const importar = async () => {
    if (productos.length === 0) return
    setImportando(true)
    try {
      const res = await api.importarProductos({ productos })
      setResultado(res)
      setPaso(3)
    } catch(e) {
      setErrorParse(e.message)
    } finally {
      setImportando(false)
    }
  }

  return (
    <div style={e.shell}>
      {/* Fondo gris detrás del modal */}
      <div style={e.overlay}>
        <div style={e.modal}>

          {/* Header */}
          <div style={e.header}>
            <span style={e.headerTxt}>IMPORTAR PRODUCTOS DESDE EXCEL</span>
            <button style={e.btnX} onClick={cerrar}>&#10005;</button>
          </div>

          {/* Paso 1: Bienvenido */}
          {paso === 1 && (
            <div style={e.cuerpo}>
              <div style={e.subtitulo}>Bienvenido</div>
              <p style={e.descripcion}>
                Este asistente te permitira ingresar productos desde un archivo CSV de forma sencilla e instantanea.
                Haz clic en <strong>Siguiente</strong> para continuar.
              </p>

              {/* Preview visual */}
              <div style={e.preview}>
                <div style={e.previewTabla}>
                  <div style={e.previewHeader}>
                    {['Codigo','Nombre','Precio','Costo','Mayoreo','Depto','Unidad'].map(h => (
                      <div key={h} style={e.previewTh}>{h}</div>
                    ))}
                  </div>
                  {[
                    ['7501000001','Coca Cola 600ml','$15.00','$10.00','$13.00','Refrescos','pieza'],
                    ['7501000002','Agua 1L','$8.00','$5.00','$7.00','Bebidas','pieza'],
                    ['','Chicles','$2.00','$1.00','','Dulces','pieza'],
                  ].map((fila, i) => (
                    <div key={i} style={{ ...e.previewFila, background: i % 2 === 0 ? '#fff' : '#f5f5f5' }}>
                      {fila.map((cel, j) => <div key={j} style={e.previewTd}>{cel}</div>)}
                    </div>
                  ))}
                </div>
                <div style={e.flecha}>&#10148;</div>
                <div style={e.previewTabla}>
                  <div style={e.previewHeader}>
                    {['Codigo','Nombre','Precio'].map(h => (
                      <div key={h} style={e.previewTh}>{h}</div>
                    ))}
                  </div>
                  {[
                    ['7501000001','Coca Cola 600ml','$15.00'],
                    ['7501000002','Agua 1L','$8.00'],
                    ['','Chicles','$2.00'],
                  ].map((fila, i) => (
                    <div key={i} style={{ ...e.previewFila, background: i % 2 === 0 ? '#d4edda' : '#c3e6cb' }}>
                      {fila.map((cel, j) => <div key={j} style={e.previewTd}>{cel}</div>)}
                    </div>
                  ))}
                </div>
              </div>

              <div style={e.plantillaRow}>
                <span style={e.excelIcon}>&#128196;</span>
                <button style={e.btnPlantilla} onClick={descargarPlantilla}>
                  Abrir una plantilla de ejemplo
                </button>
                <span style={e.plantillaNote}>Formato CSV compatible con Excel</span>
              </div>
            </div>
          )}

          {/* Paso 2: Seleccionar archivo */}
          {paso === 2 && (
            <div style={e.cuerpo}>
              <div style={e.subtitulo}>Selecciona el archivo</div>
              <p style={e.descripcion}>
                Elige el archivo CSV con tus productos. Debe tener las columnas:<br />
                <code style={e.code}>{COLUMNAS_PLANTILLA.join(', ')}</code>
              </p>

              <div style={e.fileZone} onClick={() => fileRef.current?.click()}>
                <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={onArchivo} />
                {archivo ? (
                  <div style={e.fileNombre}>&#128196; {archivo.name}</div>
                ) : (
                  <div style={e.filePlaceholder}>&#8679; Haz clic para seleccionar un archivo CSV</div>
                )}
              </div>

              {errorParse && <div style={e.errorMsg}>{errorParse}</div>}

              {productos.length > 0 && (
                <div style={e.preview2}>
                  <div style={e.preview2Titulo}>
                    Se encontraron <strong>{productos.length}</strong> producto(s) listos para importar:
                  </div>
                  <div style={e.tablaWrap}>
                    <table style={e.tabla}>
                      <thead>
                        <tr>
                          <th style={e.th}>#</th>
                          <th style={e.th}>Codigo</th>
                          <th style={{ ...e.th, textAlign: 'left' }}>Nombre</th>
                          <th style={e.th}>Precio</th>
                          <th style={e.th}>Costo</th>
                          <th style={e.th}>Depto</th>
                          <th style={e.th}>Unidad</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productos.slice(0, 10).map((p, i) => (
                          <tr key={i} style={i % 2 === 1 ? { background: '#f9f9f9' } : undefined}>
                            <td style={{ ...e.td, textAlign: 'center', color: '#888' }}>{i + 1}</td>
                            <td style={{ ...e.td, fontFamily: 'monospace' }}>{p.codigo_barras || '—'}</td>
                            <td style={{ ...e.td, textAlign: 'left' }}>{p.nombre}</td>
                            <td style={{ ...e.td, textAlign: 'right' }}>${p.precio.toFixed(2)}</td>
                            <td style={{ ...e.td, textAlign: 'right' }}>${(p.costo || 0).toFixed(2)}</td>
                            <td style={e.td}>{p.departamento || '—'}</td>
                            <td style={e.td}>{p.unidad}</td>
                          </tr>
                        ))}
                        {productos.length > 10 && (
                          <tr><td colSpan={7} style={{ ...e.td, textAlign: 'center', color: '#888' }}>
                            ... y {productos.length - 10} mas
                          </td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Paso 3: Resultado */}
          {paso === 3 && resultado && (
            <div style={e.cuerpo}>
              <div style={e.subtitulo}>Importacion completada</div>
              <div style={e.resultadoBox}>
                <div style={e.resultStat}>
                  <span style={e.resultNum}>{resultado.creados ?? 0}</span>
                  <span style={e.resultLabel}>Productos creados</span>
                </div>
                <div style={e.resultStat}>
                  <span style={{ ...e.resultNum, color: '#c8860a' }}>{resultado.duplicados ?? 0}</span>
                  <span style={e.resultLabel}>Duplicados omitidos</span>
                </div>
                {resultado.errores?.length > 0 && (
                  <div style={e.resultStat}>
                    <span style={{ ...e.resultNum, color: '#c00' }}>{resultado.errores.length}</span>
                    <span style={e.resultLabel}>Con errores</span>
                  </div>
                )}
              </div>
              {resultado.errores?.length > 0 && (
                <div style={e.erroresLista}>
                  {resultado.errores.map((err, i) => (
                    <div key={i} style={e.errorFila}>
                      <strong>{err.nombre}</strong>: {err.motivo}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Footer con botones */}
          <div style={e.footer}>
            {paso < 3 && (
              <>
                {paso === 2 && (
                  <button className="pos-btn" style={e.btnFooter} onClick={() => setPaso(1)}>
                    &lt; Atras
                  </button>
                )}
                <div style={{ flex: 1 }} />
                {paso === 1 && (
                  <button className="pos-btn pos-btn-primary" style={e.btnFooter} onClick={siguiente}>
                    Siguiente &gt;
                  </button>
                )}
                {paso === 2 && (
                  <button
                    className="pos-btn pos-btn-success"
                    style={e.btnFooter}
                    onClick={importar}
                    disabled={importando || productos.length === 0}
                  >
                    {importando ? 'Importando...' : `Importar ${productos.length} producto(s)`}
                  </button>
                )}
                <button className="pos-btn" style={e.btnFooter} onClick={cerrar}>Cancelar</button>
              </>
            )}
            {paso === 3 && (
              <>
                <div style={{ flex: 1 }} />
                <button className="pos-btn pos-btn-primary" style={e.btnFooter} onClick={cerrar}>
                  Cerrar
                </button>
              </>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

const e = {
  shell: {
    display: 'flex', flex: 1, background: '#e8e8e6',
  },
  overlay: {
    display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center',
  },
  modal: {
    background: '#fff', width: 640, maxHeight: '90vh',
    border: '1px solid #999', boxShadow: '0 6px 24px rgba(0,0,0,0.25)',
    display: 'flex', flexDirection: 'column', borderRadius: 3,
  },
  header: {
    background: '#1E3A5F', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '9px 14px',
  },
  headerTxt: {
    fontSize: 13, fontWeight: 700, letterSpacing: 0.3,
  },
  btnX: {
    background: 'transparent', border: 'none', color: '#fff',
    fontSize: 14, cursor: 'pointer', padding: '0 4px', lineHeight: 1,
  },
  cuerpo: {
    flex: 1, overflowY: 'auto', padding: '16px 20px',
    display: 'flex', flexDirection: 'column', gap: 12,
  },
  subtitulo: {
    fontSize: 14, fontWeight: 700, color: '#333',
  },
  descripcion: {
    fontSize: 12, color: '#555', lineHeight: 1.6, margin: 0,
  },
  // Preview paso 1
  preview: {
    display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center',
    padding: '10px 0',
  },
  previewTabla: {
    border: '1px solid #ccc', borderRadius: 3, overflow: 'hidden', fontSize: 10,
  },
  previewHeader: {
    display: 'flex', background: '#4472C4',
  },
  previewTh: {
    padding: '3px 6px', color: '#fff', fontWeight: 600, minWidth: 55, textAlign: 'center',
  },
  previewFila: {
    display: 'flex',
  },
  previewTd: {
    padding: '2px 6px', minWidth: 55, textAlign: 'center', color: '#333',
    borderTop: '1px solid #e0e0e0',
  },
  flecha: {
    fontSize: 24, color: '#c8860a',
  },
  plantillaRow: {
    display: 'flex', alignItems: 'center', gap: 8, marginTop: 4,
  },
  excelIcon: {
    fontSize: 20,
  },
  btnPlantilla: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: '#1565c0', fontSize: 12, textDecoration: 'underline', padding: 0,
  },
  plantillaNote: {
    fontSize: 11, color: '#888',
  },
  // Paso 2
  fileZone: {
    border: '2px dashed #bbb', borderRadius: 4, padding: '20px',
    textAlign: 'center', cursor: 'pointer', background: '#fafafa',
  },
  fileNombre: {
    fontSize: 13, color: '#333',
  },
  filePlaceholder: {
    fontSize: 13, color: '#999',
  },
  errorMsg: {
    fontSize: 12, color: '#c00', padding: '6px 10px',
    background: '#FEF2F2', borderRadius: 3,
  },
  code: {
    fontSize: 11, background: '#f0f0f0', padding: '1px 4px',
    borderRadius: 2, fontFamily: 'monospace',
  },
  preview2: {
    display: 'flex', flexDirection: 'column', gap: 6,
  },
  preview2Titulo: {
    fontSize: 12, color: '#444',
  },
  tablaWrap: {
    maxHeight: 180, overflowY: 'auto', border: '1px solid #ddd', borderRadius: 3,
  },
  tabla: {
    width: '100%', borderCollapse: 'collapse', fontSize: 11,
  },
  th: {
    padding: '4px 6px', background: '#f0ede5', color: '#333',
    fontWeight: 600, textAlign: 'center', position: 'sticky', top: 0,
    borderBottom: '1px solid #d8d0c0',
  },
  td: {
    padding: '3px 6px', color: '#1a1a1a',
    borderBottom: '1px solid #eee', textAlign: 'center',
  },
  // Paso 3
  resultadoBox: {
    display: 'flex', gap: 24, justifyContent: 'center', padding: '16px 0',
  },
  resultStat: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
  },
  resultNum: {
    fontSize: 32, fontWeight: 700, color: '#2a7a2a',
  },
  resultLabel: {
    fontSize: 12, color: '#666',
  },
  erroresLista: {
    maxHeight: 120, overflowY: 'auto', fontSize: 11,
    display: 'flex', flexDirection: 'column', gap: 3,
  },
  errorFila: {
    padding: '3px 8px', background: '#FEF2F2', color: '#c00', borderRadius: 3,
  },
  // Footer
  footer: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 14px', borderTop: '1px solid #ddd', background: '#f5f5f3',
  },
  btnFooter: {
    fontSize: 12, padding: '4px 16px',
  },
}
