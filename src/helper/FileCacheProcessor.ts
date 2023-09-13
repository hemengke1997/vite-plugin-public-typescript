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

const debug = createDebug('FileCacheProcessor ===> ')

// file-based processor
// the final output dir is base on `publicDir`
export class FileCacheProcessor extends AbsCacheProcessor {
  async deleteOldJs(args: IDeleteFile): Promise<void> {
    const { fileName, jsFileName = '', force = false } = args

    const {
      outputDir,
      cache,
      viteConfig: { publicDir },
    } = globalConfigBuilder.get()

    let oldFiles: string[] = []
    try {
      fs.ensureDirSync(path.join(publicDir, outputDir))

      oldFiles = await glob(normalizePath(path.join(publicDir, `${outputDir}/${fileName}.?(*.)js`)))
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
          debug('deleteOldJsFile - file exists:', f, fileName)
          if (cache.getByKey(fileName) || force) {
            cache.remove(fileName)
            debug('deleteOldJsFile - cache removed:', fileName)
            fs.remove(f)
            debug('deleteOldJsFile -file removed:', f)
          }
        }
      }
    } else if (force) {
      cache.remove(fileName)
      debug('cache force removed:', fileName)
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
