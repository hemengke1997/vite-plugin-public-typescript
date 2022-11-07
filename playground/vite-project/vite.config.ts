import { defineConfig } from 'vite'
import { publicTypescript } from 'vite-plugin-public-typescript'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    publicTypescript({
      manifestName: 'custom-manifest',
      hash: true,
      outputDir: 'lib',
    }),
  ],
})
