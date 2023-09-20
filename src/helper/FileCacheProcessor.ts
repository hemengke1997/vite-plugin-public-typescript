import path from 'path'
import fs from 'fs-extra'
import { normalizePath } from 'vite'
import createDebug from 'debug'
import { assert } from './assert'
import { globalConfigBuilder } from './GlobalConfigBuilder'
import { AbsCacheProcessor } from './AbsCacheProcessor'
import type { IAddFile, IDeleteFile } from './AbsCacheProcessor'
import { findAllOldJsFile, writeFile } from './utils'
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
      viteConfig: { publicDir },
    } = globalConfigBuilder.get()

    let oldFiles: string[] = []
    try {
      fs.ensureDirSync(path.join(publicDir, outputDir))
      oldFiles = await findAllOldJsFile({
        outputDir,
        publicDir,
        tsFileNames: [tsFileName],
      })
    } catch (e) {
      console.error(e)
    }

    debug('deleteOldJsFile - oldFiles:', oldFiles)

    assert(Array.isArray(oldFiles))

    debug('cache:', this.cache.get())

    if (oldFiles.length) {
      for (const f of oldFiles) {
        if (path.parse(f).name === jsFileName) {
          debug('deleteOldJsFile - skip file:', jsFileName)
          continue
        } // skip repeat js file
        if (fs.existsSync(f)) {
          debug('deleteOldJsFile - file exists:', f, tsFileName)
          this.cache.remove(tsFileName)
          debug('deleteOldJsFile - cache removed:', tsFileName)
          fs.remove(f)
          debug('deleteOldJsFile -file removed:', f)
        }
      }
    } else {
      this.cache.remove(tsFileName)
      debug('cache removed:', tsFileName)
    }
  }

  async addNewJs(args: IAddFile): Promise<void> {
    const { code = '' } = args
    const {
      viteConfig: { publicDir },
    } = globalConfigBuilder.get()

    const pathToDisk = this.setCache(args, globalConfigBuilder.get())

    const jsFilePath = normalizePath(path.join(publicDir, pathToDisk))

    fs.ensureDirSync(path.dirname(jsFilePath))

    writeFile(jsFilePath, code)
  }
}
