import { normalizePath } from 'vite'
import { type GlobalConfig } from '../global-config/GlobalConfigBuilder'
import { type CacheValueEx } from '../manifest-cache'
// import createDebug from 'debug'
import { type ManifestCache } from '../manifest-cache/ManifestCache'
import { BaseCacheProcessor } from './BaseCacheProcessor'

// const debug = createDebug('vite-plugin-public-typescript:ManifestCacheProcessor ===> ')

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

  genCacheItemPath(args: { contentHash: string; originFile: string; outputDir: string; base: string }) {
    const { contentHash, originFile, outputDir, base } = args
    const hash = contentHash ? `.${contentHash}` : ''
    return normalizePath(`${base + outputDir}/${originFile}${hash}.js`)
  }

  setCache(args: AddFileArgs, config: GlobalConfig) {
    const { contentHash, originFile, code } = args
    const { outputDir, base } = config

    const pathWithBase = this.genCacheItemPath({ base, contentHash, originFile, outputDir })

    this.manifestCache.set({
      [originFile]: {
        path: pathWithBase,
        _code: code || '',
        _hash: contentHash,
      },
    })
    return this.manifestCache.get(originFile)._pathToDisk || ''
  }
}
