import { defineConfig } from 'vite'
import { publicTypescript } from '../../../src/node'

// https://vitejs.dev/config/
export default defineConfig(() => ({
  root: __dirname,
  define: {
    custom_define: JSON.stringify('custom define!'),
    hello_world: JSON.stringify({ hello: 'world' }),
  },
  plugins: [
    publicTypescript({
      inputDir: 'public-typescript',
      manifestName: 'manifest',
      hash: true,
      outputDir: 'out',
      destination: 'file',
    }),
  ],
}))
