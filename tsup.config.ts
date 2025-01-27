import { defineConfig, type Options } from 'tsup'

const commonConfig = (option: Options): Options => {
  return {
    clean: false,
    sourcemap: !!option.watch,
    define: {
      'import.meta.vitest': 'undefined',
    },
    dts: true,
    minify: false,
    external: [/^virtual:.*/, /esbuild/],
    shims: true,
    splitting: true,
    treeshake: true,
  }
}

export const tsup = defineConfig((option) => [
  {
    entry: {
      'node/index': './src/node/index.ts',
    },
    format: ['esm'],
    target: 'node16',
    platform: 'node',
    ...commonConfig(option),
  },
  {
    entry: {
      'node/index': './src/node/index.ts',
    },
    noExternal: ['on-change', 'watcher'],
    format: ['cjs'],
    target: 'node16',
    platform: 'node',
    ...commonConfig(option),
  },
])
