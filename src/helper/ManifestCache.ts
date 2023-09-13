import path from 'path'
import fs from 'fs-extra'
import type { ApplyData } from 'on-change'
import onChange from 'on-change'
import createDebug from 'debug'
import { eq, isEmptyObject, writeFile } from './utils'

const debug = createDebug('ManifestCache ===> ')

export interface IManifestConstructor<ValueType = any> {
  watchMode?: boolean
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
type TCacheValue = {
  path: string
  _code?: string
  _hash?: string
} & Partial<{ [_key: string]: string }>

type TDefaultCache = {
  [fileName in string]: TCacheValue
}

export class ManifestCache<T extends TDefaultCache = TDefaultCache> {
  private cache: T

  private manifestPath = ''

  constructor(options?: IManifestConstructor<unknown>) {
    if (options?.watchMode) {
      this.cache = onChange<T>({} as T, async (...args) => {
        options.onChange?.(...args)
        await this.writeManifestJSON()
        debug('cache changed:', this.cache)
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

  remove(k: keyof T) {
    if (this.cache[k]) {
      delete this.cache[k]
    }
    return this
  }

  get() {
    return Object.assign({}, this.cache)
  }

  readManifestFromFile() {
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

  extractPath(c: T) {
    const cache = Object.assign({}, c)
    const pathOnlyCache: Record<string, string> = {}
    for (const key in cache) {
      pathOnlyCache[key] = cache[key].path
    }
    return pathOnlyCache
  }

  async writeManifestJSON() {
    const targetPath = this.getManifestPath()

    await fs.ensureDir(path.dirname(targetPath))

    const cacheObj = this.extractPath(this.get())
    const orderdCache = Object.assign({}, cacheObj)

    const parsedCache = this.readManifestFromFile()

    if (!isEmptyObject(parsedCache) && eq(parsedCache, orderdCache)) {
      return
    }

    debug('write manifest json:', JSON.stringify(orderdCache || {}, null, 2))
    writeFile(targetPath, JSON.stringify(orderdCache || {}, null, 2))
  }
}
