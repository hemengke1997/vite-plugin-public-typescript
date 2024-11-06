---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "vite-plugin-public-typescript"
  text: "Inject TypeScript into HTML"
  image:
    src: /logo.svg
    alt: Logo
  actions:
    - theme: brand
      text: Get Started
      link: /guides/getting-started
    - theme: alt
      text: Github
      link: https://github.com/hemengke1997/vite-plugin-public-typescript

features:
  - title: Fast!
    icon: ⚡️
    details: Powered by esbuild, super fast!
  - title: Great Compatibility
    icon: 🌐
    details: Supports babel compilation, no browser compatibility worries
  - title: Flexible
    icon: 🎨
    details: Supports different output modes (memory mode and file mode)
  - title: Cache Control
    icon: 🚀
    details: Outputs js files with `hash`, no cache worries
  - title: Environment Variables Support
    icon: 🌈
    details: Supports vite environment variables
  - title: Server-Side Rendering
    icon: 📡
    details: Supports CSR and SSR
  - title: Nice DX
    icon: 📦
    details: Out-of-the-box HMR support
---
