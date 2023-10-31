import { type Options, defineConfig } from 'tsup'

const commonConfig = (option: Options): Options => {
  return {
    clean: false,
    sourcemap: !!option.watch,
    define: {
      'import.meta.vitest': 'undefined',
    },
    tsconfig: option.watch ? './tsconfig.dev.json' : './tsconfig.json',
    dts: true,
    minify: false,
    external: [/^virtual:.*/],
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
  {
    entry: {
      'client/index': './src/client/index.ts',
    },
    format: ['esm', 'cjs'],
    platform: 'neutral',
    ...commonConfig(option),
  },
])
