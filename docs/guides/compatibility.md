# Browser Compatibility

`vite-plugin-public-typescript` uses `esbuild` and `babel` for compilation.

By default, it targets `es2015` for esbuild and automatically detects `browserslist` for babel transformations.

You can modify the compatibility as follows:

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

esbuild target compatibility table:
| Target | Chrome | Safari | Firefox | Edge |
| ------ | ------ | ------ | ------- | ---- |
| es2015 | 49     | 10.1   | 45      | 14   |
| es2016 | 52     | 10.1   | 52      | 14   |
| es2017 | 55     | 10.1   | 52      | 15   |
| es2018 | 60     | 11.1   | 55      | 79   |
| es2019 | 66     | 11.1   | 58      | 79   |
| es2020 | 80     | 13.1   | 72      | 80   |

For more esbuild options, refer to [esbuild options](https://esbuild.github.io/api/#general-options).

## browserslist

`babel` uses the `browserslist` configuration to transform code. You can create a `.browserslistrc` file in the project root directory.

```
> 0.01%
not dead
last 4 versions
not ie <= 11
defaults
```

## babel configuration

> [!NOTE]
> It is recommended to modify the `browserslist` configuration instead of the babel configuration.

You can modify the babel configuration through `babel`.

```ts{7-9}
import { defineConfig } from 'vite'
import { publicTypescript } from 'vite-plugin-public-typescript'

export default defineConfig({
  plugins: [
    publicTypescript({
      babel: {
        // Configuration
      }
    })
  ]
})
```

For more configuration options, refer to [babel options](../reference/public-typescript#babel).
