# Manifest File

`vite-plugin-public-typescript` compiles `.ts` files in the `inputDir` directory and generates a `manifest` file to get the paths of the compiled files.

By default, the `manifest` file is generated in `node_modules/.vite-plugin-public-typescript`. You can change the output directory by modifying the [`cacheDir`](../reference/public-typescript#cachedir) option.

## Getting the Manifest

You can get the `manifest` in the following ways:

### 1. Virtual File

```ts
import { manifest } from 'virtual:public-typescript-manifest'
```

### 2. injectScripts Plugin

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
This method is only for Node environments.
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

### 4. Directly Import the Manifest File

```ts
import manifest from 'node_modules/.vite-plugin-public-typescript/manifest.json'
```

If you change the `cacheDir`, adjust the path accordingly.
