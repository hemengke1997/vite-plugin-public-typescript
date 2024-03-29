import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)

const { defineConfig } = require('@minko-fe/eslint-config')
export default defineConfig([
  {
    rules: {
      'import/no-mutable-exports': 'off',
    },
  },
])
