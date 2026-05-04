const pool = require('../db/client')

const listar = async (request, reply) => {
  try {
    const res = await pool.query(
      `SELECT id, nombre, direccion, activo, folio_prefijo, folio_siguiente FROM negocios WHERE activo = true ORDER BY id`
    )
    return reply.send(res.rows)
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al listar negocios' })
  }
}

// Actualizar configuración de folios de un negocio
const actualizarFolios = async (request, reply) => {
  const { id } = request.params
  const { folio_prefijo, folio_siguiente } = request.body

  if (folio_siguiente !== undefined && (isNaN(folio_siguiente) || folio_siguiente < 1)) {
    return reply.code(400).send({ error: 'folio_siguiente debe ser un número mayor a 0' })
  }

  try {
    const sets = []
    const params = []
    if (folio_prefijo !== undefined) { params.push(folio_prefijo); sets.push(`folio_prefijo = $${params.length}`) }
    if (folio_siguiente !== undefined) { params.push(folio_siguiente); sets.push(`folio_siguiente = $${params.length}`) }
    if (sets.length === 0) return reply.code(400).send({ error: 'Nada que actualizar' })

    params.push(id)
    const res = await pool.query(
      `UPDATE negocios SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING id, nombre, folio_prefijo, folio_siguiente`,
      params
    )
    if (res.rows.length === 0) return reply.code(404).send({ error: 'Negocio no encontrado' })
    return reply.send(res.rows[0])
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al actualizar folios' })
  }
}

const actualizarTicket = async (request, reply) => {
  const { id } = request.params
  const { ticket_nombre, ticket_slogan, ticket_telefono, ticket_pie } = request.body

  try {
    const res = await pool.query(
      `UPDATE negocios
       SET ticket_nombre = $1, ticket_slogan = $2, ticket_telefono = $3, ticket_pie = $4
       WHERE id = $5
       RETURNING id, nombre, ticket_nombre, ticket_slogan, ticket_telefono, ticket_pie`,
      [ticket_nombre || null, ticket_slogan || null, ticket_telefono || null, ticket_pie || null, id]
    )
    if (res.rows.length === 0) return reply.code(404).send({ error: 'Negocio no encontrado' })
    return reply.send(res.rows[0])
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al actualizar ticket' })
  }
}

const obtenerConfig = async (request, reply) => {
  const { id } = request.params
  try {
    const res = await pool.query(
      `SELECT id,
              ocultar_efectivo_esperado, max_cortes_cajero_dia,
              iva_porcentaje, moneda_simbolo,
              sesion_inactividad_min, pin_max_intentos,
              devolucion_dias, devolucion_requiere_auth,
              stock_alerta_global, credito_limite_default,
              scanner_prefijo, scanner_sufijo, scanner_enter_auto,
              terminal_tipo, terminal_api_key,
              cajon_activo, cajon_pin,
              impresora_nombre, impresora_corte_auto, impresora_copias,
              compras_notif_email, compras_aprobacion_requerida,
              backup_frecuencia, backup_email,
              vencidos_bloquear
       FROM negocios WHERE id = $1`,
      [id]
    )
    if (res.rows.length === 0) return reply.code(404).send({ error: 'Negocio no encontrado' })
    return reply.send(res.rows[0])
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al obtener config' })
  }
}

// Campos permitidos con su validación: [tipo, min, max] — null = sin rango
const CONFIG_FIELDS = {
  ocultar_efectivo_esperado: ['bool'],
  max_cortes_cajero_dia:     ['int', 1, 20],
  iva_porcentaje:            ['float', 0, 100],
  moneda_simbolo:            ['str', 1, 5],
  sesion_inactividad_min:    ['int', 1, 480],
  pin_max_intentos:          ['int', 1, 10],
  devolucion_dias:           ['int', 0, 365],
  devolucion_requiere_auth:  ['bool'],
  stock_alerta_global:       ['int', 0, 9999],
  credito_limite_default:    ['float', 0, 999999],
  scanner_prefijo:           ['str', 0, 10],
  scanner_sufijo:            ['str', 0, 10],
  scanner_enter_auto:        ['bool'],
  terminal_tipo:             ['str', 0, 20],
  terminal_api_key:          ['str', 0, 500],
  cajon_activo:              ['bool'],
  cajon_pin:                 ['int', 0, 5],
  impresora_nombre:             ['str', 0, 100],
  impresora_corte_auto:         ['bool'],
  impresora_copias:             ['int', 1, 5],
  compras_notif_email:          ['str', 0, 100],
  compras_aprobacion_requerida: ['bool'],
  backup_frecuencia:            ['str', 0, 20],
  backup_email:                 ['str', 0, 100],
  vencidos_bloquear:            ['bool'],
}

