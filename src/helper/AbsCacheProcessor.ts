import { normalizePath } from 'vite'
import createDebug from 'debug'
import type { ManifestCache } from './ManifestCache'

const debug = createDebug('vite-plugin-public-typescript:AbsCacheProcessor ===> ')

export type BuildEndArgs = {
  tsFileName: string
  jsFileNameWithHash: string
  code: string
  contentHash: string
}

export interface IDeleteFile {
  tsFileName: string
  jsFileName?: string
  silent?: boolean
}

export interface IAddFile {
  code?: string
  tsFileName: string
  contentHash: string
}

export abstract class AbsCacheProcessor {
  cache: ManifestCache
  abstract deleteOldJs(args: IDeleteFile): Promise<void>
  abstract addNewJs(args: IAddFile): Promise<void>

  constructor(cache: ManifestCache) {
    this.cache = cache
  }

  async onTsBuildEnd(args: BuildEndArgs) {
    const { tsFileName, jsFileNameWithHash, code, contentHash } = args

    debug('onTsBuildEnd:', args)

    await this.deleteOldJs({ tsFileName, jsFileName: jsFileNameWithHash, silent: true })

    await this.addNewJs({ code, tsFileName, contentHash })
  }

  setCache(
    args: IAddFile,
    config: {
      outputDir: string
    },
  ) {
    const { contentHash, code = '', tsFileName } = args
    const { outputDir } = config

    function getOutputPath(p: string, hash?: string) {
      hash = hash ? `.${hash}` : ''
      return normalizePath(`${p}/${tsFileName}${hash}.js`)
    }

    let outputPath = getOutputPath(outputDir)
    if (contentHash) {
      outputPath = getOutputPath(outputDir, contentHash)
    }

    this.cache.set({
      [tsFileName]: {
        path: outputPath,
        _code: code,
        _hash: contentHash,
      },
    })

    return outputPath
  }
}
