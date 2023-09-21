import type { CacheValue } from './ManifestCache'
import { ManifestCache } from './ManifestCache'

export type CacheValueEx = {
  _code?: string
  _hash?: string
  _pathToDisk?: string
} & CacheValue

const manifestCache = new ManifestCache<CacheValueEx>()

export { manifestCache }
