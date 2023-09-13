import type { HtmlTagDescriptor, PluginOption } from 'vite'
import { defineConfig } from 'vite'
import { publicTypescript } from 'vite-plugin-public-typescript'
import react from '@vitejs/plugin-react'
import { createHtmlPlugin } from 'vite-plugin-html'
import manifest from './public-typescript/manifest.json'

function setupHtml() {
  const tags: Parameters<typeof createHtmlPlugin>[0] = {
    minify: false,
    inject: {
      tags: [],
    },
  }

  tags.inject?.tags?.push(
    ...([
      {
        tag: 'script',
        attrs: {
          src: manifest.index,
        },
        injectTo: 'head-prepend',
      },
    ] as HtmlTagDescriptor[]),
  )
  const htmlPlugin: PluginOption[] = createHtmlPlugin(tags)
  return htmlPlugin
}

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    haha: JSON.stringify('custom define!'),
    app: JSON.stringify({ hello: 'world' }),
  },
  plugins: [
    react(),
    {
      name: 'add-script',
      transformIndexHtml: {
        order: 'pre',
        handler(html) {
          const tags: HtmlTagDescriptor[] = [
            {
              tag: 'script',
              attrs: {
                src: manifest.test,
              },
              injectTo: 'head-prepend',
            },
          ]

          return {
            html,
            tags,
          }
        },
      },
    },
    setupHtml(),
    publicTypescript({
      inputDir: 'public-typescript',
      manifestName: 'manifest',
      hash: true,
      destination: 'memory',
    }),
  ],
  clearScreen: true,
})
