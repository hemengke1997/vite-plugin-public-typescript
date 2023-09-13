import type { HtmlTagDescriptor } from 'vite'
import { defineConfig } from 'vite'
import { publicTypescript } from 'vite-plugin-public-typescript'
import react from '@vitejs/plugin-react'
import manifest from './public-typescript/manifest.json'

// https://vitejs.dev/config/
export default defineConfig({
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
      outputDir: '/js',
      destination: 'memory',
    }),

    {
      name: 'add-script',
      async transformIndexHtml(html) {
        const tags: HtmlTagDescriptor[] = [
          {
            tag: 'script',
            attrs: {
              src: manifest.test,
            },
            injectTo: 'body',
          },
        ]

        return {
          html,
          tags,
        }
      },
    },
  ],
  clearScreen: true,
})
