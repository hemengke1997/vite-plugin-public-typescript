import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { publicTypescript } from 'vite-plugin-public-typescript'

process.env.__Manifest_Path__ = __dirname

export default defineConfig({
  plugins: [react(), publicTypescript({ babel: true })],
  build: {
    minify: false,
  },
})
