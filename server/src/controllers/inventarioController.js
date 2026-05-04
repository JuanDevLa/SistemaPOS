const pool = require('../db/client')
const audit = require('../services/auditService')

// Ver inventario de un negocio
const listar = async (request, reply) => {
  const { negocio_id } = request.query

  if (!negocio_id) {
    return reply.code(400).send({ error: 'negocio_id requerido' })
  }

  try {
    const result = await pool.query(
      `SELECT
        i.id,
        p.id AS producto_id,
        p.codigo_barras,
        p.nombre,
        p.unidad,
        p.precio,
        p.costo,
        p.departamento_id,
        d.nombre AS departamento_nombre,
        i.cantidad,
        i.alerta_minima,
        i.maximo,
        CASE WHEN i.cantidad <= i.alerta_minima THEN true ELSE false END AS stock_bajo
       FROM inventario i
       JOIN productos p ON p.id = i.producto_id
       LEFT JOIN departamentos d ON d.id = p.departamento_id
       WHERE i.negocio_id = $1 AND p.activo = true
       ORDER BY p.nombre ASC`,
      [negocio_id]
    )

    return reply.send(result.rows)
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al obtener inventario' })
  }
}

// Ver productos con stock bajo
const stockBajo = async (request, reply) => {
  const { negocio_id } = request.query

  if (!negocio_id) {
    return reply.code(400).send({ error: 'negocio_id requerido' })
  }

  try {
    const result = await pool.query(
      `SELECT
        p.id AS producto_id,
        p.codigo_barras,
        p.nombre,
        p.categoria,
        COALESCE(d.nombre, p.categoria) AS departamento,
        p.precio,
        p.costo,
        i.cantidad,
        i.alerta_minima,
        i.maximo
       FROM inventario i
       JOIN productos p ON p.id = i.producto_id
       LEFT JOIN departamentos d ON d.id = p.departamento_id
       WHERE i.negocio_id = $1 AND p.activo = true AND i.alerta_minima > 0 AND i.cantidad <= i.alerta_minima
       ORDER BY i.cantidad ASC`,
      [negocio_id]
    )

    return reply.send(result.rows)
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al obtener stock bajo' })
  }
}

const TIPOS_AJUSTE = ['ajuste', 'merma', 'robo', 'dañado', 'error_captura']

