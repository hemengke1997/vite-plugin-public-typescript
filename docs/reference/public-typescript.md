# Public Typescript Options

## inputDir

- **Type:** `string`
- **Default:** `'public-typescript'`

Specifies the directory for compiling `.ts` files.

## destination

- **Type:** `'memory' | 'file'`
- **Default:** `'memory'`

Specifies where to store compiled files. `memory` for in-memory mode, `file` for file mode.

In `memory` mode, no compiled files are generated.

## publicDir

- **Type:** `string`
- **Default:** `publicDir in vite config`

The `public` directory.

## outputDir

- **Type:** `string`

In file mode, specifies the directory for storing compiled files. Path is relative to `publicDir`.

## cacheDir

- **Type:** `string`
- **Default:** `node_modules/.vite-plugin-public-typescript`

Cache directory for storing the manifest file.

## manifestName

- **Type:** `string`
- **Default:** `manifest`

Name of the manifest file.

## hash

- **Type:** `boolean`
- **Default:** `true`

Whether to generate hashed filenames.

## esbuildOptions

- **Type:** `esbuild.BuildOptions`
- **Default:** `{ target: 'es2015' }`

esbuild options. Refer to [esbuild options](https://esbuild.github.io/api/#general-options).

## babel

- **Type:** `boolean | ESBuildPluginBabelOptions`
- **Default:** `true`

Whether to enable babel transformation. If set to `true`, it automatically detects `browserslist`.

## base

- **Type:** `string`
- **Default:** `base in vite config`

Base path for compiled files.
