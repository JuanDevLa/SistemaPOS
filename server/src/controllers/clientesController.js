const pool = require('../db/client')

// Buscar clientes por nombre, teléfono o id
const buscar = async (request, reply) => {
  const { q, negocio_id } = request.query
  try {
    let rows
    if (!q || q.trim() === '') {
      const res = await pool.query(
        `SELECT c.id, c.nombre, c.apellidos, c.telefono, c.email, c.limite_credito,
                COALESCE(SUM(cr.saldo_pendiente), 0) AS saldo_actual,
                MIN(cr.creado_en) AS fecha_deuda_mas_antigua
         FROM clientes c
         LEFT JOIN creditos cr ON cr.cliente_id = c.id AND cr.estado != 'liquidado'
         WHERE c.activo = true
         GROUP BY c.id ORDER BY c.nombre ASC LIMIT 50`
      )
      rows = res.rows
    } else {
      const res = await pool.query(
        `SELECT c.id, c.nombre, c.apellidos, c.telefono, c.email, c.limite_credito,
                COALESCE(SUM(cr.saldo_pendiente), 0) AS saldo_actual,
                MIN(cr.creado_en) AS fecha_deuda_mas_antigua
         FROM clientes c
         LEFT JOIN creditos cr ON cr.cliente_id = c.id AND cr.estado != 'liquidado'
         WHERE c.activo = true
           AND (LOWER(c.nombre) LIKE LOWER($1) OR c.telefono LIKE $1 OR c.id::text = $2)
         GROUP BY c.id ORDER BY c.nombre ASC LIMIT 20`,
        [`%${q}%`, q]
      )
      rows = res.rows
    }
    return reply.send(rows)
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al buscar clientes' })
  }
}

// Estado de cuenta de un cliente (movimientos)
const estadoCuenta = async (request, reply) => {
  const { id } = request.params
  const { negocio_id } = request.query
  try {
    // Info del cliente
    const clienteRes = await pool.query(
      `SELECT c.id, c.nombre, c.telefono, c.email, c.limite_credito,
              COALESCE(SUM(cr.saldo_pendiente), 0) AS saldo_actual
       FROM clientes c
       LEFT JOIN creditos cr ON cr.cliente_id = c.id AND cr.estado != 'liquidado'
       WHERE c.id = $1 GROUP BY c.id`,
      [id]
    )
    if (clienteRes.rows.length === 0) return reply.code(404).send({ error: 'Cliente no encontrado' })
    const cliente = clienteRes.rows[0]

    // Movimientos: créditos y abonos
    const creditosRes = await pool.query(
      `SELECT cr.id, cr.venta_id, cr.monto_original, cr.saldo_pendiente, cr.estado, cr.creado_en,
              u.nombre AS cajero,
              'venta' AS tipo
       FROM creditos cr
       LEFT JOIN ventas v ON v.id = cr.venta_id
       LEFT JOIN usuarios u ON u.id = v.cajero_id
       WHERE cr.cliente_id = $1 AND cr.negocio_id = $2
       ORDER BY cr.creado_en DESC`,
      [id, negocio_id]
    )

    const abonosRes = await pool.query(
      `SELECT a.id, a.credito_id, a.monto, a.comentarios, a.creado_en,
              u.nombre AS cajero,
              'abono' AS tipo
       FROM abonos a
       LEFT JOIN usuarios u ON u.id = a.usuario_id
       WHERE a.cliente_id = $1 AND a.negocio_id = $2
       ORDER BY a.creado_en DESC`,
      [id, negocio_id]
    )

    return reply.send({ cliente, creditos: creditosRes.rows, abonos: abonosRes.rows })
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al obtener estado de cuenta' })
  }
}

// Detalle de una venta (para panel derecho)
const detalleVenta = async (request, reply) => {
  const { venta_id } = request.params
  try {
    const ventaRes = await pool.query(
      `SELECT v.id, v.fecha, v.total, v.metodo_pago, v.efectivo_recibido, v.cambio,
              u.nombre AS cajero, c.nombre AS cliente_nombre
       FROM ventas v
       LEFT JOIN usuarios u ON u.id = v.cajero_id
       LEFT JOIN clientes c ON c.id = (SELECT cliente_id FROM creditos WHERE venta_id = v.id LIMIT 1)
       WHERE v.id = $1`,
      [venta_id]
    )
    if (ventaRes.rows.length === 0) return reply.code(404).send({ error: 'Venta no encontrada' })

    const itemsRes = await pool.query(
      `SELECT vi.cantidad, vi.precio_unitario, vi.subtotal, p.nombre
       FROM venta_items vi
       JOIN productos p ON p.id = vi.producto_id
       WHERE vi.venta_id = $1`,
      [venta_id]
    )

    const creditoRes = await pool.query(
      `SELECT saldo_pendiente FROM creditos WHERE venta_id = $1 LIMIT 1`,
      [venta_id]
    )

    return reply.send({
      ...ventaRes.rows[0],
      items: itemsRes.rows,
      monto_pendiente: creditoRes.rows[0]?.saldo_pendiente || 0
    })
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al obtener detalle de venta' })
  }
}

