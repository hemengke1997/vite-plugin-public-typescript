import path from 'node:path'
import fs from 'fs-extra'
import onChange from 'on-change'
import createDebug from 'debug'
import { writeFile } from '../helper/utils'

const debug = createDebug('vite-plugin-public-typescript:ManifestCache ===> ')

type PathOnlyCache = Record<string, string>

export interface ManifestConstructor {
  writable?: boolean
}

/**
 * @example
 * {
 *   fileName: {
 *    path: '/some-path',
 *    // and more
 *   }
 * }
 */
export type CacheValue = {
  path: string
} & Partial<{ [_key: string]: string }>

export type CacheObject<V extends CacheValue> = {
  [fileName in string]: V
}

const DEFAULT_OPTIONS: ManifestConstructor = {
  writable: true,
}

export class ManifestCache<T extends CacheValue = CacheValue, U extends CacheObject<T> = CacheObject<T>> {
  private _cache: U

  private _manifestPath = ''
  private _beforeSet = (value: T | undefined) => {
    return value
  }

  constructor(options?: ManifestConstructor) {
    options = {
      ...DEFAULT_OPTIONS,
      ...options,
    }

    this._cache = onChange<U>({} as U, (...args) => {
      debug('cache changed:', this._cache, 'onChange args:', args)

      if (options!.writable) {
        this.writeManifestJSON()
      }
    })
  }

  get() {
    return Object.assign({}, this._cache)
  }

  setBeforeSet(fn: typeof this._beforeSet) {
    this._beforeSet = fn
    return this
  }

  // NOTE: the only way to set cache
  set(c: U, opts?: { silent?: boolean }) {
    const keys = Object.keys(c)

    keys.forEach((k: keyof U) => {
      const cacheV = this.getByKey(k)

      if (cacheV !== c[k]) {
        const value = this._beforeSet(c[k]) as U[keyof U]

        if (opts?.silent) {
          onChange.target(this._cache)[k] = value
        } else {
          this._cache[k] = value
        }
      }
    })

    return this
  }

  getByKey(k: keyof U): T {
    return Object.assign({}, this._cache[k])
  }

  remove(k: keyof U, opts?: { silent?: boolean }) {
    if (opts?.silent) {
      delete onChange.target(this._cache)[k]
    } else if (this._cache[k]) {
      delete this._cache[k]
    }

    return this
  }

  readManifestFile() {
    if (!fs.existsSync(this.getManifestPath())) {
      return {}
    }

    const cacheJson = fs.readFileSync(this.getManifestPath(), 'utf-8')
    if (cacheJson) {
      return JSON.parse(cacheJson)
    }

    return {}
  }

  setManifestPath(p: string) {
    this._manifestPath = p
    fs.ensureDirSync(path.dirname(p))
  }

  getManifestPath() {
    return this._manifestPath
  }

  extractPath(c: U) {
    const cache = Object.assign({}, c)
    const pathOnlyCache: PathOnlyCache = {}
    Object.keys(cache).forEach((key) => {
      const value = cache[key]
      pathOnlyCache[key] = value.path
    })
    return pathOnlyCache
  }

  getManifestJson() {
    return this.extractPath(this.get())
  }

  sortObjectByKey(c: PathOnlyCache) {
    const keys = Object.keys(c).sort()
    const sortedCache: PathOnlyCache = {}
    keys.forEach((k) => {
      sortedCache[k] = c[k]
    })
    return sortedCache
  }

  writeManifestJSON() {
    const targetPath = this.getManifestPath()

    const cacheObj = this.getManifestJson()
    const orderdCache = this.sortObjectByKey(cacheObj)

    writeFile(targetPath, JSON.stringify(orderdCache || {}, null, 2))

    debug('write manifest json:', JSON.stringify(orderdCache || {}, null, 2))

    return orderdCache
  }

  findCacheItemByPath(path: string) {
    const k = Object.keys(this._cache).find((key) => {
      if (this._cache[key].path === path) {
        return true
      }
      return false
    })
    return k ? this._cache[k] : null
  }
}