const actualizarConfig = async (request, reply) => {
  const { id } = request.params
  const sets = []; const params = []

  for (const [campo, valor] of Object.entries(request.body)) {
    const spec = CONFIG_FIELDS[campo]
    if (!spec) continue
    const [tipo, min, max] = spec

    let v = valor
    if (tipo === 'int') {
      v = parseInt(valor, 10)
      if (isNaN(v) || v < min || v > max)
        return reply.code(400).send({ error: `${campo} debe ser entre ${min} y ${max}` })
    } else if (tipo === 'float') {
      v = parseFloat(valor)
      if (isNaN(v) || v < min || v > max)
        return reply.code(400).send({ error: `${campo} debe ser entre ${min} y ${max}` })
    } else if (tipo === 'str') {
      v = String(valor ?? '').trim()
      if (v.length > max)
        return reply.code(400).send({ error: `${campo} máximo ${max} caracteres` })
    } else if (tipo === 'bool') {
      v = Boolean(valor)
    }
    params.push(v)
    sets.push(`${campo} = $${params.length}`)
  }

  if (sets.length === 0) return reply.code(400).send({ error: 'Nada que actualizar' })

  try {
    params.push(id)
    const res = await pool.query(
      `UPDATE negocios SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING id`,
      params
    )
    if (res.rows.length === 0) return reply.code(404).send({ error: 'Negocio no encontrado' })
    return reply.send({ ok: true })
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al actualizar config' })
  }
}

const FORMAS_PAGO_DEFAULT = [
  { clave: 'efectivo',       nombre: 'Efectivo',            activo: true,  requiere_referencia: false },
  { clave: 'tarjeta_debito', nombre: 'Tarjeta débito',       activo: false, requiere_referencia: true  },
  { clave: 'tarjeta_credito',nombre: 'Tarjeta crédito',      activo: false, requiere_referencia: true  },
  { clave: 'transferencia',  nombre: 'Transferencia / SPEI', activo: false, requiere_referencia: true  },
  { clave: 'vale_despensa',  nombre: 'Vale despensa',        activo: false, requiere_referencia: false },
  { clave: 'credito_interno',nombre: 'Crédito / Fiado',      activo: false, requiere_referencia: false },
]

const listarFormasPago = async (request, reply) => {
  const { id } = request.params
  const client = await pool.connect()
  try {
    let res = await client.query(
      'SELECT id, clave, nombre, activo, requiere_referencia FROM formas_pago_negocio WHERE negocio_id=$1 ORDER BY id',
      [id]
    )
    if (res.rows.length === 0) {
      // seed defaults
      for (const f of FORMAS_PAGO_DEFAULT) {
        await client.query(
          `INSERT INTO formas_pago_negocio (negocio_id, clave, nombre, activo, requiere_referencia)
           VALUES ($1,$2,$3,$4,$5) ON CONFLICT (negocio_id, clave) DO NOTHING`,
          [id, f.clave, f.nombre, f.activo, f.requiere_referencia]
        )
      }
      res = await client.query(
        'SELECT id, clave, nombre, activo, requiere_referencia FROM formas_pago_negocio WHERE negocio_id=$1 ORDER BY id',
        [id]
      )
    }
    return reply.send(res.rows)
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al listar formas de pago' })
  } finally {
    client.release()
  }
}

