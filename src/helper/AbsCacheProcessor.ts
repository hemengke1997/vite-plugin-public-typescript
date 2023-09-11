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
}
