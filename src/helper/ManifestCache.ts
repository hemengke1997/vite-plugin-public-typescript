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

type TCacheValue = {
  path: string
  _code?: string
} & Partial<{ [_key: string]: string }>

/**
 * {
 *   fileName: {
 *    path: '/some-path',
 *    _code: 'compiled code'
 *    // and more
 *   }
 * }
 */
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

  setCache(c: T, opts?: { disableWatch?: boolean }) {
    const keys = Object.keys(c)

    keys.forEach((k) => {
      const cacheV = this.getCache(k)
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

  getCache(k: keyof T) {
    return this.cache[k]
  }

  removeCache(k: keyof T) {
    if (this.cache[k]) {
      delete this.cache[k]
    }
    return this
  }

  getAll() {
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

  private extractPath(c: T) {
    const cache = Object.assign({}, c)
    const pathOnlyCache: Record<string, string> = {}
    for (const key in cache) {
      pathOnlyCache[key] = cache[key].path
    }
    return pathOnlyCache
  }

  async writeManifestJSON() {
    const targetPath = this.getManifestPath()
    const cacheObj = this.extractPath(this.getAll())
    const orderdCache = Object.assign({}, cacheObj)

    await fs.ensureDir(path.dirname(targetPath))

    const parsedCache = this.readManifestFromFile()

    if (!isEmptyObject(parsedCache) && eq(parsedCache, orderdCache)) {
      return
    }
    writeFile(targetPath, JSON.stringify(orderdCache || {}, null, 2))
  }
}
