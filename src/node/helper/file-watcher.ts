import createDebug from 'debug'
import path from 'node:path'
import colors from 'picocolors'
import { build } from '../build'
import { globalConfig } from '../global-config'
import { type HmrFile } from './server'
import { _isPublicTypescript, pkgName } from './utils'

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

async function handleFileChange(filePath: string, cb?: () => void) {
  handleFileAdded(filePath, cb)
}

export async function initWatcher(cb: (file: HmrFile) => void) {
  try {
    const { default: Watcher } = await import('watcher')
    const watcher = new Watcher(globalConfig.get('absInputDir'), {
      debounce: 200,
      ignoreInitial: true,
      recursive: true,
      renameDetection: true,
      renameTimeout: 100,
    })

    watcher.on('unlink', (filePath: string) => handleUnlink(filePath, () => cb({ path: filePath, event: 'deleted' })))

    watcher.on('add', (filePath: string) => handleFileAdded(filePath, () => cb({ path: filePath, event: 'added' })))

    watcher.on('rename', async (f: string, fNext: string) => {
      handleFileRenamed(f, fNext, () => cb({ path: fNext, event: `renamed` }))
    })

    watcher.on('change', (filePath: string) => {
      handleFileChange(filePath, () => cb({ path: filePath, event: 'changed' }))
    })

    return watcher
  } catch (error) {
    console.error(colors.red(`[${pkgName}] `), error)
  }
}
