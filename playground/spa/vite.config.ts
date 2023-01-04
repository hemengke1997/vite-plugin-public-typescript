import { defineConfig, HtmlTagDescriptor } from 'vite'
import { publicTypescript } from 'vite-plugin-public-typescript'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

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
        const manifest =
          JSON.parse(fs.readFileSync(path.resolve(__dirname, './publicTypescript/manifest.json'), 'utf-8') || '{}') ||
          {}

        const tags: HtmlTagDescriptor[] = [
          {
            tag: 'script',
            attrs: {
              src: manifest.spa,
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
  clearScreen: false,
})
