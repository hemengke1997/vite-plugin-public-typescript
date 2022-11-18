import { defineConfig, HtmlTagDescriptor } from 'vite'
import { publicTypescript } from 'vite-plugin-public-typescript'
import manifest from './publicTypescript/manifest.json'
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
      transformIndexHtml(html) {
        const tags: HtmlTagDescriptor[] = [
          {
            tag: 'script',
            attrs: {
              src: manifest['spa'],
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
