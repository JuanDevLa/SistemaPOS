import { execSync } from 'child_process'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { resolve, dirname } from 'path'

const __dir = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dir, '../../')

config({ path: resolve(root, '.env') })

export async function setup() {
  const testUrl = process.env.TEST_DATABASE_URL
  if (!testUrl) {
    throw new Error('TEST_DATABASE_URL no está configurado en server/.env')
  }

  console.log('[test] Migrando base de datos de prueba pdv_test...')
  execSync('node src/db/migrate.js', {
    env: { ...process.env, DATABASE_URL: testUrl },
    cwd: root,
    stdio: 'pipe',
  })
  console.log('[test] Schema listo.')
}
