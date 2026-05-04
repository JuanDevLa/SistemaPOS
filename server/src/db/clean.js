require('dotenv').config()
const pool = require('./client')

const clean = async () => {
  try {
    await pool.query('DELETE FROM movimientos_inventario')
    await pool.query('DELETE FROM venta_items')
    await pool.query('DELETE FROM ventas')
    await pool.query('DELETE FROM cortes_caja')
    await pool.query('DELETE FROM entradas_mercancia_items')
    await pool.query('DELETE FROM entradas_mercancia')
    await pool.query('DELETE FROM inventario')
    await pool.query('DELETE FROM productos')
    await pool.query('DELETE FROM usuarios')
    await pool.query('DELETE FROM negocios')
    console.log('Base de datos limpia')
    process.exit(0)
  } catch (err) {
    console.error('Error:', err.message)
    process.exit(1)
  }
}

clean()
