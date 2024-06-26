import createDebug from 'debug'
import fs from 'fs-extra'
import path from 'node:path'
import onChange from 'on-change'
import { readJsonFile, writeJsonFile } from '../helper/io'

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

export type CacheManifest<V extends CacheValue> = {
  [fileName in string]: V
}

const DEFAULT_OPTIONS: ManifestConstructor = {
  writable: true,
}

export class ManifestCache<T extends CacheValue = CacheValue, U extends CacheManifest<T> = CacheManifest<T>> {
  private _cache: U

  private _manifestPath = ''

  constructor(options?: ManifestConstructor) {
    options = {
      ...DEFAULT_OPTIONS,
      ...options,
    }

    this._cache = onChange<U>({} as U, () => {
      debug('cache changed:')

      if (options!.writable) {
        this.writeManifestJSON()
      }
    })
  }

  get all() {
    return Object.assign({}, this._cache)
  }

  get<Selected extends keyof U>(keys: Selected[]): Pick<U, Selected>
  get<Selected extends keyof U>(key: Selected): U[Selected]
  get<Selected extends keyof U>(key: any): any {
    const result = {} as Pick<U, Selected>
    if (Array.isArray(key)) {
      ;(key as Selected[]).forEach((k) => {
        result[k] = this._cache[k]
      })
      return result
    } else {
      return this._cache[key as Selected]
    }
  }

  // NOTE: the only way to set cache
  set(c: U, opts?: { silent?: boolean }) {
    const keys = Object.keys(c)

    keys.forEach((k: keyof U) => {
      const cacheV = this.getCacheValueByKey(k)

      if (cacheV !== c[k]) {
        const value = c[k] as U[keyof U]

        if (opts?.silent) {
          onChange.target(this._cache)[k] = value
        } else {
          this._cache[k] = value
        }
      }
    })

    return this
  }

  remove(k: keyof U, opts?: { silent?: boolean }) {
    if (opts?.silent) {
      delete onChange.target(this._cache)[k]
    } else if (this._cache[k]) {
      delete this._cache[k]
    }

    return this
  }

  getCacheValueByKey(k: keyof U): T {
    return Object.assign({}, this._cache[k])
  }

  readManifestFile() {
    return readJsonFile(this.manifestPath)
  }

  setManifestPath(p: string) {
    fs.ensureDirSync(path.dirname(p))
    this._manifestPath = p
  }

  get manifestPath() {
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
    return this.extractPath(this.all)
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
    const targetPath = this.manifestPath

    const cacheObj = this.getManifestJson()
    const orderdCache = this.sortObjectByKey(cacheObj)

    writeJsonFile(targetPath, orderdCache)

    debug('write manifest json:', JSON.stringify(orderdCache || {}, null, 2), 'to:', targetPath)

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
