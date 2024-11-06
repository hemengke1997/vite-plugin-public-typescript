# Public Typescript 插件配置项

## inputDir

- **类型:** `string`
- **默认值:** `'public-typescript'`

指定编译目录，存放需要编译的 `.ts` 文件。

## destination

- **类型:** `'memory' | 'file'`
- **默认值:** `'memory'`

编译后文件的存放方式。`memory` 为内存模式，`file` 为文件模式。

`memory` 模式下，不会生成编译文件

## publicDir

- **类型:** `string`
- **默认值:** `vite config 中的 publicDir`

`public` 目录


## outputDir

- **类型:** `string`

文件模式下，存放编译后文件的目录。路径相对于 `publicDir`。

## cacheDir

- **类型:** `string`
- **默认值:** `node_modules/.vite-plugin-public-typescript`

缓存目录，存放 manifest 文件。

## manifestName

- **类型:** `string`
- **默认值:** `manifest`

manifest 文件名。

## hash

- **类型:** `boolean`
- **默认值:** `true`

是否生成 hash 文件名。

## esbuildOptions

- **类型:** `esbuild.BuildOptions`
- **默认值:** `{ target: 'es2015' }`

esbuild 配置项。参考 [esbuild 配置](https://esbuild.github.io/api/#general-options)。


## babel

- **类型:** `boolean | ESBuildPluginBabelOptions`
- **默认值:** `true`

是否启用 babel 转换。如果设置为 `true`，则自动探测 `browserslist`。

## base

- **类型:** `string`
- **默认值:** `vite config 中的 base`

编译后文件路径的base。
