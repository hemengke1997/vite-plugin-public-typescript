import path from 'node:path'
import type { HtmlTagDescriptor } from 'vite'
import { defineConfig } from 'vite'
import { publicTypescript } from 'vite-plugin-public-typescript'
import react from '@vitejs/plugin-react'
import fg from 'fast-glob'
import manifest from './publicTypescript/manifest.json'

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    haha: JSON.stringify('custom define!'),
    app: JSON.stringify({ hello: 'world' }),
  },
  plugins: [
    react(),
    publicTypescript({
      inputDir: 'publicTypescript',
      manifestName: 'manifest',
      hash: true,
      outputDir: '/',
    }),

    {
      name: 'add-script',
      async transformIndexHtml(html) {
        const scripts = fg.sync('./public/*.js')
        const tags: HtmlTagDescriptor[] = scripts.map((s) => {
          return {
            tag: 'script',
            attrs: {
              src: manifest[path.parse(s).name.split('.')[0]],
            },
            injectTo: 'head-prepend',
          }
        })

        return {
          html,
          tags,
        }
      },
    },
  ],
  clearScreen: false,
})
