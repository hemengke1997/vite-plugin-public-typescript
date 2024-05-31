import createDebug from 'debug'
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

function removeBase(filePath: string, base: string): string {
  const devBase = base.at(-1) === '/' ? base : `${base}/`
  return filePath.startsWith(devBase) ? filePath.slice(devBase.length - 1) : filePath
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

    // 用户输入的outputDir
    const outputDirRelativePublicDir = normalizePath(outputDir.slice(publicDir.length))

    const pathWithBase = this.genCacheItemPath({
      base,
      contentHash,
      originFile,
      outputDir: outputDirRelativePublicDir,
    })

    this.manifestCache.set({
      [originFile]: {
        path: pathWithBase,
        _code: code || '',
        _hash: contentHash,
        _pathToDisk: removeBase(pathWithBase, base),
      },
    })

    const pathToDisk = this.manifestCache.get(originFile)._pathToDisk
    debug('setCache absFilePath:', pathToDisk)
    return pathToDisk!
  }
}
