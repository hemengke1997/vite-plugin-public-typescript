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

## Preview

<img src="./assets/ts.gif" />

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

```ts
import manifest from './path/to/publicTypescript/manifest.json'

manifest[yourFileName] // get js fileName! use it anywhere
```

## Example project

[vite-react-ssr-boilerplate](https://github.com/hemengke1997/vite-react-ssr-boilerplate)

## License

MIT

[npm-img]: https://img.shields.io/npm/v/vite-plugin-public-typescript.svg
