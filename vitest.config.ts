/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', './playground/**/*.*', './playground-temp/**/*.*'],
    testTimeout: 20000,
    setupFiles: ['./tests/vitestSetup.ts'],
  },
})
