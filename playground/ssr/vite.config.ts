import { defineConfig, HtmlTagDescriptor } from 'vite'
import { publicTypescript } from 'vite-plugin-public-typescript'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    publicTypescript({
      inputDir: 'publicTypescript',
      manifestName: 'custom-manifest',
      hash: true,
      outputDir: '/',
    }),
  ],
})
