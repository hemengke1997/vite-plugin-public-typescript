import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { publicTypescript } from 'vite-plugin-public-typescript'

export default defineConfig({
  plugins: [react(), publicTypescript({ destination: 'memory' })],
  build: {
    minify: false,
  },
})
