/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    testTimeout: 20000,
    setupFiles: ['./tests/vitestSetup.ts'],
  },
})
