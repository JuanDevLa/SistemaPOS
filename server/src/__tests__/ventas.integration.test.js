// Tests de integración — requieren pdv_test en Postgres local.
// Ejecutar: npm run test:integration
const { Pool } = require('pg')
const { config } = require('dotenv')
config()

const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL })

afterAll(async () => {
  await pool.end()
})

// Limpia las tablas relevantes entre suites para que los tests sean idempotentes
beforeEach(async () => {
  await pool.query(`
    TRUNCATE venta_items, ventas, movimientos_inventario, movimientos_caja,
             inventario, productos, cortes_caja, usuarios, negocios
    RESTART IDENTITY CASCADE
  `)
})

// ── Helpers ───────────────────────────────────────────────────────────────────

async function insertarNegocio(nombre = 'Farmacia Test') {
  const { rows } = await pool.query(
    `INSERT INTO negocios (nombre, folio_siguiente, folio_prefijo)
     VALUES ($1, 1, 'T') RETURNING id`,
    [nombre]
  )
  return rows[0].id
}

async function insertarUsuario(negocio_id) {
  const { rows } = await pool.query(
    `INSERT INTO usuarios (nombre, pin, rol, negocio_id, permisos, activo)
     VALUES ('Cajero Test', '0000', 'cajero', $1, '{"cobrar_ticket":true}'::jsonb, true)
     RETURNING id`,
    [negocio_id]
  )
  return rows[0].id
}

async function insertarProducto(precio = 25.00) {
  const { rows } = await pool.query(
    `INSERT INTO productos (nombre, codigo_barras, precio, activo)
     VALUES ('Paracetamol Test', '7501030472006', $1, true) RETURNING id`,
    [precio]
  )
  return rows[0].id
}

async function setInventario(producto_id, negocio_id, cantidad) {
  await pool.query(
    `INSERT INTO inventario (producto_id, negocio_id, cantidad)
     VALUES ($1, $2, $3)
     ON CONFLICT (producto_id, negocio_id) DO UPDATE SET cantidad = $3`,
    [producto_id, negocio_id, cantidad]
  )
}

// ── Tests de schema ───────────────────────────────────────────────────────────

describe('schema — tablas críticas existen', () => {
  const tablas = [
    'negocios', 'usuarios', 'productos', 'inventario',
    'ventas', 'venta_items', 'movimientos_inventario',
    'movimientos_caja', 'cortes_caja', 'audit_logs',
  ]

  it.each(tablas)('tabla %s existe', async (tabla) => {
    const { rows } = await pool.query(
      `SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = $1`,
      [tabla]
    )
    expect(rows).toHaveLength(1)
  })
})

// ── Tests de transacción ventas ───────────────────────────────────────────────

describe('ventas — transacción completa', () => {
  it('inserta venta + items y descuenta inventario en una transacción', async () => {
    const negocio_id = await insertarNegocio()
    const cajero_id  = await insertarUsuario(negocio_id)
    const producto_id = await insertarProducto(25.00)
    await setInventario(producto_id, negocio_id, 10)

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const ventaRes = await client.query(
        `INSERT INTO ventas (negocio_id, cajero_id, folio, total, metodo_pago, fecha)
         VALUES ($1, $2, 'T000001', 50.00, 'efectivo', NOW()) RETURNING id`,
        [negocio_id, cajero_id]
      )
      const venta_id = ventaRes.rows[0].id

      await client.query(
        `INSERT INTO venta_items (venta_id, producto_id, cantidad, precio_unitario, subtotal)
         VALUES ($1, $2, 2, 25.00, 50.00)`,
        [venta_id, producto_id]
      )

      await client.query(
        `UPDATE inventario SET cantidad = cantidad - $1
         WHERE producto_id = $2 AND negocio_id = $3`,
        [2, producto_id, negocio_id]
      )

      await client.query(
        `INSERT INTO movimientos_inventario
           (producto_id, negocio_id, tipo, cantidad, referencia_id, usuario_id)
         VALUES ($1, $2, 'venta', $3, $4, $5)`,
        [producto_id, negocio_id, -2, venta_id, cajero_id]
      )

      await client.query('COMMIT')

      // Verificaciones post-commit
      const { rows: invRows } = await pool.query(
        'SELECT cantidad FROM inventario WHERE producto_id = $1 AND negocio_id = $2',
        [producto_id, negocio_id]
      )
      expect(parseFloat(invRows[0].cantidad)).toBe(8)

      const { rows: movRows } = await pool.query(
        'SELECT cantidad FROM movimientos_inventario WHERE referencia_id = $1',
        [venta_id]
      )
      expect(parseFloat(movRows[0].cantidad)).toBe(-2)
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {})
      client.release()
      throw err
    }
    client.release()
  })

  it('hace ROLLBACK si falla una inserción — inventario no cambia', async () => {
    const negocio_id = await insertarNegocio()
    const cajero_id  = await insertarUsuario(negocio_id)
    const producto_id = await insertarProducto(25.00)
    await setInventario(producto_id, negocio_id, 5)

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      await client.query(
        `INSERT INTO ventas (negocio_id, cajero_id, folio, total, metodo_pago, fecha)
         VALUES ($1, $2, 'T000002', 25.00, 'efectivo', NOW())`,
        [negocio_id, cajero_id]
      )

      // FK inválida → fuerza error
      await expect(
        client.query(
          `INSERT INTO venta_items (venta_id, producto_id, cantidad, precio_unitario, subtotal)
           VALUES (99999, $1, 1, 25.00, 25.00)`,
          [producto_id]
        )
      ).rejects.toThrow()

      await client.query('ROLLBACK')
      client.release()
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {})
      client.release()
      throw err
    }

    const { rows } = await pool.query(
      'SELECT cantidad FROM inventario WHERE producto_id = $1 AND negocio_id = $2',
      [producto_id, negocio_id]
    )
    expect(parseFloat(rows[0].cantidad)).toBe(5)
  })
})
