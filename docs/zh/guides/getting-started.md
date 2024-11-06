# 开始使用

本章节将帮助您快速了解如何使用 `vite-plugin-public-typescript`。

## 第 1 步：安装

首先，您需要安装 `vite-plugin-public-typescript`:

```bash
npm install vite-plugin-public-typescript --save-dev
```

## 第 2 步：配置

在 `vite.config.ts` 中添加插件：

```ts
import { defineConfig } from 'vite'
import { publicTypescript } from 'vite-plugin-public-typescript'

export default defineConfig({
  plugins: [
    publicTypescript(
      // 插件配置项
    ),
  ]
})
```

关于 `publicTypescript` 配置项，请参考[插件选项](../reference/public-typescript)。

## 第 3 步：创建文件

在根目录下创建一个名为 `public-typescript`（目录名可[配置](../reference/public-typescript#inputdir)）的文件夹，然后在里面创建 `typescript` 文件

```bash
touch public-typescript/hello.ts
```

```ts
// hello.ts
console.log('Hello, World!')
```

## 第 4 步：将脚本注入到 HTML

我们通过 `injectScripts` 插件，将脚本注入到 HTML 中。

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { injectScripts, publicTypescript } from 'vite-plugin-public-typescript'

export default defineConfig({
  plugins: [
    publicTypescript(),
    injectScripts((manifest) => [
      {
        attrs: {
          src: manifest.hello,
        },
        injectTo: 'body',
      },
    ])
  ]
})
```

关于 `injectScripts` 配置项，请参考[插件选项](../reference/inject-scripts)。

## 第 5 步：运行

现在，您可以运行您的项目。然后打开浏览器，查看控制台输出。

