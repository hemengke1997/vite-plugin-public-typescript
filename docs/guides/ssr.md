# SSR

`vite-plugin-public-typescript` supports two output modes:

1. Output to memory
2. Output to file

By default, `vite-plugin-public-typescript` outputs compiled code to memory and injects scripts into HTML using the `injectScripts` plugin.

For server-side rendering, there is usually no HTML file, so we can choose one of the following methods to inject scripts:

## Memory Mode

Since Vite server-side rendering does not have a `transformIndexHtml` hook, the `injectScripts` plugin cannot be used to inject scripts.

However, the plugin provides an `injectScriptsToHtml` method to dynamically inject scripts into an HTML string.

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

For detailed usage of `injectScriptsToHtml`, refer to the [documentation](../reference/inject-scripts-to-html).

## File Mode

We recommend using memory mode, but if it does not meet your needs, you can use file mode.

Configure the `publicTypescript` plugin in `vite.config.ts` to output compiled code to a file.

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import { publicTypescript } from 'vite-plugin-public-typescript'

export default defineConfig({
  plugins: [
    publicTypescript({
      destination: 'file',
      // Output to the `out` directory
      outputDir: 'out',
    }),
  ]
})
```

Start the project, and you will see the compiled files output to the `out` directory.

How do we use the compiled files?

`vite-plugin-public-typescript` stores compiled file information in `manifest.json`. We can get the compiled file information through a virtual file or by directly importing `manifest.json`.

### Virtual File

First, configure TypeScript type declarations.

```json
{
  "compilerOptions": {   
    "types": ["vite-plugin-public-typescript/virtual"]
  }
}
```

Then import it in the project.

```ts
import { manifest } from 'virtual:public-typescript-manifest'

console.log(manifest.hello) // Outputs the compiled file path
```

### Direct Import

Import the `manifest.json` file from the `cacheDir`.

```ts
import manifest from 'node_modules/.vite-plugin-public-typescript/manifest.json'

console.log(manifest.hello) // Outputs the compiled file path
```

If you change the `cacheDir`, adjust the path accordingly.

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

console.log(manifest.hello) // Outputs the compiled file path
```
