import createDebug from 'debug'
import path from 'node:path'
import { build } from '../build'
import { globalConfig } from '../global-config'
import { _isPublicTypescript } from './utils'

const debug = createDebug('vite-plugin-public-typescript:file-watcher ===> ')

export async function handleUnlink(filePath: string, cb?: () => void) {
  if (_isPublicTypescript(filePath)) {
    const fileName = path.parse(filePath).name
    debug('unlink:', fileName)
    await globalConfig.get('cacheProcessor').deleteOldJs({ originFile: fileName })
    cb?.()
  }
}

export async function handleFileAdded(filePath: string, cb?: () => void) {
  if (_isPublicTypescript(filePath)) {
    debug('file added:', filePath)
    await build({ filePath }, (...args) => globalConfig.get('cacheProcessor').onTsBuildEnd(...args))
    cb?.()
  }
}

export async function handleFileRenamed(filePath: string, filePathNext: string, cb?: () => void) {
  if (_isPublicTypescript(filePath)) {
    debug('file renamed:', filePath, '==>', filePathNext)
    await handleUnlink(filePath)
    await handleFileAdded(filePathNext)
    cb?.()
  }
}

export async function handleFileChange(filePath: string, cb?: () => void) {
  handleFileAdded(filePath, cb)
}
