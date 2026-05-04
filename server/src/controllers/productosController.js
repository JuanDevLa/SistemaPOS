const pool = require('../db/client')
const audit = require('../services/auditService')

// Listar todos los productos activos.
// Si llega `negocio_id`, hace LEFT JOIN con inventario para incluir stock actual.
// Sin negocio_id, retorna solo el catálogo (caso admin global).
const listar = async (request, reply) => {
  const { categoria, negocio_id } = request.query

  const baseSelect = `
    SELECT p.id, p.codigo_barras, p.nombre, p.descripcion, p.precio, p.precio_mayoreo,
           p.costo, p.categoria, p.departamento_id, p.unidad, p.aplica_iva, p.activo
  `
  let query
  const params = []

  if (negocio_id) {
    params.push(negocio_id)
    query = `
      ${baseSelect}, COALESCE(i.cantidad, 0) AS stock
      FROM productos p
      LEFT JOIN inventario i ON i.producto_id = p.id AND i.negocio_id = $${params.length}
      WHERE p.activo = true
    `
  } else {
    query = `${baseSelect} FROM productos p WHERE p.activo = true`
  }

  if (categoria) {
    params.push(categoria)
    query += ` AND p.categoria = $${params.length}`
  }

  query += ' ORDER BY p.nombre ASC'

  try {
    const result = await pool.query(query, params)
    return reply.send(result.rows)
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al obtener productos' })
  }
}

// Buscar por nombre o código de barras
const buscar = async (request, reply) => {
  const { q, negocio_id } = request.query

  if (!q) {
    return reply.code(400).send({ error: 'Parámetro de búsqueda requerido' })
  }

  try {
    const result = await pool.query(
      `SELECT p.id, p.codigo_barras, p.nombre, p.precio, p.precio_mayoreo, p.costo,
              p.categoria, p.unidad, p.aplica_iva, p.activo, p.departamento_id,
              d.nombre AS departamento_nombre,
              COALESCE(i.cantidad, 0)      AS stock_actual,
              COALESCE(i.alerta_minima, 0) AS alerta_minima,
              COALESCE(i.maximo, 0)        AS maximo
       FROM productos p
       LEFT JOIN departamentos d ON d.id = p.departamento_id
       LEFT JOIN inventario i ON i.producto_id = p.id AND i.negocio_id = $3
       WHERE p.activo = true AND (
         p.codigo_barras = $1
         OR LOWER(p.nombre) LIKE LOWER($2)
       )
       ORDER BY p.nombre ASC
       LIMIT 20`,
      [q, `%${q}%`, negocio_id || null]
    )
    return reply.send(result.rows)
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al buscar productos' })
  }
}

// Obtener un producto por ID
const obtener = async (request, reply) => {
  const { id } = request.params

  try {
    const result = await pool.query(
      'SELECT id, codigo_barras, nombre, descripcion, precio, precio_mayoreo, costo, categoria, departamento_id, unidad, aplica_iva, activo FROM productos WHERE id = $1 AND activo = true',
      [id]
    )

    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'Producto no encontrado' })
    }

    return reply.send(result.rows[0])
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al obtener producto' })
  }
}

// Crear producto
const crear = async (request, reply) => {
  const { codigo_barras, nombre, descripcion, precio, precio_mayoreo, costo, departamento_id, unidad, aplica_iva, controla_lote } = request.body

  if (!nombre || !precio) {
    return reply.code(400).send({ error: 'Nombre y precio son requeridos' })
  }

  try {
    const result = await pool.query(
      `INSERT INTO productos (codigo_barras, nombre, descripcion, precio, precio_mayoreo, costo, departamento_id, unidad, aplica_iva, controla_lote)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, codigo_barras, nombre, precio, precio_mayoreo, departamento_id, unidad, aplica_iva, controla_lote, activo`,
      [codigo_barras || null, nombre, descripcion || null, precio, precio_mayoreo || null, costo || null, departamento_id || null, unidad || 'pieza', aplica_iva || false, controla_lote || false]
    )

    return reply.code(201).send(result.rows[0])
  } catch (err) {
    if (err.code === '23505') {
      return reply.code(409).send({ error: 'Ya existe un producto con ese código de barras' })
    }
    console.error(err)
    return reply.code(500).send({ error: 'Error al crear producto' })
  }
}

