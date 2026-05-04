const pool = require('../db/client')
const audit = require('../services/auditService')

// Redondeo a 2 decimales evitando drift de IEEE 754 al acumular floats
const round2 = (n) => Math.round((parseFloat(n) || 0) * 100) / 100

// Guard cross-tenant: retorna mensaje de error o null (admin siempre pasa)
const errNegocio = (venta_negocio_id, user) =>
  user.rol !== 'admin' && venta_negocio_id !== user.negocio_id
    ? 'Venta de otro negocio' : null

// Restaura cantidades a lotes cuando venta_items contiene lote_id
const restaurarLotes = async (client, items) => {
  for (const item of items) {
    if (item.lote_id) {
      await client.query(
        'UPDATE producto_lotes SET cantidad = cantidad + $1 WHERE id = $2',
        [item.cantidad, item.lote_id]
      )
    }
  }
}

// Registrar una venta completa
const crear = async (request, reply) => {
  const {
    negocio_id, items, metodo_pago, efectivo_recibido, monto_tarjeta, descuento, corte_id,
    // Campos extra para sincronización offline → online (E3.2)
    folio: folioCliente, fecha: fechaCliente, cliente_id, descuento_global
  } = request.body
  const cajero_id = request.user.id

  if (!negocio_id || !items || items.length === 0) {
    return reply.code(400).send({ error: 'negocio_id e items son requeridos' })
  }
  if (!metodo_pago) {
    return reply.code(400).send({ error: 'metodo_pago requerido' })
  }

  for (const item of items) {
    if (!item.producto_id || !(item.cantidad > 0)) {
      return reply.code(400).send({ error: 'Cada item requiere producto_id y cantidad > 0' })
    }
    if (!(parseFloat(item.precio_unitario) >= 0)) {
      return reply.code(400).send({ error: 'precio_unitario no puede ser negativo' })
    }
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    if (corte_id && request.user.rol !== 'admin') {
      const corteCheck = await client.query(
        `SELECT id FROM cortes_caja WHERE id = $1 AND estado = 'abierto' AND cajero_id = $2`,
        [corte_id, cajero_id]
      )
      if (corteCheck.rows.length === 0) {
        await client.query('ROLLBACK')
        return reply.code(400).send({ error: 'corte_id inválido o no pertenece al cajero activo' })
      }
    }

    // Obtener config del negocio (folio + iva + lotes) — lock atómico ANTES del loop
    const negocioRow = await client.query(
      `SELECT folio_prefijo, folio_siguiente, iva_porcentaje, vencidos_bloquear FROM negocios WHERE id = $1 FOR UPDATE`,
      [negocio_id]
    )
    let folio = null
    let ivaPct = 0
    let vencidosBloquear = true
    if (negocioRow.rows.length > 0) {
      const { folio_prefijo, folio_siguiente, iva_porcentaje, vencidos_bloquear } = negocioRow.rows[0]
      vencidosBloquear = vencidos_bloquear !== false
      ivaPct = parseFloat(iva_porcentaje) || 0
      // Si la venta vino sincronizada con folio del offline, respetarlo (es el ticket que el cliente se llevó)
      if (folioCliente) {
        folio = folioCliente
      } else {
        folio = `${folio_prefijo || ''}${String(folio_siguiente).padStart(6, '0')}`
        await client.query(
          `UPDATE negocios SET folio_siguiente = folio_siguiente + 1 WHERE id = $1`,
          [negocio_id]
        )
      }
    }

    // Validar que cliente_id pertenezca al mismo negocio (evita fiado cross-tenant)
    if (cliente_id) {
      const cli = await client.query(
        'SELECT negocio_id FROM clientes WHERE id = $1',
        [cliente_id]
      )
      if (cli.rows.length === 0 || cli.rows[0].negocio_id !== negocio_id) {
        await client.query('ROLLBACK')
        return reply.code(400).send({ error: 'Cliente no pertenece a este negocio' })
      }
    }

    // Obtener aplica_iva y controla_lote por producto ANTES del loop
    const productoIds = items.map(i => i.producto_id)
    const ivaRes = await client.query(
      `SELECT id, aplica_iva, controla_lote FROM productos WHERE id = ANY($1)`,
      [productoIds]
    )
    const ivaMap = {}
    const loteCtrlMap = {}
    ivaRes.rows.forEach(r => { ivaMap[r.id] = r.aplica_iva; loteCtrlMap[r.id] = r.controla_lote })

    let subtotal = 0
    let ivaTotal = 0
    const itemsDetalle = []
    // loteDeducMap: producto_id → { primary_lote_id, deductions: [{lote_id, cantidad}] }
    const loteDeducMap = {}

    // Validar stock, FEFO lotes y calcular totales
    for (const item of items) {
      const { producto_id, cantidad, precio_unitario, descuento_item = 0 } = item

      const inv = await client.query(
        `SELECT i.cantidad, p.nombre
         FROM inventario i
         JOIN productos p ON p.id = i.producto_id
         WHERE i.producto_id = $1 AND i.negocio_id = $2 FOR UPDATE`,
        [producto_id, negocio_id]
      )

      if (inv.rows.length === 0) {
        await client.query('ROLLBACK')
        return reply.code(400).send({ error: `El producto no tiene inventario registrado en este negocio` })
      }

      const { cantidad: disponible, nombre: nombreProducto } = inv.rows[0]
      if (parseFloat(disponible) < cantidad) {
        await client.query('ROLLBACK')
        return reply.code(400).send({ error: `Sin existencia: "${nombreProducto}" — disponible: ${disponible}, solicitado: ${cantidad}` })
      }

      // FEFO: validar y planear deducción por lotes si el producto los controla
      if (loteCtrlMap[producto_id]) {
        const fechaFiltro = vencidosBloquear
          ? `AND (pl.fecha_caducidad IS NULL OR pl.fecha_caducidad >= CURRENT_DATE)`
          : ''
        const lotes = await client.query(
          `SELECT pl.id, pl.lote, pl.fecha_caducidad, pl.cantidad
           FROM producto_lotes pl
           WHERE pl.producto_id = $1 AND pl.negocio_id = $2 AND pl.cantidad > 0
           ${fechaFiltro}
           ORDER BY pl.fecha_caducidad ASC NULLS LAST, pl.id ASC
           FOR UPDATE`,
          [producto_id, negocio_id]
        )
        const totalLotes = lotes.rows.reduce((s, l) => s + parseFloat(l.cantidad), 0)
        if (totalLotes < cantidad) {
          await client.query('ROLLBACK')
          const motivo = vencidosBloquear ? 'lotes válidos (no vencidos)' : 'lotes'
          return reply.code(400).send({
            error: `Sin existencia en ${motivo}: "${nombreProducto}" — disponible: ${totalLotes}, solicitado: ${cantidad}`
          })
        }
        const deductions = []
        let remaining = cantidad
        for (const lote of lotes.rows) {
          if (remaining <= 0) break
          const tomar = Math.min(parseFloat(lote.cantidad), remaining)
          deductions.push({ lote_id: lote.id, cantidad: tomar })
          remaining = round2(remaining - tomar)
        }
        loteDeducMap[producto_id] = { primary_lote_id: deductions[0].lote_id, deductions }
      }

      const itemSubtotal = round2((precio_unitario * cantidad) - descuento_item)
      const ivaItem = ivaMap[producto_id] && ivaPct > 0
        ? round2(itemSubtotal * ivaPct / (100 + ivaPct))
        : 0
      subtotal += itemSubtotal
      ivaTotal += ivaItem
      itemsDetalle.push({ producto_id, cantidad, precio_unitario, descuento_item, itemSubtotal, ivaItem })
    }

    subtotal = round2(subtotal)
    ivaTotal = round2(ivaTotal)
    const descuentoTotal = round2(descuento || 0)
    const total = round2(subtotal - descuentoTotal)
    let cambio = 0
    if (metodo_pago === 'efectivo' && efectivo_recibido) {
      cambio = round2(efectivo_recibido - total)
    } else if (metodo_pago === 'mixto' && efectivo_recibido && monto_tarjeta) {
      cambio = round2(Math.max(0, efectivo_recibido - (total - parseFloat(monto_tarjeta))))
    }

    // Crear la venta. Si viene `fechaCliente` (sync de offline), respetarla; si no, default CURRENT_TIMESTAMP.
    // descuento_global: serializado por pg como JSONB; null si no aplica.
    const descGlobalJson = descuento_global ? JSON.stringify(descuento_global) : null
    const venta = await client.query(
      `INSERT INTO ventas (
        negocio_id, cajero_id, corte_id, subtotal, descuento, total, iva_total,
        metodo_pago, efectivo_recibido, monto_tarjeta, cambio, folio, descuento_global, fecha
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, COALESCE($14::timestamp, CURRENT_TIMESTAMP))
       RETURNING id, total, cambio, fecha, folio, iva_total`,
      [
        negocio_id, cajero_id, corte_id || null, subtotal, descuentoTotal, total, ivaTotal,
        metodo_pago, efectivo_recibido || null, monto_tarjeta || 0, cambio, folio, descGlobalJson, fechaCliente || null
      ]
    )
    const venta_id = venta.rows[0].id

    // Insertar items, descontar inventario y aplicar FEFO en lotes
    for (const item of itemsDetalle) {
      const loteInfo = loteDeducMap[item.producto_id]
      const primary_lote_id = loteInfo?.primary_lote_id || null

      await client.query(
        `INSERT INTO venta_items (venta_id, producto_id, cantidad, precio_unitario, descuento, subtotal, iva, lote_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [venta_id, item.producto_id, item.cantidad, item.precio_unitario, item.descuento_item, item.itemSubtotal, item.ivaItem, primary_lote_id]
      )

      // Descontar del inventario total
      await client.query(
        `UPDATE inventario SET cantidad = cantidad - $1, actualizado_en = CURRENT_TIMESTAMP
         WHERE producto_id = $2 AND negocio_id = $3`,
        [item.cantidad, item.producto_id, negocio_id]
      )

      // Descontar de lotes en orden FEFO
      if (loteInfo) {
        for (const d of loteInfo.deductions) {
          await client.query(
            `UPDATE producto_lotes SET cantidad = cantidad - $1 WHERE id = $2`,
            [d.cantidad, d.lote_id]
          )
        }
      }

      // Registrar movimiento
      await client.query(
        `INSERT INTO movimientos_inventario (producto_id, negocio_id, tipo, cantidad, referencia_id, usuario_id)
         VALUES ($1, $2, 'venta', $3, $4, $5)`,
        [item.producto_id, negocio_id, -item.cantidad, venta_id, cajero_id]
      )
    }

    // Si viene cliente_id con método crédito, materializar el fiado (caso típico del sync offline).
    if (cliente_id && metodo_pago === 'credito') {
      await client.query(
        `INSERT INTO creditos (cliente_id, venta_id, negocio_id, monto_original, saldo_pendiente, estado)
         VALUES ($1, $2, $3, $4, $4, 'pendiente')`,
        [cliente_id, venta_id, negocio_id, total]
      )
    }

    await audit.registrar(client, {
      usuario_id: cajero_id,
      negocio_id,
      accion: 'venta_creada',
      tabla: 'ventas',
      referencia_id: venta_id,
      despues: { folio, total, metodo_pago, items_count: itemsDetalle.length, cliente_id: cliente_id || null }
    })

    await client.query('COMMIT')

    return reply.code(201).send({
      venta_id,
      folio:     venta.rows[0].folio,
      total:     venta.rows[0].total,
      iva_total: venta.rows[0].iva_total,
      cambio:    venta.rows[0].cambio,
      fecha:     venta.rows[0].fecha
    })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    return reply.code(500).send({ error: 'Error al registrar venta' })
  } finally {
    client.release()
  }
}

// Ver detalle de una venta
const obtener = async (request, reply) => {
  const { id } = request.params

  try {
    const venta = await pool.query(
      `SELECT v.id, v.fecha, v.subtotal, v.descuento, v.total, v.metodo_pago,
              v.efectivo_recibido, v.cambio, v.estado,
              u.nombre AS cajero
       FROM ventas v
       LEFT JOIN usuarios u ON u.id = v.cajero_id
       WHERE v.id = $1`,
      [id]
    )

    if (venta.rows.length === 0) {
      return reply.code(404).send({ error: 'Venta no encontrada' })
    }

    const negErr = errNegocio(venta.rows[0].negocio_id, request.user)
    if (negErr) return reply.code(403).send({ error: negErr })

    const items = await pool.query(
      `SELECT vi.producto_id, vi.cantidad, vi.precio_unitario, vi.descuento, vi.subtotal,
              p.nombre, p.codigo_barras, p.unidad
       FROM venta_items vi
       JOIN productos p ON p.id = vi.producto_id
       WHERE vi.venta_id = $1`,
      [id]
    )

    return reply.send({ ...venta.rows[0], items: items.rows })
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al obtener venta' })
  }
}

// Listar ventas de un negocio con filtros
const listar = async (request, reply) => {
  const { negocio_id, fecha_inicio, fecha_fin, cajero_id } = request.query

  if (!negocio_id) {
    return reply.code(400).send({ error: 'negocio_id requerido' })
  }

  if (request.user.rol !== 'admin' && parseInt(negocio_id) !== request.user.negocio_id) {
    return reply.code(403).send({ error: 'Acceso denegado a ventas de otro negocio' })
  }

  let query = `
    SELECT v.id, v.fecha, v.total, v.metodo_pago, v.estado, u.nombre AS cajero
    FROM ventas v
    LEFT JOIN usuarios u ON u.id = v.cajero_id
    WHERE v.negocio_id = $1 AND v.estado = 'completada'`

  const params = [negocio_id]

  if (fecha_inicio) {
    params.push(fecha_inicio)
    query += ` AND v.fecha >= $${params.length}`
  }
  if (fecha_fin) {
    params.push(fecha_fin)
    query += ` AND v.fecha <= $${params.length}`
  }
  if (cajero_id) {
    params.push(cajero_id)
    query += ` AND v.cajero_id = $${params.length}`
  }

  query += ' ORDER BY v.fecha DESC LIMIT 100'

  try {
    const result = await pool.query(query, params)
    return reply.send(result.rows)
  } catch (err) {
    console.error(err)
    return reply.code(500).send({ error: 'Error al listar ventas' })
  }
}

// Cancelar una venta (restaura inventario)
const cancelar = async (request, reply) => {
  const { id } = request.params
  const { motivo } = request.body
  const usuario_id = request.user.id

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const venta = await client.query(
      `SELECT id, negocio_id, estado, metodo_pago, total, efectivo_recibido, monto_tarjeta, cambio, corte_id, folio
       FROM ventas WHERE id = $1`,
      [id]
    )

    if (venta.rows.length === 0) {
      await client.query('ROLLBACK')
      return reply.code(404).send({ error: 'Venta no encontrada' })
    }

    if (venta.rows[0].estado === 'cancelada') {
      await client.query('ROLLBACK')
      return reply.code(400).send({ error: 'La venta ya está cancelada' })
    }

    const v = venta.rows[0]
    const negocio_id = v.negocio_id

    const negErr = errNegocio(negocio_id, request.user)
    if (negErr) {
      await client.query('ROLLBACK')
      return reply.code(403).send({ error: negErr })
    }

    // Cancelar la venta
    await client.query(
      "UPDATE ventas SET estado = 'cancelada' WHERE id = $1",
      [id]
    )

    // Calcular efectivo a devolver de la caja según método de pago
    // efectivo: total cobrado | mixto: efectivo_recibido - cambio | tarjeta: 0
    let efectivoSalida = 0
    if (v.metodo_pago === 'efectivo') {
      efectivoSalida = parseFloat(v.total) || 0
    } else if (v.metodo_pago === 'mixto') {
      efectivoSalida = (parseFloat(v.efectivo_recibido) || 0) - (parseFloat(v.cambio) || 0)
    }

    if (efectivoSalida > 0) {
      // Vincular al corte original solo si sigue abierto
      let corteIdSalida = null
      if (v.corte_id) {
        const corte = await client.query(
          "SELECT id FROM cortes_caja WHERE id = $1 AND estado = 'abierto'",
          [v.corte_id]
        )
        if (corte.rows.length > 0) corteIdSalida = v.corte_id
      }

      await client.query(
        `INSERT INTO movimientos_caja (negocio_id, usuario_id, corte_id, tipo, monto, motivo)
         VALUES ($1, $2, $3, 'salida', $4, $5)`,
        [negocio_id, usuario_id, corteIdSalida, efectivoSalida, `Cancelación venta ${v.folio || `#${id}`}${motivo ? ' — ' + motivo : ''}`]
      )
    }

    // Si la venta fue a fiado, cancelar el crédito asociado y reembolsar abonos en caja
    const credito = await client.query(
      `SELECT id, saldo_pendiente, monto_original FROM creditos WHERE venta_id = $1`,
      [id]
    )

    if (credito.rows.length > 0) {
      const creditoId = credito.rows[0].id

      // Sumar abonos previos (asumidos en efectivo — tabla abonos no diferencia método)
      const abonosRes = await client.query(
        `SELECT COALESCE(SUM(monto), 0) AS total FROM abonos WHERE credito_id = $1`,
        [creditoId]
      )
      const totalAbonos = parseFloat(abonosRes.rows[0].total) || 0

      // Marcar crédito como cancelado (preserva historial; no se elimina para auditoría)
      await client.query(
        `UPDATE creditos SET estado = 'cancelado', saldo_pendiente = 0 WHERE id = $1`,
        [creditoId]
      )

      // Si hubo abonos cobrados, devolver ese efectivo en caja
      if (totalAbonos > 0) {
        let corteIdAbonos = null
        if (v.corte_id) {
          const corte = await client.query(
            "SELECT id FROM cortes_caja WHERE id = $1 AND estado = 'abierto'",
            [v.corte_id]
          )
          if (corte.rows.length > 0) corteIdAbonos = v.corte_id
        }

        await client.query(
          `INSERT INTO movimientos_caja (negocio_id, usuario_id, corte_id, tipo, monto, motivo)
           VALUES ($1, $2, $3, 'salida', $4, $5)`,
          [negocio_id, usuario_id, corteIdAbonos, totalAbonos, `Cancelación venta fiada ${v.folio || `#${id}`} — devolución de abonos`]
        )
      }
    }

    // Restaurar inventario y lotes
    const items = await client.query(
      'SELECT producto_id, cantidad, lote_id FROM venta_items WHERE venta_id = $1',
      [id]
    )

    for (const item of items.rows) {
      await client.query(
        'UPDATE inventario SET cantidad = cantidad + $1 WHERE producto_id = $2 AND negocio_id = $3',
        [item.cantidad, item.producto_id, negocio_id]
      )

      await client.query(
        `INSERT INTO movimientos_inventario (producto_id, negocio_id, tipo, cantidad, referencia_id, usuario_id, notas)
         VALUES ($1, $2, 'devolucion', $3, $4, $5, $6)`,
        [item.producto_id, negocio_id, item.cantidad, id, usuario_id, motivo || 'Venta cancelada']
      )
    }

    await restaurarLotes(client, items.rows)

    await audit.registrar(client, {
      usuario_id,
      negocio_id,
      accion: 'venta_cancelada',
      tabla: 'ventas',
      referencia_id: parseInt(id),
      antes: { estado: 'completada', total: v.total, metodo_pago: v.metodo_pago, folio: v.folio },
      despues: { estado: 'cancelada', motivo: motivo || null }
    })

    await client.query('COMMIT')
    return reply.send({ mensaje: 'Venta cancelada y inventario restaurado' })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    return reply.code(500).send({ error: 'Error al cancelar venta' })
  } finally {
    client.release()
  }
}

// Devolución parcial de una venta
const devolucion = async (request, reply) => {
  const { id } = request.params
  const { items, monto_efectivo_devuelto } = request.body
  const usuario_id = request.user.id

  if (!items || items.length === 0) {
    return reply.code(400).send({ error: 'items requeridos' })
  }

  const efectivoDevuelto = parseFloat(monto_efectivo_devuelto) || 0
  if (efectivoDevuelto < 0) {
    return reply.code(400).send({ error: 'monto_efectivo_devuelto no puede ser negativo' })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const venta = await client.query(
      'SELECT id, negocio_id, estado, corte_id, folio FROM ventas WHERE id = $1',
      [id]
    )

    if (venta.rows.length === 0) {
      await client.query('ROLLBACK')
      return reply.code(404).send({ error: 'Venta no encontrada' })
    }

    if (venta.rows[0].estado === 'cancelada') {
      await client.query('ROLLBACK')
      return reply.code(400).send({ error: 'No se puede devolver una venta cancelada' })
    }

    const v = venta.rows[0]
    const negocio_id = v.negocio_id

    const negErr = errNegocio(negocio_id, request.user)
    if (negErr) {
      await client.query('ROLLBACK')
      return reply.code(403).send({ error: negErr })
    }

    for (const item of items) {
      const vi = await client.query(
        'SELECT cantidad, lote_id FROM venta_items WHERE venta_id = $1 AND producto_id = $2',
        [id, item.producto_id]
      )
      if (vi.rows.length === 0) {
        await client.query('ROLLBACK')
        return reply.code(400).send({ error: `Producto ${item.producto_id} no está en esta venta` })
      }

      const acum = await client.query(
        `SELECT COALESCE(SUM(di.cantidad), 0) AS d
         FROM devoluciones d
         JOIN devolucion_items di ON di.devolucion_id = d.id
         WHERE d.venta_id = $1 AND di.producto_id = $2`,
        [id, item.producto_id]
      )
      const yaDevuelto = parseFloat(acum.rows[0].d)
      if (item.cantidad + yaDevuelto > parseFloat(vi.rows[0].cantidad)) {
        await client.query('ROLLBACK')
        return reply.code(400).send({ error: `Devolución excede lo vendido para producto ${item.producto_id} (ya devuelto: ${yaDevuelto})` })
      }

      item._lote_id = vi.rows[0].lote_id
    }

    const dev = await client.query(
      'INSERT INTO devoluciones (venta_id, negocio_id, usuario_id) VALUES ($1, $2, $3) RETURNING id',
      [id, negocio_id, usuario_id]
    )
    const devolucion_id = dev.rows[0].id

    for (const item of items) {
      await client.query(
        'INSERT INTO devolucion_items (devolucion_id, producto_id, cantidad) VALUES ($1, $2, $3)',
        [devolucion_id, item.producto_id, item.cantidad]
      )

      await client.query(
        `UPDATE inventario SET cantidad = cantidad + $1, actualizado_en = CURRENT_TIMESTAMP
         WHERE producto_id = $2 AND negocio_id = $3`,
        [item.cantidad, item.producto_id, negocio_id]
      )

      await client.query(
        `INSERT INTO movimientos_inventario (producto_id, negocio_id, tipo, cantidad, referencia_id, usuario_id, notas)
         VALUES ($1, $2, 'devolucion', $3, $4, $5, 'Devolución parcial')`,
        [item.producto_id, negocio_id, item.cantidad, id, usuario_id]
      )

      if (item._lote_id) {
        await client.query(
          'UPDATE producto_lotes SET cantidad = cantidad + $1 WHERE id = $2',
          [item.cantidad, item._lote_id]
        )
      }
    }

    // Si se devolvió efectivo al cliente, registrar salida de caja
    if (efectivoDevuelto > 0) {
      let corteIdSalida = null
      if (v.corte_id) {
        const corte = await client.query(
          "SELECT id FROM cortes_caja WHERE id = $1 AND estado = 'abierto'",
          [v.corte_id]
        )
        if (corte.rows.length > 0) corteIdSalida = v.corte_id
      }

      await client.query(
        `INSERT INTO movimientos_caja (negocio_id, usuario_id, corte_id, tipo, monto, motivo)
         VALUES ($1, $2, $3, 'salida', $4, $5)`,
        [negocio_id, usuario_id, corteIdSalida, efectivoDevuelto, `Devolución venta ${v.folio || `#${id}`}`]
      )
    }

    await audit.registrar(client, {
      usuario_id,
      negocio_id,
      accion: 'devolucion_parcial',
      tabla: 'ventas',
      referencia_id: parseInt(id),
      despues: { devolucion_id, items, monto_efectivo_devuelto: efectivoDevuelto, folio: v.folio }
    })

    await client.query('COMMIT')
    return reply.code(201).send({ devolucion_id, monto_efectivo_devuelto: efectivoDevuelto })
  } catch (err) {
    await client.query('ROLLBACK')
    console.error(err)
    return reply.code(500).send({ error: 'Error al registrar devolución' })
  } finally {
    client.release()
  }
}

module.exports = { crear, obtener, listar, cancelar, devolucion }
