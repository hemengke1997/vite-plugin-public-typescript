import { defineConfig, HtmlTagDescriptor } from 'vite'
import { publicTypescript } from 'vite-plugin-public-typescript'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
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
        const { spa } = await import('./publicTypescript/manifest.json')

        const tags: HtmlTagDescriptor[] = [
          {
            tag: 'script',
            attrs: {
              src: spa,
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
  ],
})
