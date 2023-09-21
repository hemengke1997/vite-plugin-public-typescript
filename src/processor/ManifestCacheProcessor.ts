import { normalizePath } from 'vite'
// import createDebug from 'debug'
import type { ManifestCache } from '../manifest-cache/ManifestCache'
import type { CacheValueEx } from '../manifest-cache'
import type { GlobalConfig } from '../global-config/GlobalConfigBuilder'
import { BaseCacheProcessor } from './BaseCacheProcessor'

// const debug = createDebug('vite-plugin-public-typescript:ManifestCacheProcessor ===> ')

export interface DeleteFileArgs {
  originFileName: string
  /**
   * if true, will not write file to disk
   */
  silent?: boolean
  compiledFileName?: string
}

export interface AddFileArgs {
  originFileName: string
  contentHash: string
  silent?: boolean
  code?: string
}

export abstract class ManifestCacheProcessor extends BaseCacheProcessor<CacheValueEx> {
  constructor(manifestCache: ManifestCache<CacheValueEx>) {
    super(manifestCache)
    this.manifestCache = manifestCache
  }

  genCacheItemPath(args: { contentHash: string; originFileName: string; outputDir: string; base: string }) {
    const { contentHash, originFileName, outputDir, base } = args
    const hash = contentHash ? `.${contentHash}` : ''
    return normalizePath(`${base + outputDir}/${originFileName}${hash}.js`)
  }

  setCache(args: AddFileArgs, config: GlobalConfig) {
    const { contentHash, originFileName, code } = args
    const {
      outputDir,
      viteConfig: { base },
    } = config

    const pathWithBase = this.genCacheItemPath({ base, contentHash, originFileName, outputDir })

    this.manifestCache.set({
      [originFileName]: {
        path: pathWithBase,
        _code: code || '',
        _hash: contentHash,
      },
    })
    return this.manifestCache.get()[originFileName]._pathToDisk || ''
  }
}
