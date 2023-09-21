import path from 'path'
import type { ResolvedConfig } from 'vite'
import type { VPPTPluginOptions } from '..'
import type { BaseCacheProcessor } from '../processor/BaseCacheProcessor'
import type { CacheValue, ManifestCache } from '../manifest-cache/ManifestCache'

export type UserConfig<T extends CacheValue = CacheValue> =
  | {
      manifestCache: ManifestCache<T>
      originFilesGlob: string[]
      viteConfig: ResolvedConfig
      cacheProcessor: BaseCacheProcessor<T>
    } & Required<VPPTPluginOptions>

export type GlobalConfig<T extends CacheValue = CacheValue> = UserConfig<T> & {
  absOutputDir: string
  absInputDir: string
}

export class GlobalConfigBuilder<T extends CacheValue = CacheValue> {
  private globalConfig: GlobalConfig<T>

  constructor() {
    this.globalConfig = {} as GlobalConfig<T>
  }

  init(c: UserConfig<T>) {
    const root = c.viteConfig.root || process.cwd()
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

  set(c: UserConfig<T>) {
    this.globalConfig = {
      ...this.get(),
      ...c,
    }
    return this
  }
}
