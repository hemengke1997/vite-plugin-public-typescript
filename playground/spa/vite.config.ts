import { defineConfig } from 'vite'
import { injectScripts, publicTypescript } from 'vite-plugin-public-typescript'
import react from '@vitejs/plugin-react'
import manifest from './public-typescript/manifest.json'

// https://vitejs.dev/config/
export default defineConfig(() => ({
  base: '/vite-plugin-public-typescript/',
  define: {
    haha: JSON.stringify('custom define!'),
    app: JSON.stringify({ hello: 'world' }),
  },
  plugins: [
    react(),
    publicTypescript({
      inputDir: 'public-typescript',
      manifestName: 'manifest',
      hash: true,
      outputDir: 'out',
      destination: 'memory',
    }),
    injectScripts([
      {
        attrs: { src: manifest.hmr },
        injectTo: 'body',
      },
      {
        attrs: {
          src: manifest.haha,
        },
        injectTo: 'head',
      },
      {
        attrs: {
          src: manifest.index,
        },
        injectTo: 'head-prepend',
      },
      {
        attrs: {
          src: manifest.test,
        },
        injectTo: 'body-prepend',
      },
    ]),
  ],
  clearScreen: true,
}))
