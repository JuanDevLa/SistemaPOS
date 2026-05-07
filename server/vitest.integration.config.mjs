import { defineConfig } from 'vitest/config'
import { config } from 'dotenv'

config({ path: new URL('.env', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1') })

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/__tests__/**/*.test.js'],
    globalSetup: './src/__tests__/globalSetup.mjs',
    testTimeout: 15000,
  },
})
