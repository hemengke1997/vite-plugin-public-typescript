# injectScriptsToHtml 方法

此方法仅适用于 node 环境。

```ts
function injectScriptsToHtml(html: string, scripts: ManifestScriptsFn): string
```

## html

- **类型:** `string`

html 字符串。

## ManifestScriptsFn

同 `injectScripts` 插件参数 [`scripts`](./inject-scripts#scripts)。
