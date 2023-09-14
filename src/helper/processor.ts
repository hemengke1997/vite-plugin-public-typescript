import type { VPPTPluginOptions } from '..'
import type { AbsCacheProcessor } from './AbsCacheProcessor'
import { FileCacheProcessor } from './FileCacheProcessor'
import type { ManifestCache } from './ManifestCache'
import { MemoryCacheProcessor } from './MemoryCacheProcessor'

export function initCacheProcessor(options: Required<VPPTPluginOptions>, cache: ManifestCache): AbsCacheProcessor {
  const { destination } = options
  switch (destination) {
    case 'file':
      return new FileCacheProcessor(cache)
    case 'memory':
      return new MemoryCacheProcessor(cache)
    default:
      return new MemoryCacheProcessor(cache)
  }
}
