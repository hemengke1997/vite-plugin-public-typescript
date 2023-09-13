import { normalizePath } from 'vite'
import type { TGlobalConfig } from './GlobalConfigBuilder'

export interface IDeleteFile {
  fileName: string
  jsFileName?: string
  force?: boolean
}

export interface IAddFile {
  code?: string
  fileName: string
  contentHash: string
}

export abstract class AbsCacheProcessor {
  abstract deleteOldJs(args: IDeleteFile): Promise<void>
  abstract addNewJs(args: IAddFile): Promise<void>
  setCache(args: IAddFile, globalConfig: TGlobalConfig) {
    const { contentHash, code = '', fileName } = args
    const { cache, outputDir } = globalConfig

    function getOutputPath(p: string, hash?: string) {
      hash = hash ? `.${hash}` : ''
      return normalizePath(`${p}/${fileName}${hash}.js`)
    }

    let outPath = getOutputPath(outputDir)
    if (contentHash) {
      outPath = getOutputPath(outputDir, contentHash)
    }

    cache.set({
      [fileName]: {
        path: outPath,
        _code: code,
        _hash: contentHash,
      },
    })

    return outPath
  }
}
