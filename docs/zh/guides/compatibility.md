# 浏览器兼容

`vite-plugin-public-typescript` 使用 `esbuild` 和 `babel` 编译。

默认情况下，兼容 esbuild target `es2015`，并且自动探测 `browserslist` 用于babel转换代码。

你可以通过以下方式修改兼容性：

## esbuild target
```ts{7-9}
import { defineConfig } from 'vite'
import { publicTypescript } from 'vite-plugin-public-typescript'

export default defineConfig({
  plugins: [
    publicTypescript({
      esbuildOptions: {
        target: 'es2016',
      }
    })
  ]
})
```

附 esbuild target 兼容表：
| Target | Chrome | Safari | Firefox | Edge |
| ------ | ------ | ------ | ------- | ---- |
| es2015 | 49     | 10.1   | 45      | 14   |
| es2016 | 52     | 10.1   | 52      | 14   |
| es2017 | 55     | 10.1   | 52      | 15   |
| es2018 | 60     | 11.1   | 55      | 79   |
| es2019 | 66     | 11.1   | 58      | 79   |
| es2020 | 80     | 13.1   | 72      | 80   |


更多 esbuild 配置请参考 [esbuild 配置](https://esbuild.github.io/api/#general-options)

## browserslist

`babel` 会根据 `browserslist` 配置来转换代码，你可以在项目根目录下创建 `.browserslistrc`

```
> 0.01%
not dead
last 4 versions
not ie <= 11
defaults
```

## babel 配置

> [!NOTE]
> 建议修改 `browserlist` 配置，而不是修改 babel 配置。

你可以通过 `babel` 来修改 babel 配置

```ts{7-9}
import { defineConfig } from 'vite'
import { publicTypescript } from 'vite-plugin-public-typescript'

export default defineConfig({
  plugins: [
    publicTypescript({
      babel: {
        // 配置
      }
    })
  ]
})
```

更多配置请参考 [babel 配置](../reference/public-typescript#babel)








