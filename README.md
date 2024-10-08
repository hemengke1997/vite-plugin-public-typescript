
<p align="center">
  <a href="https://vitejs.dev" style="margin-right: 32px;" target="_blank" rel="noopener noreferrer">
    <img width="140" src="https://vitejs.dev/logo.svg" alt="Vite logo" />
  </a>
  <a href="https://www.typescriptlang.org/" target="_blank" rel="noopener noreferrer">
    <img width="140" src="https://upload.wikimedia.org/wikipedia/commons/4/4c/Typescript_logo_2020.svg" alt="Typescript logo" />
  </a>
</p>
<br/>
<p align="center">
  <a href="https://npmjs.com/package/vite-plugin-public-typescript"><img src="https://img.shields.io/npm/v/vite-plugin-public-typescript.svg" alt="npm package"></a>
  <a href="https://nodejs.org/en/about/previous-releases"><img src="https://img.shields.io/node/v/vite-plugin-public-typescript.svg" alt="node compatibility"></a>
</p>

# vite-plugin-public-typescript

**English** | [中文](./README.zh.md)

> A vite plugin inject typescript script into html

**Compile typescript files in the specified directory then inject them into html**

## Online Demo
[Demo](https://hemengke1997.github.io/vite-plugin-public-typescript/)

## Why

- If you want to execute some scripts before the page render
- If you don't want to inject `script` code into `index.html` in a hard-coded way
- If you want third-party scripts to have hash cache
- If you want your project to be all typescript
- ...

**`vite-plugin-public-typescript` is born to solve these problems elegantly**

## Install

```bash
pnpm add vite-plugin-public-typescript -D
```

## Scenes

- Independent third-party scripts, such as `sentry`, `google analytics`, `baidu statistics`, etc.
- Scripts that you want to execute before the page is fully loaded, such as [`lib-flexible`](https://github.com/amfe/lib-flexible), etc.
- Initialize global functions
- ...

## Features

- Output js files with `hash`, no need to worry about cache
- Default esbuild compilation, blazo fast!
- Support babel compilation, no need to worry about browser compatibility
- Support vite environment variables
- Support vite HMR
- Support different output modes (memory mode and file mode)
- Support CSR and SSR

## Options

| Option           | Type                                   | Default                                       | Description                                                                                 |
| ---------------- | -------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `inputDir`       | `string`                               | `public-typescript`                           | Directory of input typescript files                                                         |
| `publicDir`      | `string`                               | publicDir of vite's config                    | Vite's publicDir                                                                            |
| `outputDir`      | `string`                               | ''                                            | Directory of output javascript files after building                                         |
| `esbuildOptions` | `BuildOptions`                         | `{}`                                          | esbuild build options                                                                       |
| `babel`          | `boolean ｜ ESBuildPluginBabelOptions` | `false`                                       | babel compilation (if you need to be compatible with browsers below es6, please turn it on) |
| `manifestName`   | `string`                               | `manifest`                                    | The name of the `manifest` file                                                             |
| `hash`           | `boolean`                              | `true`                                        | Whether the compiled `js` generates `hash`                                                  |
| `destination`    | `string`                               | `memory`                                      | Output mode: memory mode \| file mode                                                       |
| `cacheDir`       | `string`                               | `node_modules/.vite-plugin-public-typescript` | The directory where the `manifest` cache is stored                                          |
| `base`           | `string`                               | vite config `base`                            | Resource base url                                                                           |

## Usage

Note: The default value of 'inputDir' in 'publicTypescript' is 'public-typescript', you can also reconfigure this property.
Then you need to create a folder with the same name in the same directory as' vite.config.ts' and create a '.ts' file inside it

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { publicTypescript } from 'vite-plugin-public-typescript'

export default defineConfig({
  plugins: [
    // If you use the default configuration, the source code location 'inputDir' defaults to 'public-typescript'
    publicTypescript(),
    injectScripts((manifest) => [
      {
        attrs: {
          // The file name in the directory, for example, test.ts --> manifest.test
          src: manifest.someScript,
        },
        injectTo: 'head',
      },
    ])
  ]
})
```

### Typescript types

```json
{
  "compilerOptions": {   
    "types": ["vite-plugin-public-typescript/manifest"]
  }
}
```

### get manifest in client

Note: The code here can only be used in the project code, not in 'vite.config.ts' and other build time code, because it is generated after the build

```ts
import { manifest } from 'virtual:public-typescript-manifest'

console.log(manifest)
```

If you need to get the 'manifest' at build time, such as custom implementation of your own vite plugin 'injectScript', use the following code

```ts
import { getManifest } from 'vite-plugin-public-typescript';

console.log(getManifest())
```

### SPA

In `SPA` applications, we can inject scripts into `index.html` via the `injectScripts` plugin.

For a full example, see: [spa playground](./playground/spa/vite.config.ts)

#### vite config

```ts
import { defineConfig } from 'vite'
import { injectScripts, publicTypescript } from 'vite-plugin-public-typescript'

export default defineConfig({
  plugins: [
    publicTypescript(),
    injectScripts((manifest) => [
      {
        attrs: {
          src: manifest.spa,
        },
        injectTo: 'head-prepend',
      }
    ])
  ],
})
```

### SSR


In an `SSR` application, we can easily change the html to be rendered by injecting a script into it, since the `html` is essentially just a string!

For a full example, see: [ssr playground](./playground/ssr/index.html)

#### vite config

```ts
import { defineConfig } from 'vite'
import { publicTypescript } from 'vite-plugin-public-typescript'

export default defineConfig({
  plugins: [
    publicTypescript(),
  ],
})
```

#### server.js

```ts
import { injectScriptsToHtml } from 'vite-plugin-public-typescript'

html = injectScriptsToHtml(html, (manifest) => [
  {
    attrs: {
      src: manifest.ssr,
    },
    injectTo: 'head-prepend',
  },
])
```


## License

MIT

[npm-img]: https://img.shields.io/npm/v/vite-plugin-public-typescript.svg
