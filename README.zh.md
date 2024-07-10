
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


**中文** | [English](./README.md)

> 在html中注入ts脚本的vite插件

**编译指定目录下的typescript文件，注入到html中使用**

## 在线示例
[Demo](https://hemengke1997.github.io/vite-plugin-public-typescript/)

## 为什么要使用此插件

- 如果你想在页面渲染之前就执行一些js代码
- 如果你不想在硬编码式地在 `index.html` 中注入 `script` 代码
- 如果你希望脚本有hash缓存
- 如果你希望项目全部使用typescript
- ...

**`vite-plugin-public-typescript` 为优雅解决这些问题而生**

## 安装
  
```bash
pnpm add vite-plugin-public-typescript -D
```
  

## Scenarios

- 独立的第三方脚本，如 `sentry`，`google analytics`，`百度统计` 等
- 希望在页面完全加载前就执行的脚本，如 [`lib-flexible`](https://github.com/amfe/lib-flexible) 等
- 初始化全局函数

## 功能

- 输出带有 `hash` 的js文件，无需担心缓存
- 默认 esbuild 编译，速度超快！
- 支持 babel 编译，无需担心浏览器兼容性
- 支持 vite 环境变量
- 支持 vite HMR
- 支持不同的输出方式（内存模式和文件模式）
- 支持 CSR 和 SSR 应用

## 配置项

| 参数           | 类型                                   | 默认值                                        | 描述                                           |
| -------------- | -------------------------------------- | --------------------------------------------- | ---------------------------------------------- |
| inputDir       | `string`                               | `public-typescript`                           | 存放需要编译的 `typescript` 的目录             |
| publicDir      | `string`                               | vite config 中的 publicDir                    | public 目录                                    |
| outputDir      | `string`                               | ''                                            | 输出公共 javascript 的目录，相对于 `publicDir` |
| esbuildOptions | `BuildOptions`                         | `{}`                                          | esbuild 构建选项                               |
| babel          | `boolean ｜ ESBuildPluginBabelOptions` | `false`                                       | babel编译（如果需要兼容es6以下浏览器，请开启） |
| manifestName   | `string`                               | `manifest`                                    | `manifest` 的文件名                            |
| hash           | `boolean`                              | `true`                                        | 编译后的 `js` 是否生成 `hash`                  |
| destination    | `string`                               | `memory`                                      | 输出模式：内存模式 \| 文件模式                 |
| cacheDir       | `string`                               | `node_modules/.vite-plugin-public-typescript` | 存放manifest缓存的目录                         |
| base           | `string`                               | vite config 中的 `base`                       | 资源 base url                                  |



## 用法

注意: `publicTypescript` 中 `inputDir` 默认值为 `public-typescript`，你也可以重新配置该属性。
之后你需要在与 `vite.config.ts` 同级目录下中创建同名文件夹, 在里面创建 `.ts` 文件 

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { injectScripts, publicTypescript } from 'vite-plugin-public-typescript'

export default defineConfig({
  plugins: [
    // 如果使用默认配置, 则存放源代码的位置 `inputDir` 默认为 `public-typescript`
    publicTypescript(),
    injectScripts((manifest) => [
      {
        attrs: {
          // 目录下的文件名, 例如: test.ts -->  manifest.test
          src: manifest.someScript,
        },
        injectTo: 'head',
      },
    ])
  ]
})
```

### 获取 manifest

注意：这里的代码只能是在项目代码中使用, 不能在 `vite.config.ts` 以及其他构建时代码中使用, 因为他是在构建之后生成的 

```ts
import { manifest } from 'vite-plugin-public-typescript/client'

console.log(manifest)
```

如果需要在构建时获取到 `manifest`, 例如自定义实现自己的 vite 插件 `injectScript`, 请使用下面的代码

```ts
import { getManifest } from 'vite-plugin-public-typescript';

console.log(getManifest())
```

### SPA

在 `SPA` 应用中，我们可以通过 `injectScripts` 插件往 `index.html` 中注入 script

完整示例请参考：[spa playground](./playground/spa/vite.config.ts)

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

在 `SSR` 应用中，我们可以很轻松改变需要渲染的 html，往里面注入 script，因为实质上 `html` 就只是一个字符串而已

完整示例请参考：[ssr playground](./playground/ssr/index.html)

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

