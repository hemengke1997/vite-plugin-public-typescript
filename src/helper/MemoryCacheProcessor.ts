// import createDebug from 'debug'
import type { IAddFile, IDeleteFile } from './AbsCacheProcessor'
import { AbsCacheProcessor } from './AbsCacheProcessor'
import { globalConfigBuilder } from './GlobalConfigBuilder'
import { VIRTUAL } from './virtual'

// const debug = createDebug('MemoryCacheProcessor ===> ')

export class MemoryCacheProcessor extends AbsCacheProcessor {
  async deleteOldJs(args: IDeleteFile): Promise<void> {
    const { fileName } = args
    const { cache } = globalConfigBuilder.get()

    cache.removeCache(fileName)
  }

  async addNewJs(args: IAddFile): Promise<void> {
    const { contentHash, code = '', fileName } = args
    const { cache } = globalConfigBuilder.get()

    // const getContentHash = () => {
    //   if (contentHash) {
    //     return `:${contentHash}`
    //   }
    //   return ''
    // }

    cache.setCache({
      [fileName]: {
        // path: 虚拟前缀-文件名
        path: `${VIRTUAL}:[${fileName}]`,
        _code: code,
        contentHash,
      },
    })
  }
}
