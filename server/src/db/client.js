const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})

pool.on('error', (err) => {
  console.error('Error en el pool de PostgreSQL:', err)
})

module.exports = pool
