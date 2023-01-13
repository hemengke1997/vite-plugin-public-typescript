import path from 'node:path'
import fs from 'fs-extra'
import { crlf } from '.'

interface CacheType {
  key: string
  value: string
}

export class ManifestCache {
  private cacheMap = new Map<CacheType['key'], CacheType['value']>()

  setCache(c: CacheType) {
    this.removeCache(c.key)

    this.cacheMap.set(c.key, c.value)
  }

  getCache(k: CacheType['key']) {
    return this.cacheMap.get(k)
  }

  removeCache(k: CacheType['key']) {
    if (this.cacheMap.has(k)) {
      this.cacheMap.delete(k)
    }
  }

  resetCache() {
    this.cacheMap = new Map<CacheType['key'], CacheType['value']>()
  }

  getAll() {
    return this.cacheMap
  }

  async writeManifestJSON(targetPath: string) {
    const cacheObj = Object.fromEntries(this.getAll())
    const orderdCache: Record<string, string> = {}
    Object.keys(cacheObj)
      .sort()
      .forEach((k) => (orderdCache[k] = cacheObj[k]))
    await fs.ensureDir(path.dirname(targetPath))
    if (Object.keys(orderdCache).length) {
      await fs.writeFile(targetPath, crlf(`${JSON.stringify(orderdCache, null, 2)}`))
    }
  }
}
