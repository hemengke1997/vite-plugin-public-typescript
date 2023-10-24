import path from 'node:path'
import { type ResolvedConfig } from 'vite'
import { type VPPTPluginOptions } from '..'
import { type CacheValue, type ManifestCache } from '../manifest-cache/ManifestCache'
import { type BaseCacheProcessor } from '../processor/BaseCacheProcessor'

export type UserConfig<T extends CacheValue = CacheValue> = {
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
  private _globalConfig: GlobalConfig<T>

  constructor() {
    this._globalConfig = {} as GlobalConfig<T>
  }

  init(c: UserConfig<T>) {
    const root = c.viteConfig.root || process.cwd()
    const absOutputDir = path.join(root, c.outputDir)
    const absInputDir = path.join(root, c.inputDir)
    this._globalConfig = {
      ...c,
      absInputDir,
      absOutputDir,
    }

    return this
  }

  get() {
    return this._globalConfig
  }

  set(c: UserConfig<T>) {
    this._globalConfig = {
      ...this.get(),
      ...c,
    }
    return this
  }
}
