require('dotenv').config()
const bcrypt = require('bcrypt')
const pool = require('./client')

const seed = async () => {
  try {
    console.log('Agregando datos de prueba...')

    // Crear 2 negocios fijos
    const negocios = [
      ['Farmacia Noriega', 'Calle Principal 123'],
      ['Crucero Independencia', 'Avenida Central 456']
    ]

    let negocio_id = 1
    for (const [nombre, direccion] of negocios) {
      await pool.query(
        'INSERT INTO negocios (id, nombre, direccion) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [negocio_id, nombre, direccion]
      )
      negocio_id++
    }
    console.log('✓ Negocios creados: Farmacia Noriega, Crucero Independencia')

    // Crear dueña (admin)
    const passwordHash = await bcrypt.hash('admin123', 10)
    await pool.query(
      'INSERT INTO usuarios (nombre, password_hash, rol) VALUES ($1, $2, $3)',
      ['admin', passwordHash, 'admin']
    )
    console.log('✓ Admin creado: usuario="admin", password="admin123"')

    // Crear Admin POS (rol admin con PIN, login en cualquier negocio)
    await pool.query(
      `INSERT INTO usuarios (nombre, pin, rol, negocio_id, permisos)
       VALUES ($1, $2, $3, NULL, '{}'::jsonb)
       ON CONFLICT DO NOTHING`,
      ['Admin', '1234', 'admin']
    )
    console.log('✓ Admin POS creado: usuario="Admin", PIN="1234"')

    console.log('\nDatos de prueba agregados correctamente')
    process.exit(0)
  } catch (err) {
    console.error('Error:', err.message)
    process.exit(1)
  }
}

seed()
