import { defineConfig } from 'tsup'

export const tsup = defineConfig((option) => ({
  entry: ['src/index.ts'],
  dts: true,
  clean: false,
  format: ['cjs', 'esm'],
  minify: false,
  platform: 'node',
  sourcemap: !!option.watch,
  tsconfig: option.watch ? './tsconfig.dev.json' : './tsconfig.json',
  esbuildOptions(opts, { format }) {
    if (format === 'esm') {
      opts.external = ['watcher', 'on-change']
    }
  },
}))
