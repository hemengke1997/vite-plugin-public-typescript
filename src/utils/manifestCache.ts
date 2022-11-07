import path from 'node:path'
import fs from 'fs-extra'

interface CacheType {
  key: string
  value: string
}

let cacheMap = new Map<CacheType['key'], CacheType['value']>()

export class ManifestCache {
  setCache(c: CacheType) {
    this.removeCache(c)

    cacheMap.set(c.key, c.value)
  }

  getCache(k: CacheType['key']) {
    return cacheMap.get(k)
  }

  removeCache(c: CacheType) {
    if (cacheMap.has(c.key)) {
      cacheMap.delete(c.key)
    }
  }

  resetCache() {
    cacheMap = new Map<CacheType['key'], CacheType['value']>()
  }

  getAll() {
    return cacheMap
  }

  async writeCache(targetPath: string) {
    const cacheObj = Object.fromEntries(this.getAll())
    const orderdCache: Record<string, string> = {}
    Object.keys(cacheObj)
      .sort()
      .forEach((k) => (orderdCache[k] = cacheObj[k]))
    await fs.ensureDir(path.dirname(targetPath))
    await fs.writeFile(targetPath, `${JSON.stringify(orderdCache, null, 2)}`)
  }
}
