import fs from 'fs-extra'
import { normalizePath } from 'vite'
import { resolveOptions } from '../helper/default-options'
import { readJsonFile, writeJsonFile } from '../helper/io'
import { isEmptyObject, isInTest } from '../helper/utils'
import { type CacheValue, ManifestCache } from './manifest-cache'

export type CacheValueEx = {
  _code?: string
  _hash?: string
  _pathToDisk?: string
} & CacheValue

export const manifestCache = new ManifestCache<CacheValueEx>()

const ManifestCachePath = '_manifest_path.json'

function getManifestPath(root?: string) {
  let cacheDir = ''
  if (isInTest() && process.env.__Manifest_Path__) {
    // @ts-ignore
    cacheDir = resolveOptions({ root: process.env.__Manifest_Path__ as string }).cacheDir
  } else {
    // @ts-ignore
    cacheDir = resolveOptions({ root }).cacheDir
  }
  return normalizePath(`${cacheDir}/${ManifestCachePath}`)
}

export function saveManifestPathToDisk(cacheDir: string) {
  // save manifest path to cache dir
  fs.ensureDirSync(cacheDir)
  writeJsonFile(getManifestPath(), {
    manifestPath: manifestCache.manifestPath,
  })
}

export function getManifestInNode(root?: string): Record<string, string> {
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
