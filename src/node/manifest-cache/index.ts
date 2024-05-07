import { isEmptyObject } from '../helper/utils'
import { type CacheValue, ManifestCache } from './ManifestCache'

export type CacheValueEx = {
  _code?: string
  _hash?: string
  _pathToDisk?: string
} & CacheValue

export const manifestCache = new ManifestCache<CacheValueEx>()

export function getManifest(): Record<string, string> {
  // 从内存中读取
  if (!isEmptyObject(manifestCache.getManifestJson())) {
    return manifestCache.getManifestJson()
  }

  // 从manifest.json中读取
  if (!isEmptyObject(manifestCache.readManifestFile())) {
    return manifestCache.readManifestFile()
  }

  return {}
}
