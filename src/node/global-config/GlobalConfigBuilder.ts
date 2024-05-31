import { type Logger, type ResolvedConfig, type ViteDevServer } from 'vite'
import { type OptionsTypeWithDefault } from '../helper/utils'
import { type CacheValue, type ManifestCache } from '../manifest-cache/ManifestCache'
import { type BaseCacheProcessor } from '../processor/BaseCacheProcessor'

export type GlobalConfig<T extends CacheValue = CacheValue> = Required<OptionsTypeWithDefault> & {
  viteDevServer?: ViteDevServer
  manifestCache: ManifestCache<T>
  originFilesGlob: string[]
  viteConfig: ResolvedConfig
  cacheProcessor: BaseCacheProcessor<T>
  logger: Logger
}

export class GlobalConfigBuilder<T extends CacheValue = CacheValue> {
  private _globalConfig: GlobalConfig<T>

  constructor() {
    this._globalConfig = {} as GlobalConfig<T>
  }

  init(c: GlobalConfig<T>) {
    this._globalConfig = {
      ...c,
    }

    return this
  }

  get<Selected extends keyof GlobalConfig<T>>(keys: Selected[]): Pick<GlobalConfig<T>, Selected>
  get<Selected extends keyof GlobalConfig<T>>(key: Selected): GlobalConfig<T>[Selected]
  get<Selected extends keyof GlobalConfig<T>>(key: any): any {
    const result = {} as Pick<GlobalConfig<T>, Selected>
    if (Array.isArray(key)) {
      ;(key as Selected[]).forEach((k) => {
        result[k] = this._globalConfig[k]
      })
      return result
    } else {
      return this._globalConfig[key as Selected]
    }
  }

  get all() {
    return this._globalConfig
  }

  set<Selected extends keyof GlobalConfig<T>>(key: Selected, value: GlobalConfig<T>[Selected]) {
    this._globalConfig[key] = value
    return this
  }
}
