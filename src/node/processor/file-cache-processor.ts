import createDebug from 'debug'
import fs from 'fs-extra'
import path from 'node:path'
import colors from 'picocolors'
import { normalizePath } from 'vite'
import { globalConfig } from '../global-config'
import { writeFile } from '../helper/io'
import { findAllOldJsFile, pkgName } from '../helper/utils'
import { type CacheValueEx } from '../manifest-cache'
import { type ManifestCache } from '../manifest-cache/manifest-cache'
import { type AddFileArgs, type DeleteFileArgs, ManifestCacheProcessor } from './manifest-cache-processor'

const debug = createDebug('FileCacheProcessor ===> ')

// file-based processor
// the final output dir is base on `publicDir`
export class FileCacheProcessor extends ManifestCacheProcessor {
  constructor(manifestCache: ManifestCache<CacheValueEx>) {
    super(manifestCache)
    this.manifestCache = manifestCache
  }

  async deleteOldJs(args: DeleteFileArgs): Promise<void> {
    const { originFile, compiledFileName = '', silent } = args

    const { outputDir } = globalConfig.get(['outputDir'])

    let oldFiles: string[] = []
    fs.ensureDirSync(outputDir)
    try {
      oldFiles = await findAllOldJsFile({
        originFiles: [originFile],
        outputDir,
      })
    } catch (error) {
      console.error(colors.red(`[${pkgName}] `), error)
    }

    debug('deleteOldJsFile - oldFiles:', oldFiles)

    debug('manifestCache:', this.manifestCache.all)

    if (oldFiles.length > 0) {
      for (const f of oldFiles) {
        if (path.parse(f).name === compiledFileName) {
          debug('deleteOldJsFile - skip file:', compiledFileName)
          continue
        } // skip repeat js file
        if (fs.existsSync(f)) {
          debug('deleteOldJsFile - file exists:', f, originFile)
          this.manifestCache.remove(originFile, { silent })
          debug('deleteOldJsFile - manifestCache removed:', originFile)
          fs.remove(f)
          debug('deleteOldJsFile -file removed:', f)
        }
      }
    } else {
      this.manifestCache.remove(originFile, { silent })
      debug('manifestCache removed:', originFile)
    }
  }

  async addNewJs(args: AddFileArgs): Promise<void> {
    const { code = '' } = args
    const { publicDir } = globalConfig.get('viteConfig')

    const pathToDisk = this.setCache(args, globalConfig.all)
    const jsFilePath = normalizePath(path.join(publicDir, pathToDisk))

    if (!jsFilePath) return

    fs.ensureDirSync(path.dirname(jsFilePath))

    writeFile(jsFilePath, code)
  }
}
