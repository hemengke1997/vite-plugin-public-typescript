# vite-plugin-public-typescript

## Feature

- transform public typescript to public javascript
- output js with hash

## Install

```bash
pnpm add vite-plugin-public-typescript -D
```

or

```bash
npm i vite-plugin-public-typescript -D
```

## Usage

```ts
import { defineConfig } from 'vite'
import { publicTypescript } from 'vite-plugin-public-typescript'

export default defineConfig({
  plugins: [
    publicTypescript({
      inputDir: 'publicTypescript',
      outputDir: 'lib',
      manifestName: 'manifest',
      hash: true,
    }),
  ],
})
```
