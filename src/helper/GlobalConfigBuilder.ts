import path from 'path'
import type { ResolvedConfig } from 'vite'
import type { VPPTPluginOptions } from '..'
import type { AbsCacheProcessor } from './AbsCacheProcessor'
import type { ManifestCache } from './ManifestCache'

type UserConfig =
  | {
      cache: ManifestCache
      filesGlob: string[]
      config: ResolvedConfig
      cacheProcessor: AbsCacheProcessor
    } & Required<VPPTPluginOptions>

export type TGlobalConfig = UserConfig & {
  absOutputDir: string
  absInputDir: string
}

class GlobalConfigBuilder {
  private globalConfig: TGlobalConfig

  constructor() {
    this.globalConfig = {} as TGlobalConfig
  }

  init(c: UserConfig) {
    const root = c.config.root || process.cwd()
    const absOutputDir = path.join(root, c.outputDir)
    const absInputDir = path.join(root, c.inputDir)
    this.globalConfig = {
      ...c,
      absOutputDir,
      absInputDir,
    }

    return this
  }

  get() {
    return this.globalConfig
  }

  set(c: UserConfig) {
    this.globalConfig = {
      ...this.get(),
      ...c,
    }
    return this
  }
}

const globalConfigBuilder = new GlobalConfigBuilder()

export { globalConfigBuilder }
