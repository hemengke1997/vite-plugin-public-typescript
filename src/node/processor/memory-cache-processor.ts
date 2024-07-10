import { globalConfig } from '../global-config'
import { type CacheValueEx } from '../manifest-cache'
import { type ManifestCache } from '../manifest-cache/manifest-cache'
import { type AddFileArgs, type DeleteFileArgs, ManifestCacheProcessor } from './manifest-cache-processor'

export class MemoryCacheProcessor extends ManifestCacheProcessor {
  constructor(manifestCache: ManifestCache<CacheValueEx>) {
    super(manifestCache)
    this.manifestCache = manifestCache
  }

  async deleteOldJs(args: DeleteFileArgs): Promise<void> {
    const { originFile, silent } = args
    this.manifestCache.remove(originFile, { silent })
  }

  async addNewJs(args: AddFileArgs): Promise<void> {
    this.setCache(args, globalConfig.all)
  }
}
