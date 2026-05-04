const pool = require('../db/client')

const listar = async (req, reply) => {
  const { negocio_id, estado } = req.query
  if (!negocio_id) return reply.code(400).send({ error: 'negocio_id requerido' })

  let where = 'WHERE oc.negocio_id = $1'
  const params = [negocio_id]
  if (estado) { params.push(estado); where += ` AND oc.estado = $${params.length}` }

  const { rows } = await pool.query(`
    SELECT oc.id, oc.estado, oc.notas, oc.creada_en, oc.recibida_en, oc.entrada_id,
           oc.proveedor_nombre,
           p.id AS proveedor_id, p.nombre AS proveedor,
           COUNT(oci.id) AS total_items,
           COALESCE(SUM(oci.cantidad_pedida * oci.costo_unitario), 0) AS total_estimado
    FROM ordenes_compra oc
    LEFT JOIN proveedores p ON p.id = oc.proveedor_id
    LEFT JOIN ordenes_compra_items oci ON oci.orden_id = oc.id
    ${where}
    GROUP BY oc.id, p.id
    ORDER BY oc.creada_en DESC
  `, params)
  return rows
}

const detalle = async (req, reply) => {
  const { id } = req.params
  const { rows: [orden] } = await pool.query(`
    SELECT oc.*, p.nombre AS proveedor
    FROM ordenes_compra oc
    LEFT JOIN proveedores p ON p.id = oc.proveedor_id
    WHERE oc.id = $1
  `, [id])
  if (!orden) return reply.code(404).send({ error: 'Orden no encontrada' })

  const { rows: items } = await pool.query(`
    SELECT oci.*, pr.nombre, pr.codigo_barras,
           d.nombre AS departamento,
           inv.cantidad AS stock_actual
    FROM ordenes_compra_items oci
    JOIN productos pr ON pr.id = oci.producto_id
    LEFT JOIN departamentos d ON d.id = pr.departamento_id
    LEFT JOIN inventario inv ON inv.producto_id = oci.producto_id AND inv.negocio_id = $2
    WHERE oci.orden_id = $1
    ORDER BY oci.id
  `, [id, orden.negocio_id])

  return { ...orden, items }
}

const crear = async (req, reply) => {
  const { negocio_id, proveedor_id, proveedor_nombre, items, notas } = req.body
  if (!negocio_id || !items?.length) return reply.code(400).send({ error: 'Datos incompletos' })

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows: [orden] } = await client.query(`
      INSERT INTO ordenes_compra (negocio_id, proveedor_id, proveedor_nombre, notas)
      VALUES ($1, $2, $3, $4) RETURNING id
    `, [negocio_id, proveedor_id || null, proveedor_nombre || null, notas || null])

    for (const item of items) {
      await client.query(`
        INSERT INTO ordenes_compra_items (orden_id, producto_id, cantidad_pedida, costo_unitario)
        VALUES ($1, $2, $3, $4)
      `, [orden.id, item.producto_id, item.cantidad, item.costo_unitario || null])
    }

    await client.query('COMMIT')
    return { orden_id: orden.id, success: true }
  } catch (err) {
    await client.query('ROLLBACK')
    req.log.error(err)
    return reply.code(500).send({ error: 'Error al crear la orden' })
  } finally {
    client.release()
  }
}

const recibir = async (req, reply) => {
  const { id } = req.params
  const { items, notas } = req.body

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const { rows: [orden] } = await client.query(
      'SELECT * FROM ordenes_compra WHERE id = $1', [id]
    )
    if (!orden) { await client.query('ROLLBACK'); return reply.code(404).send({ error: 'Orden no encontrada' }) }
    if (orden.estado === 'recibida') { await client.query('ROLLBACK'); return reply.code(400).send({ error: 'Orden ya recibida' }) }

    // Crear entrada de mercancía
    const { rows: [entrada] } = await client.query(`
      INSERT INTO entradas_mercancia (negocio_id, proveedor, proveedor_id, notas)
      VALUES ($1, $2, $3, $4) RETURNING id
    `, [orden.negocio_id, orden.proveedor_nombre, orden.proveedor_id, notas || null])

    for (const item of items) {
      await client.query(`
        INSERT INTO entradas_mercancia_items (entrada_id, producto_id, cantidad, costo_unitario)
        VALUES ($1, $2, $3, $4)
      `, [entrada.id, item.producto_id, item.cantidad_recibida, item.costo_unitario || null])

      // Actualizar inventario
      await client.query(`
        INSERT INTO inventario (producto_id, negocio_id, cantidad)
        VALUES ($1, $2, $3)
        ON CONFLICT (producto_id, negocio_id)
        DO UPDATE SET cantidad = inventario.cantidad + EXCLUDED.cantidad,
                      actualizado_en = NOW()
      `, [item.producto_id, orden.negocio_id, item.cantidad_recibida])

      await client.query(`
        INSERT INTO movimientos_inventario (producto_id, negocio_id, tipo, cantidad, referencia_id, notas)
        VALUES ($1, $2, 'entrada', $3, $4, $5)
      `, [item.producto_id, orden.negocio_id, item.cantidad_recibida, parseInt(id), `Orden de compra #${id}`])

      // Actualizar costo/precio si se indicó
      if (item.costo_unitario) {
        await client.query(
          'UPDATE productos SET costo = $1, actualizado_en = NOW() WHERE id = $2',
          [item.costo_unitario, item.producto_id]
        )
      }
      if (item.precio_nuevo) {
        await client.query(
          'UPDATE productos SET precio = $1, actualizado_en = NOW() WHERE id = $2',
          [item.precio_nuevo, item.producto_id]
        )
      }
    }

    // Marcar orden como recibida
    await client.query(`
      UPDATE ordenes_compra SET estado = 'recibida', entrada_id = $1, recibida_en = NOW() WHERE id = $2
    `, [entrada.id, id])

    await client.query('COMMIT')
    return { entrada_id: entrada.id, success: true }
  } catch (err) {
    await client.query('ROLLBACK')
    req.log.error(err)
    return reply.code(500).send({ error: 'Error al recibir la orden' })
  } finally {
    client.release()
  }
}

const cancelar = async (req, reply) => {
  const { id } = req.params
  const { rows: [orden] } = await pool.query('SELECT estado FROM ordenes_compra WHERE id = $1', [id])
  if (!orden) return reply.code(404).send({ error: 'Orden no encontrada' })
  if (orden.estado === 'recibida') return reply.code(400).send({ error: 'No se puede cancelar una orden ya recibida' })
  await pool.query("UPDATE ordenes_compra SET estado = 'cancelada' WHERE id = $1", [id])
  return { success: true }
}

module.exports = { listar, detalle, crear, recibir, cancelar }
