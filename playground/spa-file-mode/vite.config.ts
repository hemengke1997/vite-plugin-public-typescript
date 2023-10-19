import { defineConfig } from 'vite'
import { injectScripts, publicTypescript } from 'vite-plugin-public-typescript'
import react from '@vitejs/plugin-react'
import manifest from './public-typescript/manifest.json'

// https://vitejs.dev/config/
export default defineConfig(() => ({
  base: '/vite-plugin-public-typescript/',
  define: {
    custom_define: JSON.stringify('custom define!'),
    hello_world: JSON.stringify({ hello: 'world' }),
  },
  plugins: [
    react(),
    publicTypescript({
      inputDir: 'public-typescript',
      manifestName: 'manifest',
      hash: true,
      outputDir: 'out',
      destination: 'file',
    }),
    injectScripts([
      {
        attrs: { src: manifest.hmr },
        injectTo: 'body',
      },
      {
        attrs: {
          src: manifest.define,
        },
        injectTo: 'head',
      },
      {
        attrs: {
          src: manifest.env,
        },
        injectTo: 'head-prepend',
      },
    ]),
  ],
  clearScreen: true,
}))
