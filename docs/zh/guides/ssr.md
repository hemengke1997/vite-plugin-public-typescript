# 服务端渲染

`vite-plugin-public-typescript` 支持两种输出模式：

1. 输出到内存中
2. 输出到文件中

默认情况下，`vite-plugin-public-typescript` 会将编译后的代码输出到内存中，然后通过 `injectScripts` 插件将脚本注入到 HTML 中。

如果是服务端渲染，通常没有 HTML 文件，所以我们可以选择以下两种方式来注入脚本：


## 内存模式

由于 Vite 服务端渲染没有 `transformIndexHtml` hook，所以无法使用 `injectScripts` 插件来注入脚本。

但是插件提供了一个 `injectScriptsToHtml` 方法，可以动态注入脚本到 HTML 字符串中。

```ts
// server.js
import { injectScriptsToHtml } from 'vite-plugin-public-typescript'

const html = injectScriptsToHtml('Your Html Content', (manifest) => {
  return [
    {
      attrs: {
        src: manifest.hello,
      },
      injectTo: 'body',
    },
  ]
})
```

关于 `injectScriptsToHtml` 的详细使用，请参考[文档](../reference/inject-scripts-to-html)。

## 文件模式

我们推荐使用内存模式，如果内存模式无法满足需求，可以使用文件模式。

在 `vite.config.ts` 中配置 `publicTypescript` 插件，将编译后的代码输出到文件中。

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { publicTypescript } from 'vite-plugin-public-typescript'

export default defineConfig({
  plugins: [
    publicTypescript({
      destination: 'file',
      // 输出到 `out` 目录中
      outputDir: 'out',
    }),
  ]
})
```

启动项目，我们就可以看到编译后的文件输出到 `out` 目录中了。

那么，我们如何使用编译好的文件？

`vite-plugin-public-typescript` 会把编译文件信息存放在 `manifest.json` 中。我们可以通过 `虚拟文件` 或 直接导入 `manifest.json` 来获取编译后的文件信息。

### 虚拟文件

首先我们需要配置 typescript 类型声明

```json
{
  "compilerOptions": {   
    "types": ["vite-plugin-public-typescript/virtual"]
  }
}
```

然后在项目中引入

```ts
import { manifest } from 'virtual:public-typescript-manifest'

console.log(manifest.hello) // 输出编译后的文件路径
```

### 直接导入

从 `cacheDir` 中导入 `manifest.json` 文件。

```ts
import manifest from 'node_modules/.vite-plugin-public-typescript/manifest.json'

console.log(manifest.hello) // 输出编译后的文件路径
```

如果修改了 `cacheDir`，请根据实际情况修改路径。

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { publicTypescript } from 'vite-plugin-public-typescript'

export default defineConfig({
  plugins: [
    publicTypescript({
      destination: 'file',
      outputDir: 'out',
      cacheDir: 'public-typescript', // [!code focus]
    }),
  ]
})
```
```ts
import manifest from './public-typescript/manifest.json'

console.log(manifest.hello) // 输出编译后的文件路径
```
