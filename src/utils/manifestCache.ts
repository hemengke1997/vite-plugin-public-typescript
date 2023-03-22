import path from 'path'
import fs from 'fs-extra'
import onChange from 'on-change'
import { eq, isEmptyObject, writeFile } from '.'

interface CacheType {
  key: string
  value: string
}

export class ManifestCache {
  private cache: Record<string, string>

  private manifestPath = ''

  constructor(options?: { watchMode?: boolean }) {
    if (options?.watchMode) {
      this.cache = onChange<Record<string, string>>({}, async () => {
        await this.writeManifestJSON()
      })
    } else {
      this.cache = {}
    }
  }

  setCache(c: CacheType, opts?: { disableWatch?: boolean }) {
    const cacheV = this.getCache(c.key)

    if (cacheV !== c.value) {
      if (opts?.disableWatch) {
        onChange.target(this.cache)[c.key] = c.value
      } else {
        this.cache[c.key] = c.value
      }
    }
    return this
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

    if (!isEmptyObject(parsedCache) && eq(parsedCache, orderdCache)) {
      return
    }

    writeFile(targetPath, JSON.stringify(orderdCache || {}, null, 2))
  }
}
