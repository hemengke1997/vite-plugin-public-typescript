import { AbsCacheProcessor } from './AbsCacheProcessor'
import type { IAddFile, IDeleteFile } from './AbsCacheProcessor'
import { globalConfigBuilder } from './GlobalConfigBuilder'

export class MemoryCacheProcessor extends AbsCacheProcessor {
  async deleteOldJs(args: IDeleteFile): Promise<void> {
    const { fileName } = args
    const { cache } = globalConfigBuilder.get()

    cache.remove(fileName)
  }

  async addNewJs(args: IAddFile): Promise<void> {
    this.setCache(args, globalConfigBuilder.get())
  }
}
