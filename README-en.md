
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

**English** | [中文](./README.md)

> A vite plugin inject ts script into html

**Compile typescript files in the specified directory then inject them into html**

## Online Demo
[Demo](https://hemengke1997.github.io/vite-plugin-public-typescript/)

## Why

- Suppose you want to execute some scripts before the page render, what should you do?
- Suppose you don't want to inject `script` code into `index.html` in a hard-coded way, what should you do?
- Suppose you want third-party scripts to have hash cache, what should you do?
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
| `inputDir`       | `string`                               | `public-typescript`                           | The directory where the `typescript` is stored                                              |
| `outputDir`      | `string`                               | `public-typescript`                           | The directory where the `javascript` is stored                                              |
| `manifestName`   | `string`                               | `manifest`                                    | The name of the `manifest` file                                                             |
| `hash`           | `boolean`                              | `true`                                        | Whether the compiled `js` generates `hash`                                                  |
| `esbuildOptions` | `BuildOptions`                         | `{}`                                          | esbuild build options                                                                       |
| `sideEffects`    | `boolean`                              | `true`                                        | Whether to compile third-party libraries                                                    |
| `destination`    | `string`                               | `memory`                                      | Output mode: memory mode \| file mode                                                       |
| `cacheDir`       | `string`                               | `node_modules/.vite-plugin-public-typescript` | The directory where the `manifest` cache is stored                                          |
| `base`           | `string`                               | vite config `base`                            | Resource base url                                                                           |
| `publicDir`      | `string`                               | vite config `publicDir`                       | public directory                                                                            |
| `babel`          | `boolean ｜ ESBuildPluginBabelOptions` | `false`                                       | babel compilation (if you need to be compatible with browsers below es6, please turn it on) |

## Usage

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { publicTypescript } from 'vite-plugin-public-typescript'

export default defineConfig({
  plugins: [
    publicTypescript(),
    injectScripts((manifest) => [
      {
        attrs: {
          src: manifest.someScript,
        },
        injectTo: 'head',
      },
    ])
  ]
})
```

### get manifest in client

```ts
import { manifest } from 'vite-plugin-public-typescript/client'

console.log(manifest)
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