// Editar producto
const editar = async (request, reply) => {
  const { id } = request.params
  const { codigo_barras, nombre, descripcion, precio, precio_mayoreo, costo, departamento_id, unidad, aplica_iva } = request.body
  const usuario_id = request.user?.id

  if (!nombre || !precio) {
    return reply.code(400).send({ error: 'Nombre y precio son requeridos' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const prev = await client.query(
      `SELECT codigo_barras, nombre, precio, precio_mayoreo, costo, departamento_id, unidad, aplica_iva
       FROM productos WHERE id = $1 AND activo = true`,
      [id]
    )

    if (prev.rows.length === 0) {
      await client.query('ROLLBACK')
      return reply.code(404).send({ error: 'Producto no encontrado' })
    }

    const result = await client.query(
      `UPDATE productos
       SET codigo_barras = $1, nombre = $2, descripcion = $3, precio = $4,
           precio_mayoreo = $5, costo = $6, departamento_id = $7, unidad = $8,
           aplica_iva = $9, actualizado_en = CURRENT_TIMESTAMP
       WHERE id = $10 AND activo = true
       RETURNING id, codigo_barras, nombre, precio, precio_mayoreo, departamento_id, unidad, aplica_iva, activo`,
      [codigo_barras || null, nombre, descripcion || null, precio, precio_mayoreo || null, costo || null, departamento_id || null, unidad || 'pieza', aplica_iva || false, id]
    )

    await audit.registrar(client, {
      usuario_id,
      negocio_id: null, // productos es global
      accion: 'producto_actualizado',
      tabla: 'productos',
      referencia_id: parseInt(id),
      antes: prev.rows[0],
      despues: { codigo_barras, nombre, precio, precio_mayoreo, costo, departamento_id, unidad, aplica_iva }
    })

    await client.query('COMMIT')
    return reply.send(result.rows[0])
  } catch (err) {
    await client.query('ROLLBACK')
    if (err.code === '23505') {
      return reply.code(409).send({ error: 'Ya existe un producto con ese código de barras' })
    }
    console.error(err)
    return reply.code(500).send({ error: 'Error al editar producto' })
  } finally {
    client.release()
  }
}

// Desactivar producto (soft delete)
const desactivar = async (request, reply) => {
  const { id } = request.params

  try {
    // Bloquear si el producto está en una venta pendiente (ticket abierto)
    const enUso = await pool.query(
      `SELECT 1 FROM venta_items vi
       JOIN ventas v ON v.id = vi.venta_id
       WHERE vi.producto_id = $1 AND v.estado = 'pendiente'
       LIMIT 1`,
      [id]
    )
    if (enUso.rows.length > 0) {
      return reply.code(409).send({ error: 'El producto está en un ticket abierto y no puede eliminarse' })
    }

    const result = await pool.query(
      'UPDATE productos SET activo = false WHERE id = $1 RETURNING id, nombre',
      [id]
    )

    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'Producto no encontrado' })
    }

    // Registrar movimiento de baja por cada negocio que tenga este producto en inventario
    const invRows = await pool.query(
      'SELECT negocio_id, cantidad FROM inventario WHERE producto_id = $1',
      [id]
    )
    for (const inv of invRows.rows) {
      await pool.query(
        `INSERT INTO movimientos_inventario (producto_id, negocio_id, tipo, cantidad, notas)
         VALUES ($1, $2, 'baja', 0, $3)`,
        [id, inv.negocio_id, `Producto desactivado. Stock al momento: ${parseFloat(inv.cantidad)}`]
      )
    }

    return reply.send({ mensaje: 'Producto desactivado', producto: result.rows[0] })
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al desactivar producto' })
  }
}

// Importar bulk de productos desde CSV/Excel
const importar = async (request, reply) => {
  const { productos } = request.body

  if (!Array.isArray(productos) || productos.length === 0) {
    return reply.code(400).send({ error: 'Lista de productos requerida' })
  }

  let creados = 0
  let duplicados = 0
  const errores = []

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    for (const p of productos) {
      if (!p.nombre || !p.precio) {
        errores.push({ nombre: p.nombre || '(sin nombre)', motivo: 'Nombre y precio requeridos' })
        continue
      }

      try {
        const result = await client.query(
          `INSERT INTO productos (codigo_barras, nombre, descripcion, precio, precio_mayoreo, costo, departamento_id, unidad, aplica_iva)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (codigo_barras) DO NOTHING
           RETURNING id`,
          [
            p.codigo_barras || null,
            p.nombre,
            p.descripcion || null,
            parseFloat(p.precio),
            p.precio_mayoreo ? parseFloat(p.precio_mayoreo) : null,
            p.costo ? parseFloat(p.costo) : null,
            p.departamento_id ? parseInt(p.departamento_id) : null,
            p.unidad || 'pieza',
            p.aplica_iva || false,
          ]
        )
        if (result.rows.length > 0) creados++
        else duplicados++
      } catch {
        errores.push({ nombre: p.nombre, motivo: 'Error al insertar' })
      }
    }

    await client.query('COMMIT')
    return reply.send({ creados, duplicados, errores })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    return reply.code(500).send({ error: 'Error en importación' })
  } finally {
    client.release()
  }
}

const catalogo = async (request, reply) => {
  const { negocio_id, departamento_id } = request.query
  if (!negocio_id) return reply.code(400).send({ error: 'negocio_id requerido' })

  let where = 'p.activo = true'
  const params = [negocio_id]
  if (departamento_id) {
    params.push(departamento_id)
    where += ` AND p.departamento_id = $${params.length}`
  }

  try {
    const result = await pool.query(
      `SELECT
         p.id, p.codigo_barras, p.nombre,
         COALESCE(d.nombre, '- Sin Departamento -') AS departamento,
         p.departamento_id, p.categoria, p.aplica_iva, p.activo,
         COALESCE(p.costo, 0) AS costo,
         p.precio, COALESCE(p.precio_mayoreo, 0) AS precio_mayoreo,
         p.unidad, p.proveedor_id,
         COALESCE(pv.nombre, '') AS proveedor,
         COALESCE(i.cantidad, 0) AS existencia,
         COALESCE(i.alerta_minima, 0) AS inv_minimo,
         COALESCE(i.maximo, 0) AS inv_maximo
       FROM productos p
       LEFT JOIN departamentos d ON d.id = p.departamento_id
       LEFT JOIN proveedores pv ON pv.id = p.proveedor_id
       LEFT JOIN inventario i ON i.producto_id = p.id AND i.negocio_id = $1
       WHERE ${where}
       ORDER BY p.nombre ASC`,
      params
    )
    return reply.send(result.rows.map(r => ({
      ...r,
      costo:          parseFloat(r.costo),
      precio:         parseFloat(r.precio),
      precio_mayoreo: parseFloat(r.precio_mayoreo),
      existencia:     parseFloat(r.existencia),
      inv_minimo:     parseFloat(r.inv_minimo),
      inv_maximo:     parseFloat(r.inv_maximo),
    })))
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al obtener catalogo' })
  }
}

module.exports = { listar, buscar, obtener, crear, editar, desactivar, importar, catalogo }
