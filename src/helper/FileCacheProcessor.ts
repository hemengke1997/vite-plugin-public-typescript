import path from 'path'
import fs from 'fs-extra'
import glob from 'tiny-glob'
import { normalizePath } from 'vite'
import createDebug from 'debug'
import { assert } from './assert'
import { globalConfigBuilder } from './GlobalConfigBuilder'
import type { IAddFile, IDeleteFile } from './AbsCacheProcessor'
import { AbsCacheProcessor } from './AbsCacheProcessor'
import { writeFile } from './utils'

const debug = createDebug('FileCacheProcessor ===> ')

export class FileCacheProcessor extends AbsCacheProcessor {
  async deleteOldJs(args: IDeleteFile): Promise<void> {
    const { fileName, jsFileName = '', force = false } = args

    const {
      outputDir,
      cache,
      config: { publicDir },
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

    if (oldFiles.length) {
      for (const f of oldFiles) {
        if (path.parse(f).name === jsFileName) {
          debug('deleteOldJsFile - skip file:', jsFileName)
          continue
        } // skip repeat js file
        if (fs.existsSync(f)) {
          if (cache.getCache(fileName) || force) {
            cache.removeCache(fileName)
            debug('deleteOldJsFile - cache removed:', fileName)
            fs.remove(f)
            debug('deleteOldJsFile -file removed:', f)
          }
        }
      }
    } else if (force) {
      cache.removeCache(fileName)
      debug('cache force removed:', fileName)
    }
  }

  async addNewJs(args: IAddFile): Promise<void> {
    const { contentHash, code = '', fileName } = args
    const {
      cache,
      outputDir,
      config: { publicDir },
    } = globalConfigBuilder.get()

    let outPath = normalizePath(`${outputDir}/${fileName}.js`)
    if (contentHash) {
      outPath = normalizePath(`${outputDir}/${fileName}.${contentHash}.js`)
    }

    const fp = normalizePath(path.join(publicDir, outPath))
    await fs.ensureDir(path.dirname(fp))

    writeFile(fp, code)

    cache.setCache({
      [fileName]: {
        path: outPath,
      },
    })

    debug('addJsFile cache seted:', fileName, outPath)
  }
}
