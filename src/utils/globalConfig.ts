import path from 'node:path'
import type { ResolvedConfig } from 'vite'
import type { VPPTPluginOptions } from '..'
import type { ManifestCache } from './manifestCache'

type UserConfig =
  | {
    cache: ManifestCache
    filesGlob: string[]
    config: ResolvedConfig
  } & Required<VPPTPluginOptions>

type GlobalConfigType = UserConfig & {
  absOutputDir: string
  absInputDir: string
}

let globalConfig: GlobalConfigType

export function setGlobalConfig(c: UserConfig) {
  const root = c.config.root || process.cwd()
  const absOutputDir = path.resolve(root, c.config.publicDir)
  const absInputDir = path.resolve(root, c.inputDir)
  globalConfig = {
    ...c,
    absOutputDir,
    absInputDir,
  }
}

export function getGlobalConfig() {
  if (!globalConfig) {
    throw new Error('need init globalConfig first')
  }

  return globalConfig
}
