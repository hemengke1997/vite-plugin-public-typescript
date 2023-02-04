import { defineConfig, HtmlTagDescriptor, loadEnv, PluginOption } from 'vite'
import { publicTypescript } from 'vite-plugin-public-typescript'
import react from '@vitejs/plugin-react'
import manifest from './publicTypescript/manifest.json'

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    haha: JSON.stringify('custom define!'),
  },
  plugins: [
    react(),
    publicTypescript({
      inputDir: 'publicTypescript',
      manifestName: 'manifest',
      hash: true,
      outputDir: '/',
    }),
    // {
    //   name: 'add-script',
    //   async transformIndexHtml(html) {
    //     const tags: HtmlTagDescriptor[] = [
    //       {
    //         tag: 'script',
    //         attrs: {
    //           src: manifest.index,
    //         },
    //         injectTo: 'head-prepend',
    //       },
    //     ]
    //     return {
    //       html,
    //       tags,
    //     }
    //   },
    // },
  ],
  clearScreen: false,
})
