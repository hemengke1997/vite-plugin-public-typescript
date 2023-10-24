import { type VPPTPluginOptions } from '..'
import { type CacheValueEx } from '../manifest-cache'
import { type ManifestCache } from '../manifest-cache/ManifestCache'
import { FileCacheProcessor } from './FileCacheProcessor'
import { type ManifestCacheProcessor } from './ManifestCacheProcessor'
import { MemoryCacheProcessor } from './MemoryCacheProcessor'

export function initCacheProcessor(options: Required<VPPTPluginOptions>, manifestCache: ManifestCache<CacheValueEx>) {
  const { destination } = options

  const processorContainer: Record<typeof destination, ManifestCacheProcessor> = {
    file: new FileCacheProcessor(manifestCache),
    memory: new MemoryCacheProcessor(manifestCache),
  }

  return processorContainer[destination]
}
