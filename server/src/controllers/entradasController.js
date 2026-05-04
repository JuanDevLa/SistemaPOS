const pool = require('../db/client')

// Registrar entrada de mercancia
const crear = async (request, reply) => {
  const { negocio_id, proveedor, proveedor_id, items, notas } = request.body
  const usuario_id = request.user.id

  if (!negocio_id || !items || items.length === 0) {
    return reply.code(400).send({ error: 'negocio_id e items son requeridos' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Crear la entrada
    const entrada = await client.query(
      `INSERT INTO entradas_mercancia (negocio_id, usuario_id, proveedor, proveedor_id, notas)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, fecha`,
      [negocio_id, usuario_id, proveedor || 'Sin proveedor', proveedor_id || null, notas || null]
    )
    const entrada_id = entrada.rows[0].id

    // Obtener controla_lote de todos los productos en un solo query
    const productoIds = items.filter(i => i.producto_id).map(i => i.producto_id)
    const prodRes = await client.query(
      'SELECT id, controla_lote FROM productos WHERE id = ANY($1)',
      [productoIds]
    )
    const loteMap = {}
    prodRes.rows.forEach(r => { loteMap[r.id] = r.controla_lote })

    // Procesar cada item
    for (const item of items) {
      const { producto_id, costo_unitario, lote, fecha_caducidad } = item
      const cantidad = Math.round(parseFloat(item.cantidad) || 0)

      if (!producto_id || cantidad <= 0) continue

      // Validar lote si el producto lo requiere
      if (loteMap[producto_id] && !lote) {
        await client.query('ROLLBACK')
        return reply.code(400).send({ error: `El producto ID ${producto_id} requiere número de lote y fecha de caducidad` })
      }

      // Insertar item de la entrada (con lote y fecha_caducidad si aplica)
      await client.query(
        `INSERT INTO entradas_mercancia_items (entrada_id, producto_id, cantidad, costo_unitario, lote, fecha_caducidad)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [entrada_id, producto_id, cantidad, costo_unitario || null, lote || null, fecha_caducidad || null]
      )

      // Sumar al inventario total
      await client.query(
        `INSERT INTO inventario (producto_id, negocio_id, cantidad)
         VALUES ($1, $2, $3)
         ON CONFLICT (producto_id, negocio_id)
         DO UPDATE SET cantidad = inventario.cantidad + $3, actualizado_en = CURRENT_TIMESTAMP`,
        [producto_id, negocio_id, cantidad]
      )

      // Si controla_lote: upsert en producto_lotes (FEFO source)
      if (loteMap[producto_id] && lote) {
        await client.query(
          `INSERT INTO producto_lotes (producto_id, negocio_id, lote, fecha_caducidad, cantidad)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (producto_id, negocio_id, lote)
           DO UPDATE SET cantidad = producto_lotes.cantidad + EXCLUDED.cantidad`,
          [producto_id, negocio_id, lote, fecha_caducidad || null, cantidad]
        )
      }

      // Actualizar costo y/o precio de venta si se proporcionaron
      const { precio_nuevo } = item
      if (costo_unitario || precio_nuevo) {
        const sets = []
        const vals = []
        if (costo_unitario) { sets.push(`costo = $${sets.length + 1}`);  vals.push(costo_unitario) }
        if (precio_nuevo)   { sets.push(`precio = $${sets.length + 1}`); vals.push(precio_nuevo) }
        sets.push(`actualizado_en = CURRENT_TIMESTAMP`)
        vals.push(producto_id)
        await client.query(
          `UPDATE productos SET ${sets.join(', ')} WHERE id = $${vals.length}`,
          vals
        )
      }

      // Registrar movimiento
      await client.query(
        `INSERT INTO movimientos_inventario (producto_id, negocio_id, tipo, cantidad, referencia_id, usuario_id, notas)
         VALUES ($1, $2, 'entrada', $3, $4, $5, $6)`,
        [producto_id, negocio_id, cantidad, entrada_id, usuario_id, `Proveedor: ${proveedor || 'Sin proveedor'}${lote ? ` · Lote: ${lote}` : ''}`]
      )
    }

    await client.query('COMMIT')
    return reply.code(201).send({ entrada_id, fecha: entrada.rows[0].fecha, total_items: items.length })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    return reply.code(500).send({ error: 'Error al registrar entrada' })
  } finally {
    client.release()
  }
}

// Ver detalle de una entrada
const obtener = async (request, reply) => {
  const { id } = request.params

  try {
    const entrada = await pool.query(
      `SELECT e.id, e.fecha, e.proveedor, e.notas, u.nombre AS recibio
       FROM entradas_mercancia e
       LEFT JOIN usuarios u ON u.id = e.usuario_id
       WHERE e.id = $1`,
      [id]
    )

    if (entrada.rows.length === 0) {
      return reply.code(404).send({ error: 'Entrada no encontrada' })
    }

    const items = await pool.query(
      `SELECT p.nombre, p.codigo_barras, p.unidad, p.precio AS precio_venta,
              ei.cantidad, ei.costo_unitario
       FROM entradas_mercancia_items ei
       JOIN productos p ON p.id = ei.producto_id
       WHERE ei.entrada_id = $1
       ORDER BY p.nombre ASC`,
      [id]
    )

    return reply.send({ ...entrada.rows[0], items: items.rows })
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al obtener entrada' })
  }
}

// Listar entradas de un negocio
const listar = async (request, reply) => {
  const { negocio_id, proveedor } = request.query

  if (!negocio_id) {
    return reply.code(400).send({ error: 'negocio_id requerido' })
  }

  let query = `
    SELECT e.id, e.fecha, e.proveedor, e.notas, u.nombre AS recibio,
           COUNT(ei.id) AS total_productos
    FROM entradas_mercancia e
    LEFT JOIN usuarios u ON u.id = e.usuario_id
    LEFT JOIN entradas_mercancia_items ei ON ei.entrada_id = e.id
    WHERE e.negocio_id = $1`

  const params = [negocio_id]

  if (proveedor) {
    params.push(`%${proveedor}%`)
    query += ` AND LOWER(e.proveedor) LIKE LOWER($${params.length})`
  }

  query += ' GROUP BY e.id, u.nombre ORDER BY e.fecha DESC LIMIT 50'

  try {
    const result = await pool.query(query, params)
    return reply.send(result.rows)
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al listar entradas' })
  }
}

// Productos con stock bajo (sugeridos para reorden)
const sugeridas = async (request, reply) => {
  const { negocio_id } = request.query
  if (!negocio_id) return reply.code(400).send({ error: 'negocio_id requerido' })
  try {
    const res = await pool.query(
      `SELECT p.id, p.codigo_barras, p.nombre, p.costo,
              d.nombre AS departamento,
              i.cantidad AS existencia,
              i.alerta_minima AS minimo
       FROM inventario i
       JOIN productos p ON p.id = i.producto_id
       LEFT JOIN departamentos d ON d.id = p.departamento_id
       WHERE i.negocio_id = $1
         AND p.activo = true
         AND i.cantidad <= i.alerta_minima
       ORDER BY (i.cantidad - i.alerta_minima) ASC, p.nombre ASC`,
      [negocio_id]
    )
    return reply.send(res.rows)
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al obtener compras sugeridas' })
  }
}

module.exports = { crear, obtener, listar, sugeridas }
