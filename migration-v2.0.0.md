# v2.0.0 升级指南

## vite项目

1. 删除manifest.json文件

2. 在 vite.config.ts 中，使用 `injectScripts` 插入manifest脚本

```ts
import { injectScripts } from 'vite-plugin-public-typescript'

// injectScripts 的参数中提供了manifest，所以不需要再显示引入manifest.json了
injectScripts((manifest) => [
  {
    attrs: { src: manifest.hmr },
    injectTo: 'body',
  }
])
```

3. 在业务源码中，使用 `vite-plugin-public-typescript/client` 引入 manifest
```ts
import { manifest } from 'vite-plugin-public-typescript/client'

console.log(manifest) // { hmr: '...' }
```

## 非vite项目

1. 使用文件输出模式
2. 指定缓存目录为项目源码中目录，如 `public-typescript`

```ts
publicTypescript({
  destination: 'file',
  cacheDir: 'public-typescript'
})

```
3. 使用显式导入
```ts
import manifest from 'thepath/to/public-typescript/manifest.json'

console.log(manifest)
```

## SSR
1. 使用 `injectScriptsToHtml` 插入manifest脚本

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

2. node环境中，也可以使用 `getManifest` 获取manifest

```ts
import { getManifest } from 'vite-plugin-public-typescript'

console.log(getManifest(), 'manifest')
```

3. 在业务源码中，使用 `vite-plugin-public-typescript/client` 引入 manifest
```ts
import { manifest } from 'vite-plugin-public-typescript/client'

console.log(manifest)
```

## deprecated

### sideEffects

废弃 `sideEffects` ，请移除该配置选项
