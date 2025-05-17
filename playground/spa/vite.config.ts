import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'
import { defineConfig } from 'vite'
import { injectScripts, publicTypescript } from 'vite-plugin-public-typescript'

process.env.__Manifest_Path__ = __dirname

// https://vitejs.dev/config/
export default defineConfig(() => ({
  base: '/vite-plugin-public-typescript/',
  server: {
    port: 3000,
  },
  define: {
    custom_define: JSON.stringify('custom define!'),
    hello_world: JSON.stringify({ hello: 'world' }),
  },
  plugins: [
    react(),
    publicTypescript({
      outputDir: 'out',
      destination: 'memory',
      babel: true,
    }),
    injectScripts((manifest) => [
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
      {
        attrs: {
          src: manifest['dir/level-1'],
        },
        injectTo: 'body',
      },
    ]),
    legacy({ renderLegacyChunks: true, renderModernChunks: true }),
  ],
  clearScreen: false,
}))
