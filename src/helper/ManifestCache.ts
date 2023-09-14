import path from 'path'
import fs from 'fs-extra'
import type { ApplyData } from 'on-change'
import onChange from 'on-change'
import createDebug from 'debug'
import { eq, isEmptyObject, writeFile } from './utils'

const debug = createDebug('vite-plugin-public-typescript:ManifestCache ===> ')

type PathOnlyCache = Record<string, string>

export interface IManifestConstructor<ValueType = any> {
  watchMode?: boolean
  write?: boolean
  onChange?: (path: string, value: ValueType, previousValue: ValueType, applyData: ApplyData) => void
}

/**
 * @example
 * {
 *   fileName: {
 *    path: '/some-path',
 *    _code: 'compiled code'
 *    // and more
 *   }
 * }
 */
export type TCacheValue = {
  path: string
  _code?: string
  _hash?: string
} & Partial<{ [_key: string]: string }>

export type TDefaultCache = {
  [fileName in string]: TCacheValue
}

const DEFAULT_OPTIONS: IManifestConstructor = {
  watchMode: true,
  write: true,
}

export class ManifestCache<T extends TDefaultCache = TDefaultCache> {
  private cache: T

  private manifestPath = ''

  private inited = false

  constructor(options?: IManifestConstructor) {
    options = {
      ...DEFAULT_OPTIONS,
      ...options,
    }

    if (options?.watchMode) {
      this.cache = onChange<T>({} as T, (...args) => {
        debug('cache changed:', this.cache)
        options!.onChange?.(...args)
        if (options!.write) {
          this.writeManifestJSON()
        }
      })
    } else {
      this.cache = Object.create(null)
    }
  }

  set(c: T, opts?: { disableWatch?: boolean }) {
    const keys = Object.keys(c)

    keys.forEach((k) => {
      const cacheV = this.getByKey(k)
      if (cacheV !== c[k]) {
        if (opts?.disableWatch) {
          ;(onChange.target(this.cache) as TDefaultCache)[k] = c[k]
        } else {
          ;(this.cache as TDefaultCache)[k] = c[k]
        }
      }
    })

    return this
  }

  getByKey(k: keyof T) {
    return this.cache[k]
  }

  remove(k: keyof T, opts?: { disableWatch?: boolean }) {
    if (opts?.disableWatch) {
      delete onChange.target(this.cache)[k]
    } else {
      if (this.cache[k]) {
        delete this.cache[k]
      }
    }

    return this
  }

  get() {
    return Object.assign({}, this.cache)
  }

  readManifestFromFile() {
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
    this.manifestPath = p
    fs.ensureDirSync(path.dirname(p))
  }

  getManifestPath() {
    return this.manifestPath
  }

  extractPath(c: T) {
    const cache = Object.assign({}, c)
    const pathOnlyCache: PathOnlyCache = {}
    for (const key in cache) {
      pathOnlyCache[key] = cache[key].path
    }
    return pathOnlyCache
  }

  recoverPath(c: PathOnlyCache) {
    const cache = Object.assign({}, c)
    const recoveredCache = {} as TDefaultCache
    for (const key in cache) {
      recoveredCache[key] = {
        path: cache[key],
        _code: '',
      }
    }
    return recoveredCache as T
  }

  getManifestJson() {
    return this.extractPath(this.get())
  }

  initCacheFromFile() {
    if (this.inited) return
    this.inited = true

    const parsedCache = this.readManifestFromFile()

    if (!isEmptyObject(parsedCache)) {
      const cache = this.recoverPath(parsedCache)
      this.set(cache, { disableWatch: true })
    }
  }

  writeManifestJSON() {
    const targetPath = this.getManifestPath()

    const cacheObj = this.getManifestJson()
    const orderdCache = Object.assign({}, cacheObj)

    const parsedCache = this.readManifestFromFile()

    if (!isEmptyObject(parsedCache) && eq(parsedCache, orderdCache)) {
      return
    }

    writeFile(targetPath, JSON.stringify(orderdCache || {}, null, 2))

    debug('write manifest json:', JSON.stringify(orderdCache || {}, null, 2))

    return orderdCache
  }
}
