import { type CacheValue, ManifestCache } from './ManifestCache'

export type CacheValueEx = {
  _code?: string
  _hash?: string
  _pathToDisk?: string
} & CacheValue

const manifestCache = new ManifestCache<CacheValueEx>()

export function getManifest(): Record<string, string> {
  return manifestCache.getManifestJson()
}

export { manifestCache }
