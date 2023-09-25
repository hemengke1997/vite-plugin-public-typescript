import { type Options, defineConfig } from 'tsup'

const commonConfig = (option: Options): Options => {
  return {
    clean: false,
    minify: false,
    platform: 'node',
    sourcemap: !!option.watch,
    tsconfig: option.watch ? './tsconfig.dev.json' : './tsconfig.json',
  }
}

export const tsup = defineConfig((option) => [
  {
    entry: ['src/index.ts'],
    dts: true,
    format: ['esm'],
    ...commonConfig(option),
  },
  {
    entry: ['src/index.ts'],
    noExternal: ['on-change', 'watcher'],
    format: ['cjs'],
    ...commonConfig(option),
  },
])
