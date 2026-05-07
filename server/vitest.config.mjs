import { defineConfig } from 'vitest/config'
import { config } from 'dotenv'

// Carga .env antes de que los módulos lean process.env
config({ path: new URL('.env', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1') })

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Los tests de integración (src/__tests__/) se excluyen del suite normal
    // para no requerir la BD de test en cada npm test.
    // Ejecutar con: npm run test:integration
    exclude: ['**/node_modules/**', 'src/__tests__/**'],
  },
})
