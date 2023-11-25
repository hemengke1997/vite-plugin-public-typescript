import { type ResolvedConfig } from 'vite'

export function transformEnvToDefine(viteConfig: ResolvedConfig) {
  const ssr = !!viteConfig.build.ssr
  const env: Record<string, any> = {
    ...viteConfig.env,
    SSR: ssr,
  }

  const processEnv: Record<string, string> = {}
  const processNodeEnv: Record<string, string> = {}
  const nodeEnv = process.env.NODE_ENV || viteConfig.mode
  Object.assign(processEnv, {
    'process.env': `{}`,
    'global.process.env': `{}`,
    'globalThis.process.env': `{}`,
  })
  Object.assign(processNodeEnv, {
    'process.env.NODE_ENV': JSON.stringify(nodeEnv),
    'global.process.env.NODE_ENV': JSON.stringify(nodeEnv),
    'globalThis.process.env.NODE_ENV': JSON.stringify(nodeEnv),
  })

  const importMetaKeys: Record<string, string> = {}
  const importMetaEnvKeys: Record<string, string> = {}
  const importMetaFallbackKeys: Record<string, string> = {}
  importMetaKeys['import.meta.hot'] = `undefined`
  Object.keys(env).forEach((key) => {
    const val = JSON.stringify(viteConfig.env[key])
    importMetaKeys[`import.meta.env.${key}`] = val
    importMetaEnvKeys[key] = val
  })
  importMetaKeys['import.meta.env.SSR'] = `undefined`
  importMetaFallbackKeys['import.meta.env'] = `undefined`

  Object.keys(env).forEach((key) => {
    importMetaKeys[`import.meta.env.${key}`] = JSON.stringify(env[key])
  })

  const userDefine: Record<string, string> = {}
  const userDefineEnv: Record<string, any> = {}
  Object.keys(viteConfig.define || {}).forEach((key) => {
    const ud = viteConfig.define?.[key]
    userDefine[key] = handleDefineValue(ud)
    // make sure `import.meta.env` object has user define properties
    if (key.startsWith('import.meta.env.')) {
      userDefineEnv[key.slice(16)] = ud
    }
  })

  const define: Record<string, string> = {
    ...processNodeEnv,
    ...importMetaKeys,
    ...userDefine,
    ...importMetaFallbackKeys,
    ...processEnv,
  }

  if ('import.meta.env.SSR' in define) {
    define['import.meta.env.SSR'] = `${ssr}`
  }
  if ('import.meta.env' in define) {
    define['import.meta.env'] = serializeDefine({
      ...importMetaEnvKeys,
      SSR: `${ssr}`,
      ...userDefineEnv,
    })
  }

  return define
}

function handleDefineValue(value: any): string {
  if (typeof value === 'undefined') return 'undefined'
  if (typeof value === 'string') return value
  return JSON.stringify(value)
}

/**
 * Like `JSON.stringify` but keeps raw string values as a literal
 * in the generated code. For example: `"window"` would refer to
 * the global `window` object directly.
 */
export function serializeDefine(define: Record<string, any>): string {
  let res = `{`
  const keys = Object.keys(define)
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    const val = define[key]
    res += `${JSON.stringify(key)}: ${handleDefineValue(val)}`
    if (i !== keys.length - 1) {
      res += `, `
    }
  }
  return `${res}}`
}
