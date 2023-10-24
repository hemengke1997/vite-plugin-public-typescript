import createDebug from 'debug'
import path from 'node:path'
import Watcher from 'watcher'
import { globalConfig } from '../global-config'
import { build } from './build'
import { _isPublicTypescript } from './utils'

const debug = createDebug('vite-plugin-public-typescript:file-watcher ===> ')

export async function handleUnlink(filePath: string, cb: () => void) {
  if (_isPublicTypescript(filePath)) {
    const fileName = path.parse(filePath).name
    debug('unlink:', fileName)
    await globalConfig.get().cacheProcessor.deleteOldJs({ originFileName: fileName })
    cb()
  }
}

export async function handleFileAdded(filePath: string, cb: () => void) {
  if (_isPublicTypescript(filePath)) {
    debug('file added:', filePath)
    await build({ filePath }, (...args) => globalConfig.get().cacheProcessor.onTsBuildEnd(...args))
    cb()
  }
}

export async function handleFileRenamed(filePath: string, filePathNext: string, cb: () => void) {
  if (_isPublicTypescript(filePath)) {
    debug('file renamed:', filePath, '==>', filePathNext)
    await handleUnlink(filePath, cb)
    await handleFileAdded(filePathNext, cb)
  }
}

export function initWatcher(cb: () => void) {
  try {
    const watcher = new Watcher(globalConfig.get().absInputDir, {
      debounce: 0,
      ignoreInitial: true,
      recursive: true,
      renameDetection: true,
      renameTimeout: 0,
    })

    watcher.on('unlink', (filePath) => handleUnlink(filePath, cb))

    watcher.on('add', (filePath) => handleFileAdded(filePath, cb))

    watcher.on('rename', async (f, fNext) => {
      await handleFileRenamed(f, fNext, cb)
    })
  } catch (error) {
    console.error(error)
  }
}
