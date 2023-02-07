import type { ResolvedConfig } from 'vite'
import type { VitePluginOptions } from '..'
import type { ManifestCache } from './manifestCache'

type GlobalConfigType =
  | ({
      publicDir: string
      cache: ManifestCache
      filesGlob: string[]
      config: ResolvedConfig
    } & Required<VitePluginOptions>)
  | undefined

let globalConfig: GlobalConfigType

export function setGlobalConfig(c: GlobalConfigType) {
  globalConfig = c
}

export function getGlobalConfig() {
  if (!globalConfig) {
    throw new Error('need init globalConfig')
  }
  return globalConfig
}
