import { defineConfig } from 'vite'
import { publicTypescript } from '../../../src/node'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(() => ({
  root: __dirname,
  define: {
    custom_define: JSON.stringify('custom define!'),
    hello_world: JSON.stringify({ hello: 'world' }),
  },
  plugins: [
    publicTypescript({
      inputDir: path.resolve(__dirname, 'public-typescript'),
      outputDir: 'out',
      destination: 'file',
    }),
  ],
}))