const guardarFormasPago = async (request, reply) => {
  const { id } = request.params
  const items = request.body // [{ clave, activo, requiere_referencia }]
  if (!Array.isArray(items)) return reply.code(400).send({ error: 'Se esperaba un arreglo' })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    for (const item of items) {
      await client.query(
        `UPDATE formas_pago_negocio SET activo=$1, requiere_referencia=$2
         WHERE negocio_id=$3 AND clave=$4`,
        [item.activo, item.requiere_referencia, id, item.clave]
      )
    }
    await client.query('COMMIT')
    return reply.send({ ok: true })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    return reply.code(500).send({ error: 'Error al guardar formas de pago' })
  } finally {
    client.release()
  }
}

const crear = async (request, reply) => {
  const { nombre, direccion, rfc } = request.body
  if (!nombre?.trim()) return reply.code(400).send({ error: 'El nombre es requerido' })
  try {
    const res = await pool.query(
      `INSERT INTO negocios (nombre, direccion, rfc) VALUES ($1,$2,$3)
       RETURNING id, nombre, direccion, rfc, activo`,
      [nombre.trim(), direccion || null, rfc || null]
    )
    return reply.code(201).send(res.rows[0])
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al crear negocio' })
  }
}

const actualizar = async (request, reply) => {
  const { id } = request.params
  const { nombre, direccion, rfc, activo } = request.body
  if (nombre !== undefined && !nombre?.trim()) return reply.code(400).send({ error: 'El nombre no puede estar vacío' })

  const sets = []; const params = []
  if (nombre   !== undefined) { params.push(nombre.trim()); sets.push(`nombre=$${params.length}`) }
  if (direccion !== undefined) { params.push(direccion);    sets.push(`direccion=$${params.length}`) }
  if (rfc      !== undefined) { params.push(rfc);          sets.push(`rfc=$${params.length}`) }
  if (activo   !== undefined) { params.push(activo);       sets.push(`activo=$${params.length}`) }
  if (sets.length === 0) return reply.code(400).send({ error: 'Nada que actualizar' })

  try {
    params.push(id)
    const res = await pool.query(
      `UPDATE negocios SET ${sets.join(',')} WHERE id=$${params.length}
       RETURNING id, nombre, direccion, rfc, activo`,
      params
    )
    if (res.rows.length === 0) return reply.code(404).send({ error: 'Negocio no encontrado' })
    return reply.send(res.rows[0])
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al actualizar negocio' })
  }
}

const eliminar = async (request, reply) => {
  const { id } = request.params
  try {
    const check = await pool.query('SELECT COUNT(*) FROM ventas WHERE negocio_id=$1', [id])
    if (parseInt(check.rows[0].count, 10) > 0) {
      return reply.code(409).send({ error: 'No se puede eliminar: el negocio tiene ventas registradas' })
    }
    const res = await pool.query('DELETE FROM negocios WHERE id=$1 RETURNING id', [id])
    if (res.rows.length === 0) return reply.code(404).send({ error: 'Negocio no encontrado' })
    return reply.send({ ok: true })
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al eliminar negocio' })
  }
}

const TABLAS_EXPORT = [
  'negocios', 'usuarios', 'productos', 'inventario',
  'clientes', 'departamentos', 'unidades_medida',
  'ventas', 'venta_items', 'cortes_caja',
  'movimientos_inventario', 'movimientos_caja',
]

const exportarBackup = async (request, reply) => {
  try {
    const snapshot = { exportado_en: new Date().toISOString(), tablas: {} }
    for (const tabla of TABLAS_EXPORT) {
      const res = await pool.query(`SELECT * FROM ${tabla} ORDER BY id`)
      snapshot.tablas[tabla] = res.rows
    }
    reply.header('Content-Disposition', `attachment; filename="backup-${Date.now()}.json"`)
    reply.header('Content-Type', 'application/json')
    return reply.send(JSON.stringify(snapshot, null, 2))
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al generar backup' })
  }
}

module.exports = {
  listar, actualizarFolios, actualizarTicket,
  obtenerConfig, actualizarConfig,
  listarFormasPago, guardarFormasPago,
  crear, actualizar, eliminar,
  exportarBackup,
}
