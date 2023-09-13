import type { VPPTPluginOptions } from '..'
import type { AbsCacheProcessor } from './AbsCacheProcessor'
import { FileCacheProcessor } from './FileCacheProcessor'
import { MemoryCacheProcessor } from './MemoryCacheProcessor'

export function initCacheProcessor(options: Required<VPPTPluginOptions>): AbsCacheProcessor {
  switch (options.destination) {
    case 'file':
      return new FileCacheProcessor()
    case 'memory':
      return new MemoryCacheProcessor()
    default:
      return new MemoryCacheProcessor()
  }
}