// Ajuste manual de inventario (admin)
const ajustar = async (request, reply) => {
  const { producto_id, negocio_id, cantidad, alerta_minima, maximo, tipo, notas } = request.body
  const usuario_id = request.user.id

  if (!producto_id || !negocio_id || cantidad === undefined) {
    return reply.code(400).send({ error: 'producto_id, negocio_id y cantidad son requeridos' })
  }

  const tipoFinal = TIPOS_AJUSTE.includes(tipo) ? tipo : 'ajuste'
  const cantidadInt = Math.round(parseFloat(cantidad))

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const prev = await client.query(
      `SELECT cantidad, alerta_minima, maximo FROM inventario WHERE producto_id = $1 AND negocio_id = $2`,
      [producto_id, negocio_id]
    )
    const cantidadAnterior = prev.rows[0]?.cantidad ?? null

    const inv = await client.query(
      `INSERT INTO inventario (producto_id, negocio_id, cantidad, alerta_minima, maximo)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (producto_id, negocio_id)
       DO UPDATE SET cantidad = $3,
         alerta_minima = COALESCE($4, inventario.alerta_minima),
         maximo = COALESCE($5, inventario.maximo),
         actualizado_en = CURRENT_TIMESTAMP
       RETURNING cantidad`,
      [producto_id, negocio_id, cantidadInt, alerta_minima || 10, maximo || null]
    )

    await client.query(
      `INSERT INTO movimientos_inventario (producto_id, negocio_id, tipo, cantidad, usuario_id, notas)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [producto_id, negocio_id, tipoFinal, cantidadInt, usuario_id, notas || 'Ajuste manual']
    )

    await audit.registrar(client, {
      usuario_id,
      negocio_id,
      accion: 'ajuste_inventario',
      tabla: 'inventario',
      referencia_id: producto_id,
      antes: { cantidad: cantidadAnterior },
      despues: { cantidad, tipo: tipoFinal, motivo: notas || 'Ajuste manual' }
    })

    await client.query('COMMIT')
    return reply.send({ mensaje: 'Inventario actualizado', cantidad: inv.rows[0].cantidad })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    return reply.code(500).send({ error: 'Error al ajustar inventario' })
  } finally {
    client.release()
  }
}

// Carga inicial de inventario (primer día)
const cargaInicial = async (request, reply) => {
  const { negocio_id, productos } = request.body
  const usuario_id = request.user.id

  if (!negocio_id || !productos || productos.length === 0) {
    return reply.code(400).send({ error: 'negocio_id y lista de productos requeridos' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    for (const item of productos) {
      const { producto_id, cantidad, alerta_minima } = item

      await client.query(
        `INSERT INTO inventario (producto_id, negocio_id, cantidad, alerta_minima)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (producto_id, negocio_id)
         DO UPDATE SET cantidad = $3, alerta_minima = COALESCE($4, inventario.alerta_minima), actualizado_en = CURRENT_TIMESTAMP`,
        [producto_id, negocio_id, cantidad, alerta_minima || 10]
      )

      await client.query(
        `INSERT INTO movimientos_inventario (producto_id, negocio_id, tipo, cantidad, usuario_id, notas)
         VALUES ($1, $2, 'carga_inicial', $3, $4, 'Carga inicial de inventario')`,
        [producto_id, negocio_id, cantidad, usuario_id]
      )
    }

    await client.query('COMMIT')
    return reply.send({ mensaje: 'Carga inicial completada', total: productos.length })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    return reply.code(500).send({ error: 'Error en carga inicial' })
  } finally {
    client.release()
  }
}

// Historial de movimientos de inventario con filtros
const movimientos = async (request, reply) => {
  const { negocio_id, producto_id, desde, hasta } = request.query

  if (!negocio_id) {
    return reply.code(400).send({ error: 'negocio_id requerido' })
  }

  try {
    const params = [negocio_id]
    let filtros = ''

    // Si el usuario no es admin y no tiene ver_movimientos_inv, solo ve sus propios movimientos
    const user = request.user
    const verTodos = user.rol === 'admin' || user.permisos?.ver_movimientos_inv === true
    if (!verTodos) {
      params.push(user.id)
      filtros += ` AND m.usuario_id = $${params.length}`
    }

    if (producto_id) {
      params.push(producto_id)
      filtros += ` AND m.producto_id = $${params.length}`
    }

    if (desde) {
      params.push(desde)
      filtros += ` AND m.creado_en >= $${params.length}`
    }

    if (hasta) {
      params.push(hasta)
      filtros += ` AND m.creado_en < $${params.length}`
    }

    // El CTE calcula habia/hay sobre TODOS los movimientos del negocio antes de filtrar por
    // fecha/usuario/producto, para que el stock acumulado sea correcto aunque se filtre el día.
    const query = `
      WITH todos AS (
        SELECT
          m.id, m.producto_id, m.negocio_id, m.tipo, m.cantidad,
          m.usuario_id, m.notas, m.creado_en,
          SUM(m.cantidad) OVER (
            PARTITION BY m.producto_id, m.negocio_id
            ORDER BY m.creado_en, m.id
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
          ) AS hay,
          COALESCE(SUM(m.cantidad) OVER (
            PARTITION BY m.producto_id, m.negocio_id
            ORDER BY m.creado_en, m.id
            ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
          ), 0) AS habia
        FROM movimientos_inventario m
        WHERE m.negocio_id = $1
      )
      SELECT
        t.id,
        p.id AS producto_id,
        p.nombre AS producto,
        p.codigo_barras,
        p.categoria,
        COALESCE(d.nombre, p.categoria) AS departamento,
        p.costo,
        p.precio,
        i.cantidad AS stock_actual,
        i.alerta_minima,
        i.maximo,
        t.tipo,
        t.cantidad,
        t.notas,
        u.nombre AS usuario,
        t.creado_en,
        t.hay,
        t.habia
      FROM todos t
      JOIN productos p ON p.id = t.producto_id
      LEFT JOIN departamentos d ON d.id = p.departamento_id
      LEFT JOIN inventario i ON i.producto_id = t.producto_id AND i.negocio_id = t.negocio_id
      LEFT JOIN usuarios u ON u.id = t.usuario_id
      WHERE TRUE${filtros.replace(/\bm\./g, 't.')}
      ORDER BY t.creado_en DESC
      LIMIT 500`

    const result = await pool.query(query, params)
    return reply.send(result.rows)
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al obtener movimientos' })
  }
}

// Inversión: suma cantidad × costo por categoría
const inversion = async (request, reply) => {
  const { negocio_id } = request.query

  if (!negocio_id) {
    return reply.code(400).send({ error: 'negocio_id requerido' })
  }

  try {
    const result = await pool.query(
      `SELECT
        COALESCE(p.categoria, 'Sin categoría') AS categoria,
        SUM(i.cantidad * COALESCE(p.costo, 0)) AS inversion,
        SUM(i.cantidad) AS unidades
       FROM inventario i
       JOIN productos p ON p.id = i.producto_id
       WHERE i.negocio_id = $1 AND p.activo = true AND i.cantidad > 0
       GROUP BY p.categoria
       ORDER BY inversion DESC`,
      [negocio_id]
    )

    const total = result.rows.reduce((s, r) => s + parseFloat(r.inversion), 0)
    return reply.send({ total, por_categoria: result.rows })
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al calcular inversión' })
  }
}

module.exports = { listar, stockBajo, ajustar, cargaInicial, movimientos, inversion }
