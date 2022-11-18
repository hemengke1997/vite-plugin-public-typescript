# vite-plugin-public-typescript

**English** | [中文](./README-zh.md)

## Features

- Transform typescript to javascript at runtime and build time
- Output js with hash, no worry about cache
- Customize esbuild build options, specify target browsers range

## Install

```bash
pnpm add vite-plugin-public-typescript -D
```

or

```bash
npm i vite-plugin-public-typescript -D
```

## Preview

<img src="./screenshots/ts-new.gif" />

## Usage

```ts
import { defineConfig } from 'vite'
import { publicTypescript } from 'vite-plugin-public-typescript'

export default defineConfig({
  plugins: [
    publicTypescript({
      inputDir: 'publicTypescript',
      outputDir: 'lib',
      manifestName: 'manifest',
      hash: true,
    }),
  ],
})
```

### SPA

For `SPA`, you can inject script in vite `transformIndexHtml` hook.
Or you can use [`vite-plugin-html`](https://github.com/vbenjs/vite-plugin-html) that make injecting easy

For full example, please see [spa playground](./playground/spa/vite.config.ts)

#### vite config
```ts
import type { HtmlTagDescriptor } from 'vite'
import { defineConfig } from 'vite'
import { publicTypescript } from 'vite-plugin-public-typescript'
import react from '@vitejs/plugin-react'
import manifest from './publicTypescript/manifest.json'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    publicTypescript({
      inputDir: 'publicTypescript',
      manifestName: 'manifest',
      hash: true,
      outputDir: '/',
    }),
    {
      name: 'add-script',
      transformIndexHtml(html) {
        const tags: HtmlTagDescriptor[] = [
          {
            tag: 'script',
            attrs: {
              src: manifest.spa,
            },
            injectTo: 'head-prepend',
          },
        ]
        return {
          html,
          tags,
        }
      },
    },
  ],
})
```

### SSR

We can easily change the html in SSR mode, because `html` is just a string template

For full example, please see [ssr playground](./playground/ssr/index.html)

#### vite config
```ts
import { HtmlTagDescriptor, defineConfig } from 'vite'
import { publicTypescript } from 'vite-plugin-public-typescript'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    publicTypescript({
      inputDir: 'publicTypescript',
      manifestName: 'custom-manifest',
      hash: true,
      outputDir: '/',
    }),
  ],
})
```

#### server.js
```js
import manifest from './publicTypescript/custom-manifest.json' assert { type: 'json' }

const html = template
      // inject js
      .replace(`<!--app-prehead-->`, `<script src=${manifest.ssr}></script>`)
```


## Options

| Parameter      | Types          | Default            | Description                                           |
| -------------- | -------------- | ------------------ | ----------------------------------------------------- |
| ssrBuild       | `boolean`      | `true`             | whether is ssrBuild                                   |
| inputDir       | `string`       | `publicTypescript` | input public typescript dir                           |
| outputDir      | `string`       | `/`                | output public javascript dir, relative to `publicDir` |
| manifestName   | `string`       | `manifest`         | js manifest fileName                                  |
| hash           | `boolean`      | `true`             | whether generate js fileName with hash                |
| esbuildOptions | `BuildOptions` | `{}`               | esbuild BuildOptions                                  |

## Example project

[vite-react-ssr-boilerplate](https://github.com/hemengke1997/vite-react-ssr-boilerplate)

## License

MIT

[npm-img]: https://img.shields.io/npm/v/vite-plugin-public-typescript.svg
