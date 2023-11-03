import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { injectScripts, publicTypescript } from 'vite-plugin-public-typescript'

// https://vitejs.dev/config/
export default defineConfig(() => ({
  base: '/temp/',
  build: {
    minify: false,
  },
  define: {
    custom_define: JSON.stringify('custom define!'),
    hello_world: JSON.stringify({ hello: 'world' }),
  },
  plugins: [
    react(),
    legacy({
      modernPolyfills: ['es.array.at'],
      polyfills: ['es.array.at'],
    }),
    publicTypescript({
      inputDir: 'public-typescript',
      manifestName: 'manifest',
      outputDir: 'out',
      destination: 'file',
      babel: true,
    }),
    injectScripts((manifest) => [
      {
        attrs: {
          src: manifest.test,
        },
        injectTo: 'head-prepend',
      },
    ]),
  ],
  clearScreen: false,
}))
