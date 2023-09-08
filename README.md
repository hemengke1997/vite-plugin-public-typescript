# vite-plugin-public-typescript

![npm][npm-img]

**中文** | [English](./README.md)

**在vite的运行时或构建时打包指定目录下的typescript文件，供独立使用**

> 如果你希望项目中所有脚本都使用typescript编写，那么你应该试试此插件

## 应用场景

- 独立的第三方脚本，如 `sentry`，`google analytics`，百度统计等
- 希望在页面完全加载前就执行的脚本，如 `modern-flexible` 等
- 初始化全局函数

## 功能

- 运行时和构建时，把指定文件夹中的`typescript`文件编译为`javascript`，浏览器可直接使用
- 输出带有`hash`的js文件，无需担心缓存
- 自定义编译选项，指定目标浏览器范围，无需担心兼容性
- 支持vite环境变量
- 支持`HMR`
- 生产可用

## Install

```bash
pnpm add vite-plugin-public-typescript -D
```

## Preview

<img src="./screenshots/ts.gif" />

## 用法

```typescript
import { defineConfig } from 'vite'
import { publicTypescript } from 'vite-plugin-public-typescript'

export default defineConfig({
  plugins: [publicTypescript()],
})
```

## 例子

示例请参考 [playground](playground/spa/vite.config.ts)


### SPA

在 `SPA` 应用中，我们可以通过 vite 的 `transformIndexHtml` hook 注入 script
你也可以使用 [`vite-plugin-html`](https://github.com/vbenjs/vite-plugin-html)，这会使得注入更加简单

完整示例请参考：[spa playground](./playground/spa/vite.config.ts)

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

在 `SSR` 应用中，我们可以很轻松改变需要渲染的 html，往里面注入 script，因为实质上 `html` 就只是一个字符串而已

完整示例请参考：[ssr playground](./playground/ssr/index.html)

#### vite config

```typescript
import { HtmlTagDescriptor, defineConfig } from 'vite'
import { publicTypescript } from 'vite-plugin-public-typescript'

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

## 配置项

| 参数           | 类型           | 默认值             | 描述                                           |
| -------------- | -------------- | ------------------ | ---------------------------------------------- |
| ssrBuild       | `boolean`      | `false`            | 当前打包环境是否是 ssr                         |
| inputDir       | `string`       | `publicTypescript` | 存放公共 typescript 的目录                     |
| outputDir      | `string`       | `/`                | 输出公共 javascript 的目录，相对于 `publicDir` |
| manifestName   | `string`       | `manifest`         | manifest 的文件名                              |
| hash           | `boolean`      | `true`             | js 是否生成 hash                               |
| esbuildOptions | `BuildOptions` | `{}`               | esbuild 构建选项                               |

## License

MIT

[npm-img]: https://img.shields.io/npm/v/vite-plugin-public-typescript.svg
