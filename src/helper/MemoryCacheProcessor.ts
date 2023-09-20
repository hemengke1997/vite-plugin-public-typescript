import { AbsCacheProcessor } from './AbsCacheProcessor'
import type { IAddFile, IDeleteFile } from './AbsCacheProcessor'
import { globalConfigBuilder } from './GlobalConfigBuilder'
import type { ManifestCache } from './ManifestCache'

export class MemoryCacheProcessor extends AbsCacheProcessor {
  constructor(cache: ManifestCache) {
    super(cache)
  }

  async deleteOldJs(args: IDeleteFile): Promise<void> {
    const { tsFileName } = args
    this.cache.remove(tsFileName)
  }

  async addNewJs(args: IAddFile): Promise<void> {
    this.setCache(args, globalConfigBuilder.get())
  }
}
