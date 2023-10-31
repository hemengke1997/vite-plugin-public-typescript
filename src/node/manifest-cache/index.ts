import fs from 'fs-extra'
import path from 'node:path'
import { normalizePath } from 'vite'
import { globalConfig } from '../global-config'
import { DEFAULT_OPTIONS } from '../helper/default-options'
import { readJsonFile, writeJsonFile } from '../helper/io'
import { isEmptyObject, isInTest } from '../helper/utils'
import { type CacheValue, ManifestCache } from './ManifestCache'

export type CacheValueEx = {
  _code?: string
  _hash?: string
  _pathToDisk?: string
} & CacheValue

export const manifestCache = new ManifestCache<CacheValueEx>()

const ManifestCachePath = normalizePath(`${DEFAULT_OPTIONS.cacheDir}/_manifest_path.json`)

function getManifestPath(root?: string) {
  if (isInTest()) {
    root = process.env.__Manifest_Path__
  }
  if (!root) {
    root = globalConfig.get('viteConfig')?.root || process.cwd()
  }

  return normalizePath(path.resolve(root, ManifestCachePath))
}

export function saveManifestPathToDisk() {
  // save manifest path to cache dir
  fs.ensureDir(DEFAULT_OPTIONS.cacheDir)
  writeJsonFile(getManifestPath(), {
    manifestPath: manifestCache.manifestPath,
  })
}

export function getManifest(root?: string) {
  if (!isEmptyObject(manifestCache.getManifestJson())) {
    return manifestCache.getManifestJson()
  }

  if (!isEmptyObject(manifestCache.readManifestFile())) {
    return manifestCache.readManifestFile()
  }

  const manifestPath = readJsonFile(getManifestPath(root))?.manifestPath
  if (manifestPath) {
    return readJsonFile(manifestPath) || {}
  }

  return {}
}
