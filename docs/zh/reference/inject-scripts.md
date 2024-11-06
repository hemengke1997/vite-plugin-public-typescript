# injectScripts 插件参数

## scripts

- **类型:** `(manifest: Record<string, string>) => ScriptDescriptor`

### manifest

- **类型:** `Record<string, string>`

`manifest` 对象，键为文件名，值为文件路径。

### ScriptDescriptor

#### attrs

- **类型:** ` Record<string, string | boolean | undefined>`

`script` 标签属性。

#### children

- **类型:** `string | HtmlTagDescriptor`

`script` 标签内容。

#### injectTo

- **类型:** `'head' | 'body' | 'head-prepend' | 'body-prepend'`
- **默认值:** `'head-prepend'`

`script` 标签插入位置。
