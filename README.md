# vite-plugin-public-typescript

**English** | [中文](./README-zh.md)

## Features

- Transform typescript to javascript at runtime and build time
- Support HMR
- Output js with hash, no worry about cache
- Customize esbuild build options, specify target browser ranges

## Install

```bash
pnpm add vite-plugin-public-typescript -D
```


## Preview

<img src="./screenshots/ts-new.gif" />

## Usage

```typescript
import { defineConfig } from 'vite'
import { publicTypescript } from 'vite-plugin-public-typescript'

export default defineConfig({
  plugins: [publicTypescript()],
})
```

### SPA

For `SPA`, you can inject script in vite `transformIndexHtml` hook.
Or you can use [`vite-plugin-html`](https://github.com/vbenjs/vite-plugin-html) that make injecting easy

For full example, please see [spa playground](./playground/spa/vite.config.ts)

#### vite config

```typescript
import type { HtmlTagDescriptor } from 'vite'
import { defineConfig } from 'vite'
import { publicTypescript } from 'vite-plugin-public-typescript'
import manifest from './publicTypescript/manifest.json'

export default defineConfig({
  plugins: [
    publicTypescript(),
    {
      name: 'add-script',
      async transformIndexHtml(html) {
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

```typescript
import { HtmlTagDescriptor, defineConfig } from 'vite'
import { publicTypescript } from 'vite-plugin-public-typescript'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    publicTypescript({
      manifestName: 'custom-manifest',
    }),
  ],
})
```

#### server.js

```js
import manifest from './publicTypescript/custom-manifest.json' assert { type: 'json' }

const html = template
  // inject js
  .replace('<!--app-prehead-->', `<script src=${manifest.ssr}></script>`)
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
