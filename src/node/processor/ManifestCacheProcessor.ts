import createDebug from 'debug'
import path from 'node:path'
import { normalizePath } from 'vite'
import { type GlobalConfig } from '../global-config/GlobalConfigBuilder'
import { type CacheValueEx } from '../manifest-cache'
import { type ManifestCache } from '../manifest-cache/ManifestCache'
import { BaseCacheProcessor } from './BaseCacheProcessor'

const debug = createDebug('vite-plugin-public-typescript:ManifestCacheProcessor ===> ')

export interface DeleteFileArgs {
  originFile: string
  /**
   * if true, will not write file to disk
   */
  silent?: boolean
  compiledFileName?: string
}

export interface AddFileArgs {
  originFile: string
  contentHash: string
  silent?: boolean
  code?: string
}

export abstract class ManifestCacheProcessor extends BaseCacheProcessor<CacheValueEx> {
  constructor(manifestCache: ManifestCache<CacheValueEx>) {
    super(manifestCache)
    this.manifestCache = manifestCache
  }

  genCacheItemPath(args: { contentHash: string; originFile: string; outputDir: string; base?: string }) {
    let { contentHash, originFile, outputDir, base } = args
    contentHash = contentHash ? `.${contentHash}` : ''
    base = base ? `${base}/` : ''
    return normalizePath(`${base}${outputDir}/${originFile}${contentHash}.js`)
  }

  setCache(args: AddFileArgs, config: GlobalConfig) {
    const { contentHash, originFile, code } = args
    const { outputDir, base, publicDir } = config

    this.manifestCache.set({
      [originFile]: {
        path: this.genCacheItemPath({
          base,
          contentHash,
          originFile,
          outputDir: path.relative(publicDir, outputDir),
        }),
        _code: code || '',
        _hash: contentHash,
        _pathToDisk: this.genCacheItemPath({
          contentHash,
          originFile,
          outputDir: path.relative(publicDir, outputDir),
        }),
      },
    })

    const absFilePath = this.genCacheItemPath({
      contentHash,
      originFile,
      outputDir,
    })
    debug('setCache absFilePath:', absFilePath)
    return absFilePath
  }
}
