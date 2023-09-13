import type { VPPTPluginOptions } from '..'
import type { AbsCacheProcessor } from './AbsCacheProcessor'
import { FileCacheProcessor } from './FileCacheProcessor'
import { MemoryCacheProcessor } from './MemoryCacheProcessor'

export function initCacheProcessor(destination: VPPTPluginOptions['destination']): AbsCacheProcessor {
  switch (destination) {
    case 'file':
      return new FileCacheProcessor()
    case 'memory':
      return new MemoryCacheProcessor()
    default:
      return new MemoryCacheProcessor()
  }
}
