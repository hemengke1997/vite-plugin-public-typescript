# 介绍

`vite-plugin-public-typescript` 是一个 Vite 插件，它可以将 TypeScript 编译后的代码注入到 HTML 任意位置。

## 为什么需要 vite-plugin-public-typescript

- 页面渲染之前执行脚本
- 三方脚本拥有 hash 值
- 无需担心浏览器兼容性
- 项目全 Typescript 化
- SSR中注入脚本
- 脚本HMR
- ...


如果在直接在 HTML 中引入 Typescript 脚本，脚本会由 vite 接管，这将导致：
1. 失去单独编译、打包的能力
2. 执行时机不可控
3. SSR中无法注入脚本
