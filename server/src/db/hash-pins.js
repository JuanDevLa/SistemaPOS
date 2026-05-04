require('dotenv').config()
const bcrypt = require('bcrypt')
const pool = require('./client')

const run = async () => {
  try {
    const { rows } = await pool.query(
      "SELECT id, nombre, pin FROM usuarios WHERE pin IS NOT NULL AND pin_hash IS NULL"
    )
    console.log(`Usuarios con PIN plano: ${rows.length}`)
    for (const u of rows) {
      const hash = await bcrypt.hash(u.pin, 10)
      await pool.query('UPDATE usuarios SET pin_hash = $1, pin = NULL WHERE id = $2', [hash, u.id])
      console.log(`  ✓ ${u.nombre} (id=${u.id}) migrado`)
    }
    console.log('Listo')
    process.exit(0)
  } catch (err) {
    console.error('Error:', err.message)
    process.exit(1)
  }
}

run()
