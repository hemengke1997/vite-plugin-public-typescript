import path from 'node:path'
import fs from 'fs-extra'
import onChange from 'on-change'
import { crlf, eq, isEmptyObject } from '.'

interface CacheType {
  key: string
  value: string
}

export class ManifestCache {
  private cache

  manifestPath = ''

  constructor(options?: { watchMode?: boolean }) {
    if (options?.watchMode) {
      this.cache = onChange<Record<string, string>>({}, async (...args) => {
        // console.log(args)
        await this.writeManifestJSON()
      })
    } else {
      this.cache = {}
    }
  }

  setCache(c: CacheType) {
    this.removeCache(c.key)
    this.cache[c.key] = c.value
  }

  getCache(k: CacheType['key']) {
    return this.cache[k]
  }

  removeCache(k: CacheType['key']) {
    if (this.cache[k]) {
      delete this.cache[k]
    }
  }

  getAll() {
    return Object.assign({}, this.cache)
  }

  readCacheFromFile(): Record<string, string> {
    const cacheJson = fs.readFileSync(this.getManifestPath(), 'utf-8')
    if (cacheJson) {
      return JSON.parse(cacheJson)
    }
    return {}
  }

  setManifestPath(p: string) {
    this.manifestPath = p
  }

  getManifestPath() {
    return this.manifestPath
  }

  async writeManifestJSON() {
    const targetPath = this.getManifestPath()
    const cacheObj = this.getAll()
    const orderdCache: Record<string, string> = {}

    Object.keys(cacheObj)
      .sort()
      .forEach((k) => (orderdCache[k] = cacheObj[k]))

    await fs.ensureDir(path.dirname(targetPath))

    const parsedCache = this.readCacheFromFile()

    console.log(parsedCache, 'parsedCache', orderdCache, 'orderdCache')

    if (eq(parsedCache, orderdCache) || isEmptyObject(orderdCache)) {
      return
    }

    await fs.writeFile(targetPath, crlf(`${JSON.stringify(orderdCache || {}, null, 2)}`))
  }
}
