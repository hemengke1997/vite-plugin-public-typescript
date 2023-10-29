import { type OptionsTypeWithDefault } from '../helper/utils'
import { type CacheValueEx } from '../manifest-cache'
import { type ManifestCache } from '../manifest-cache/ManifestCache'
import { FileCacheProcessor } from './FileCacheProcessor'
import { type ManifestCacheProcessor } from './ManifestCacheProcessor'
import { MemoryCacheProcessor } from './MemoryCacheProcessor'

export function initCacheProcessor(options: OptionsTypeWithDefault, manifestCache: ManifestCache<CacheValueEx>) {
  const { destination } = options

  const processorContainer: Record<typeof destination, ManifestCacheProcessor> = {
    file: new FileCacheProcessor(manifestCache),
    memory: new MemoryCacheProcessor(manifestCache),
  }

  return processorContainer[destination]
}
