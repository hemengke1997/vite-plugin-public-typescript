# Manifest 文件

`vite-plugin-public-typescript` 编译 `inputDir` 目录下的 `.ts` 文件，生成 `manifest` 文件，用于获取编译后的文件路径。

默认情况下，`manifest` 文件会被生成在 `node_modules/.vite-plugin-public-typescript` 中，你可以修改 [`cacheDir`](../reference/public-typescript#cachedir) 选项来指定生成目录。

## 获取 Manifest

有这些方式可以获取到 `manifest`：

### 1. 虚拟文件

```ts
import { manifest } from 'virtual:public-typescript-manifest'
```

### 2. injectScripts 插件

```ts
import { defineConfig } from 'vite'
import { injectScripts } from 'vite-plugin-public-typescript'

export default defineConfig({
  plugins: [
    injectScripts((manifest) => [
      {
        attrs: {
          src: manifest.hello,
        },
      },
    ]),
  ],
})
```

### 3. injectScriptsToHtml

:::tip
此方法仅适用于 node 环境。
:::

```ts
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

### 4. 直接导入 manifest 文件

```ts
import manifest from 'node_modules/.vite-plugin-public-typescript/manifest.json'
```

如果修改了 `cacheDir`，请根据实际情况修改路径。

