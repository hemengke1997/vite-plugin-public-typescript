import { type OptionsTypeWithDefault } from '../helper/utils'
import { type CacheValueEx } from '../manifest-cache'
import { type ManifestCache } from '../manifest-cache/manifest-cache'
import { FileCacheProcessor } from './file-cache-processor'
import { type ManifestCacheProcessor } from './manifest-cache-processor'
import { MemoryCacheProcessor } from './memory-cache-processor'

export function initCacheProcessor(options: OptionsTypeWithDefault, manifestCache: ManifestCache<CacheValueEx>) {
  const { destination } = options

  const processorContainer: Record<typeof destination, ManifestCacheProcessor> = {
    file: new FileCacheProcessor(manifestCache),
    memory: new MemoryCacheProcessor(manifestCache),
  }

  return processorContainer[destination]
}
