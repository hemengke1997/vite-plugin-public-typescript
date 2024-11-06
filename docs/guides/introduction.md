# Introduction

`vite-plugin-public-typescript` is a Vite plugin that can inject compiled TypeScript code into any part of an HTML file.

## Why use vite-plugin-public-typescript

- Execute scripts before page rendering
- Third-party scripts with hash values
- No browser compatibility worries
- Full TypeScript project
- Inject scripts in SSR
- Script HMR
- ...

If you directly include TypeScript scripts in HTML, they will be handled by Vite, which leads to:
1. Loss of independent compilation and packaging capabilities
2. Uncontrollable execution timing
3. Inability to inject scripts in SSR
