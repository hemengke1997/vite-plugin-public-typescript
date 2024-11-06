# Getting Started

This section will help you quickly understand how to use `vite-plugin-public-typescript`.

## Step 1: Installation

First, you need to install `vite-plugin-public-typescript`:

```bash
npm install vite-plugin-public-typescript --save-dev
```

## Step 2: Configuration

Add the plugin in `vite.config.ts`:

```ts
import { defineConfig } from 'vite'
import { publicTypescript } from 'vite-plugin-public-typescript'

export default defineConfig({
  plugins: [
    publicTypescript(
      // Plugin options
    ),
  ]
})
```

For `publicTypescript` options, refer to [plugin options](../reference/public-typescript).

## Step 3: Create Files

Create a folder named `public-typescript` (folder name can be [configured](../reference/public-typescript#inputdir)) in the root directory, then create a TypeScript file inside it:

```bash
touch public-typescript/hello.ts
```

```ts
// hello.ts
console.log('Hello, World!')
```

## Step 4: Inject Scripts into HTML

Use the `injectScripts` plugin to inject scripts into HTML.

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

For `injectScripts` options, refer to [plugin options](../reference/inject-scripts).

## Step 5: Run Application

Now, you can run your project. Then open the browser and check the console output.
