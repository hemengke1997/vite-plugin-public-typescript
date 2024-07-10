import createDebug from 'debug'
import { type CacheValue, type ManifestCache } from '../manifest-cache/manifest-cache'

const debug = createDebug('vite-plugin-public-typescript:BaseCacheProcessor ===> ')

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

export abstract class BaseCacheProcessor<
  T extends CacheValue = CacheValue,
  U extends ManifestCache<T> = ManifestCache<T>,
> {
  manifestCache: U
  abstract deleteOldJs(args: DeleteFileArgs): Promise<void>
  abstract addNewJs(args: AddFileArgs): Promise<void>

  constructor(manifestCache: U) {
    this.manifestCache = manifestCache
  }

  async onTsBuildEnd(deleteArgs: DeleteFileArgs, addArgs: AddFileArgs) {
    debug('onTsBuildEnd deleteArgs:', deleteArgs)
    debug('onTsBuildEnd addArgs:', addArgs)

    await this.deleteOldJs(deleteArgs)
    await this.addNewJs(addArgs)
  }
}
