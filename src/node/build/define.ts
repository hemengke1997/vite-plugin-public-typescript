import { type ResolvedConfig } from 'vite'

export function transformEnvToDefine(viteConfig: ResolvedConfig) {
  const importMetaKeys: Record<string, string> = {}
  const userDefineKeys: Record<string, string> = {}

  const ssr = !!viteConfig.build.ssr
  const env: Record<string, any> = {
    ...viteConfig.env,
    SSR: ssr,
  }

  Object.keys(env).forEach((key) => {
    importMetaKeys[`import.meta.env.${key}`] = JSON.stringify(env[key])
  })

  Object.keys(viteConfig.define || {}).forEach((key) => {
    const c = viteConfig.define?.[key]
    userDefineKeys[key] = typeof c === 'string' ? c : JSON.stringify(viteConfig.define?.[key])
  })

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

  const define: Record<string, string> = {
    ...processNodeEnv,
    ...processEnv,
  }

  define['import.meta.env.SSR'] = `${ssr}`

  define['import.meta.env'] = JSON.stringify(env)

  return { ...define, ...importMetaKeys, ...userDefineKeys }
}