// Reporte de saldos — todos los clientes con deuda
const reporteSaldos = async (request, reply) => {
  const { negocio_id } = request.query
  try {
    const res = await pool.query(
      `SELECT c.id, c.nombre, c.telefono, c.limite_credito,
              COALESCE(SUM(cr.saldo_pendiente), 0) AS saldo_actual,
              MAX(a.creado_en) AS ultimo_pago
       FROM clientes c
       JOIN creditos cr ON cr.cliente_id = c.id AND cr.estado != 'liquidado' AND cr.negocio_id = $1
       LEFT JOIN abonos a ON a.cliente_id = c.id AND a.negocio_id = $1
       WHERE c.activo = true
       GROUP BY c.id
       HAVING SUM(cr.saldo_pendiente) > 0
       ORDER BY saldo_actual DESC`,
      [negocio_id]
    )
    const totalRes = await pool.query(
      `SELECT COALESCE(SUM(cr.saldo_pendiente), 0) AS total
       FROM creditos cr
       WHERE cr.negocio_id = $1 AND cr.estado != 'liquidado'`,
      [negocio_id]
    )
    return reply.send({ clientes: res.rows, total: totalRes.rows[0].total })
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al obtener reporte de saldos' })
  }
}

// Listar clientes (para pantalla admin)
const listar = async (request, reply) => {
  const { negocio_id } = request.query
  try {
    const res = await pool.query(
      `SELECT c.id, c.nombre, c.apellidos, c.telefono, c.email,
              c.domicilio1, c.domicilio2, c.colonia, c.municipio,
              c.estado_residencia, c.codigo_postal, c.notas,
              c.limite_credito, c.credito_habilitado, c.activo,
              COALESCE(SUM(cr.saldo_pendiente), 0) AS saldo_actual
       FROM clientes c
       LEFT JOIN creditos cr ON cr.cliente_id = c.id AND cr.estado != 'liquidado'
       WHERE c.activo = true
       GROUP BY c.id ORDER BY c.nombre ASC`
    )
    return reply.send(res.rows)
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al listar clientes' })
  }
}

// Crear cliente
const crear = async (request, reply) => {
  const {
    nombre, apellidos, telefono, email,
    domicilio1, domicilio2, colonia, municipio,
    estado_residencia, codigo_postal, notas,
    limite_credito, credito_habilitado, negocio_id
  } = request.body

  if (!nombre || !negocio_id) {
    return reply.code(400).send({ error: 'Nombre y negocio son requeridos' })
  }

  try {
    const res = await pool.query(
      `INSERT INTO clientes
         (nombre, apellidos, telefono, email, domicilio1, domicilio2, colonia,
          municipio, estado_residencia, codigo_postal, notas,
          limite_credito, credito_habilitado, negocio_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        nombre, apellidos || null, telefono || null, email || null,
        domicilio1 || null, domicilio2 || null, colonia || null,
        municipio || null, estado_residencia || null, codigo_postal || null,
        notas || null, limite_credito || 0, credito_habilitado || false, negocio_id
      ]
    )
    return reply.code(201).send(res.rows[0])
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al crear cliente' })
  }
}

// Editar cliente
const editar = async (request, reply) => {
  const { id } = request.params
  const {
    nombre, apellidos, telefono, email,
    domicilio1, domicilio2, colonia, municipio,
    estado_residencia, codigo_postal, notas,
    limite_credito, credito_habilitado
  } = request.body

  try {
    const res = await pool.query(
      `UPDATE clientes SET
         nombre=$1, apellidos=$2, telefono=$3, email=$4,
         domicilio1=$5, domicilio2=$6, colonia=$7, municipio=$8,
         estado_residencia=$9, codigo_postal=$10, notas=$11,
         limite_credito=$12, credito_habilitado=$13,
         actualizado_en=NOW()
       WHERE id=$14 RETURNING *`,
      [
        nombre, apellidos || null, telefono || null, email || null,
        domicilio1 || null, domicilio2 || null, colonia || null,
        municipio || null, estado_residencia || null, codigo_postal || null,
        notas || null, limite_credito || 0, credito_habilitado || false, id
      ]
    )
    if (res.rows.length === 0) return reply.code(404).send({ error: 'Cliente no encontrado' })
    return reply.send(res.rows[0])
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al editar cliente' })
  }
}

// Desactivar cliente
const desactivar = async (request, reply) => {
  const { id } = request.params
  try {
    await pool.query(`UPDATE clientes SET activo=false WHERE id=$1`, [id])
    return reply.send({ success: true })
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al eliminar cliente' })
  }
}

module.exports = { buscar, estadoCuenta, detalleVenta, reporteSaldos, listar, crear, editar, desactivar }
