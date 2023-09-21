# vite-plugin-public-typescript 升级指南

> 从 1.3.x 升级到 1.5.x

**更新点：**

- vite环境下，支持内存编译模式（ `destination` 配置项），不会在 `publicDir` 下生成 `js` 文件了
- 导出了 `injectScripts` 插件，用于插入脚本（尽量使用这个，不要再使用 `vite-plugin-html` 插脚本了）
- 修复了一些奇怪的bug


## 直接使用？

1. 从 `vite-config` 中引入 `injectScripts` 替换 `vite-plugin-html`
2. 注意 `publicTypescript` 的配置项。新版本默认 `inputDir: 'public-typescript'`（旧版本是 `publicTypescript`）。如果已经设置 `inputDir`，则不需要修改

## 与 `modern-flexible` 一起使用？

`vite-plugin-public-typescript` 的 `sideEffects` 设置为 `true`

## 参考

### with vite
[playground](./playground/spa/vite.config.ts)
