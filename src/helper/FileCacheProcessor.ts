import path from 'path'
import fs from 'fs-extra'
import glob from 'tiny-glob'
import { normalizePath } from 'vite'
import createDebug from 'debug'
import { assert } from './assert'
import { globalConfigBuilder } from './GlobalConfigBuilder'
import { AbsCacheProcessor } from './AbsCacheProcessor'
import type { IAddFile, IDeleteFile } from './AbsCacheProcessor'
import { writeFile } from './utils'
import type { ManifestCache } from './ManifestCache'

const debug = createDebug('FileCacheProcessor ===> ')

// file-based processor
// the final output dir is base on `publicDir`
export class FileCacheProcessor extends AbsCacheProcessor {
  constructor(cache: ManifestCache) {
    super(cache)
  }

  async deleteOldJs(args: IDeleteFile): Promise<void> {
    const { tsFileName, jsFileName = '' } = args

    const {
      outputDir,
      cache,
      viteConfig: { publicDir },
    } = globalConfigBuilder.get()

    let oldFiles: string[] = []
    try {
      fs.ensureDirSync(path.join(publicDir, outputDir))

      oldFiles = await glob(normalizePath(path.join(publicDir, `${outputDir}/${tsFileName}.?(*.)js`)))
    } catch (e) {
      console.error(e)
    }

    debug('deleteOldJsFile - oldFiles:', oldFiles)

    assert(Array.isArray(oldFiles))

    debug('cache:', cache.get())

    if (oldFiles.length) {
      for (const f of oldFiles) {
        if (path.parse(f).name === jsFileName) {
          debug('deleteOldJsFile - skip file:', jsFileName)
          continue
        } // skip repeat js file
        if (fs.existsSync(f)) {
          debug('deleteOldJsFile - file exists:', f, tsFileName)
          cache.remove(tsFileName)
          debug('deleteOldJsFile - cache removed:', tsFileName)
          fs.remove(f)
          debug('deleteOldJsFile -file removed:', f)
        }
      }
    } else {
      cache.remove(tsFileName)
      debug('cache removed:', tsFileName)
    }
  }

  async addNewJs(args: IAddFile): Promise<void> {
    const { code = '' } = args
    const {
      viteConfig: { publicDir },
    } = globalConfigBuilder.get()

    const outPath = this.setCache(args, globalConfigBuilder.get())

    const fp = normalizePath(path.join(publicDir, outPath))

    await fs.ensureDir(path.dirname(fp))

    writeFile(fp, code)
  }
}
