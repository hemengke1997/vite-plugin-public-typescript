# injectScripts Plugin Options

## scripts

- **Type:** `(manifest: Record<string, string>) => ScriptDescriptor`

### manifest

- **Type:** `Record<string, string>`

`manifest` object, where keys are filenames and values are file paths.

### ScriptDescriptor

#### attrs

- **Type:** `Record<string, string | boolean | undefined>`

Attributes for the `script` tag.

#### children

- **Type:** `string | HtmlTagDescriptor`

Content of the `script` tag.

#### injectTo

- **Type:** `'head' | 'body' | 'head-prepend' | 'body-prepend'`
- **Default:** `'head-prepend'`

Position to insert the `script` tag.
