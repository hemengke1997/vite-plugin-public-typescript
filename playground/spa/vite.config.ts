import type { HtmlTagDescriptor } from 'vite'
import { defineConfig } from 'vite'
import { injectScripts, publicTypescript } from 'vite-plugin-public-typescript'
import react from '@vitejs/plugin-react'
import manifest from './public-typescript/manifest.json'

// https://vitejs.dev/config/
export default defineConfig((env) => ({
  base: '/spa',
  define: {
    haha: JSON.stringify('custom define!'),
    app: JSON.stringify({ hello: 'world' }),
  },
  plugins: [
    react(),
    {
      name: 'transform-demo',
      async transformIndexHtml(html) {
        const tags: HtmlTagDescriptor[] = [
          {
            tag: 'script',
            attrs: {
              'src': manifest.test,
              'data-vppt': true,
            },
            injectTo: 'head-prepend',
          },
        ]

        html = html.replace('Vite + React + TS', env.command === 'build' ? 'build' : 'serve')

        return {
          html,
          tags,
        }
      },
    },
    publicTypescript({
      inputDir: 'public-typescript',
      manifestName: 'manifest',
      hash: true,
      outputDir: 'out',
      destination: 'memory',
    }),
    injectScripts([
      {
        attrs: {
          'src': manifest.haha,
          'data-n': '1',
        },
        injectTo: 'head',
      },
      {
        attrs: {
          src: manifest.index,
        },
        injectTo: 'head-prepend',
      },
    ]),
  ],
  clearScreen: true,
}))
