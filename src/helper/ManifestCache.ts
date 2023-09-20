import path from 'path'
import fs from 'fs-extra'
import type { ApplyData } from 'on-change'
import onChange from 'on-change'
import createDebug from 'debug'
import { writeFile } from './utils'

const debug = createDebug('vite-plugin-public-typescript:ManifestCache ===> ')

type PathOnlyCache = Record<string, string>

type _OnChangeType<ValueType> = (path: string, value: ValueType, previousValue: ValueType, applyData: ApplyData) => void

export interface IManifestConstructor {
  write?: boolean
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
} & Partial<{ [_key: string]: string }>

export type TDefaultCache<V extends TCacheValue> = {
  [fileName in string]: V
}

const DEFAULT_OPTIONS: IManifestConstructor = {
  write: true,
}

export class ManifestCache<T extends TCacheValue = TCacheValue, U extends TDefaultCache<T> = TDefaultCache<T>> {
  private cache: U

  private manifestPath = ''

  beforeChange: (value: T | undefined) => void = () => {}

  constructor(options?: IManifestConstructor) {
    options = {
      ...DEFAULT_OPTIONS,
      ...options,
    }

    this.cache = onChange<U>({} as U, (...args) => {
      debug('cache changed:', this.cache)

      this.beforeChange(args[1] as T)

      if (options!.write) {
        this.writeManifestJSON()
      }
    })
  }

  get() {
    return Object.assign({}, this.cache)
  }

  // NOTE: the only way to set cache
  set(c: U, opts?: { silent?: boolean }) {
    const keys = Object.keys(c)

    keys.forEach((k: keyof U) => {
      const cacheV = this.getByKey(k)

      if (cacheV !== c[k]) {
        if (opts?.silent) {
          onChange.target(this.cache)[k] = c[k]
        } else {
          this.cache[k] = c[k]
        }
      }
    })

    return this
  }

  getByKey(k: keyof U): T {
    return Object.assign({}, this.cache[k])
  }

  remove(k: keyof U, opts?: { silent?: boolean }) {
    if (opts?.silent) {
      delete onChange.target(this.cache)[k]
    } else {
      if (this.cache[k]) {
        delete this.cache[k]
      }
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
    this.manifestPath = p
    fs.ensureDirSync(path.dirname(p))
  }

  getManifestPath() {
    return this.manifestPath
  }

  extractPath(c: U) {
    const cache = Object.assign({}, c)
    const pathOnlyCache: PathOnlyCache = {}
    for (const key in cache) {
      pathOnlyCache[key] = cache[key].path
    }
    return pathOnlyCache
  }

  getManifestJson() {
    return this.extractPath(this.get())
  }

  writeManifestJSON() {
    const targetPath = this.getManifestPath()

    const cacheObj = this.getManifestJson()
    const orderdCache = Object.assign({}, cacheObj)

    writeFile(targetPath, JSON.stringify(orderdCache || {}, null, 2))

    debug('write manifest json:', JSON.stringify(orderdCache || {}, null, 2))

    return orderdCache
  }

  findCacheItemByPath(path: string) {
    const k = Object.keys(this.cache).find((key) => {
      if (this.cache[key].path === path) {
        return true
      }
      return false
    })
    return k ? this.cache[k] : null
  }
}
