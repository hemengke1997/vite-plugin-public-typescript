# vite-plugin-public-typescript

![npm][npm-img]


**在vite的运行时或构建时编译指定目录下的typescript文件，供开发者独立使用**

## 在线示例
[Demo](https://hemengke1997.github.io/vite-plugin-public-typescript/)

## 为什么要使用此插件

- 假设你想在页面渲染之前就执行一些js代码，应该怎么办？
- 假设你不想在硬编码式地在 `index.html` 中注入 `script` 代码，应该怎么办？
- 假设你希望第三方脚本也有hash缓存，应该怎么办？
- ...

**`vite-plugin-public-typescript` 为优雅解决这些问题而生**

## 应用场景

- 独立的第三方脚本，如 `sentry`，`google analytics`，`百度统计` 等
- 希望在页面完全加载前就执行的脚本，如 `modern-flexible` 等
- 初始化全局函数

## 功能

- 输出带有 `hash` 的js文件，无需担心缓存
- 自定义编译选项，指定目标浏览器范围，无需担心兼容性
- 支持 `vite` 环境变量
- 支持 `HMR`
- 支持不同的输出方式（内存模式和文件模式）
- 支持 `CSR` 和 `SSR` 应用


## 安装

```bash
pnpm add vite-plugin-public-typescript -D
```

## 配置项

| 参数           | 类型           | 默认值                                        | 描述                                           |
| -------------- | -------------- | --------------------------------------------- | ---------------------------------------------- |
| inputDir       | `string`       | `public-typescript`                           | 存放需要编译的 `typescript` 的目录             |
| outputDir      | `string`       | `/`                                           | 输出公共 javascript 的目录，相对于 `publicDir` |
| manifestName   | `string`       | `manifest`                                    | `manifest` 的文件名                            |
| hash           | `boolean`      | `true`                                        | 编译后的 `js` 是否生成 `hash `                 |
| esbuildOptions | `BuildOptions` | `{}`                                          | esbuild 构建选项                               |
| ssrBuild       | `boolean`      | `false`                                       | 当前打包环境是否是 ssr                         |
| sideEffects    | `boolean`      | `true`                                        | 是否编译三方库                                 |
| destination    | `string`       | `memory`                                      | 输出模式：内存模式 \| 文件模式                 |
| cacheDir       | `string`       | `node_modules/.vite-plugin-public-typescript` | 存放manifest缓存的目录                         |
| base           | `string`       | vite config 中的 `base`                       | 资源 base url                                  |




## 用法

```typescript
import { defineConfig } from 'vite'
import { publicTypescript, injectScripts } from 'vite-plugin-public-typescript'

export default defineConfig({
  plugins: [
    publicTypescript({
      inputDir: 'public-typescript',
      manifestName: 'manifest',
      hash: true,
      outputDir: '/out',
      destination: 'memory',
    }),
    injectScripts((manifest) => [
      {
        attrs: {
          src: manifest.script,
        },
        injectTo: 'head',
      },
    ])
  ]
})
```

### 获取manifest

```typescript
import { manifest } from 'vite-plugin-public-typescript/client'

console.log(manifest)
```


### SPA

在 `SPA` 应用中，我们可以通过 `injectScripts` 插件往 `index.html` 中注入 script

完整示例请参考：[spa playground](./playground/spa/vite.config.ts)

#### vite config

```typescript
import type { HtmlTagDescriptor } from 'vite'
import { defineConfig } from 'vite'
import { publicTypescript, injectScripts } from 'vite-plugin-public-typescript'

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

在 `SSR` 应用中，我们可以很轻松改变需要渲染的 html，往里面注入 script，因为实质上 `html` 就只是一个字符串而已

完整示例请参考：[ssr playground](./playground/ssr/index.html)

#### vite config

```typescript
import { defineConfig } from 'vite'
import { publicTypescript } from 'vite-plugin-public-typescript'

export default defineConfig({
  plugins: [
    publicTypescript(),
  ],
})
```

#### server.js

```js
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
