import { defineConfig } from 'vite'
import { publicTypescript } from 'vite-plugin-public-typescript'

console.log(process.env.BASE, 'process.env.BASE')

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.BASE,
  plugins: [publicTypescript({ destination: 'memory' })],
})
