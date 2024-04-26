import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { publicTypescript } from 'vite-plugin-public-typescript'

export default defineConfig({
  plugins: [react(), publicTypescript({ babel: true })],
  build: {
    minify: false,
  },
})
