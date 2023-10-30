import { type OptionsTypeWithDefault } from './utils'

export const DEFAULT_OPTIONS: OptionsTypeWithDefault = {
  destination: 'memory',
  esbuildOptions: {},
  hash: true,
  inputDir: 'public-typescript',
  manifestName: 'manifest',
  outputDir: '/',
  cacheDir: 'node_modules/.vite-plugin-public-typescript',
}
