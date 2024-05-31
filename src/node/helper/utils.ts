import createDebug from 'debug'
import glob from 'fast-glob'
import fs from 'fs-extra'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { isCI, isWindows } from 'std-env'
import { type ResolvedConfig, createLogger, normalizePath } from 'vite'
import { name as pkgName } from '../../../package.json'
import { globalConfig } from '../global-config'
import { type VitePublicTypescriptOptions } from '../interface'
import { manifestCache, saveManifestPathToDisk } from '../manifest-cache'
import { initCacheProcessor } from '../processor/processor'
import { disableManifestHmr } from './server'

const debug = createDebug('vite-plugin-public-typescript:util ===> ')

// type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type OptionsTypeWithDefault = Required<VitePublicTypescriptOptions>

export { pkgName }

export function isBoolean(v: unknown): v is boolean {
  return typeof v === 'boolean'
}

export function createInternalLogger(allowClearScreen?: boolean) {
  return createLogger('info', {
    allowClearScreen: !!allowClearScreen,
    prefix: `[${pkgName}]`,
  })
}

export function fileRelativeRootPath(filePath: string) {
  return normalizePath(`/${path.relative(globalConfig.get('viteConfig')!.root, filePath)}`)
}

export function isInTest() {
  return process.env.VITEST || isCI
}

export function isPublicTypescript(args: { filePath: string; inputDir: string }) {
  const { filePath, inputDir } = args

  return path.extname(filePath) === '.ts' && normalizePath(inputDir).endsWith(normalizePath(path.dirname(filePath)))
}

export function _isPublicTypescript(filePath: string) {
  return isPublicTypescript({
    filePath,
    inputDir: globalConfig.get('inputDir'),
  })
}

export function isManifestFile(filePath: string) {
  return filePath === manifestCache.manifestPath
}

export function isObject(o: unknown): o is Object {
  return Object.prototype.toString.call(o) === '[object Object]'
}

export function eq<T extends Record<string, any>>(obj1: T, obj2: T): boolean {
  if (!obj1 || !obj2) {
    return false
  }

  if (!isObject(obj1) || !isObject(obj2)) {
    return false
  }

  const keys = Object.keys(obj1)
  if (keys.length !== Object.keys(obj2).length) {
    return false
  }

  return keys.every((k) => obj1[k] === obj2[k])
}

export function isEmptyObject(o: unknown) {
  return isObject(o) && Object.keys(o).length === 0
}

const HASH_LEN = 8

export const linebreak = isWindows ? '\r\n' : '\n'

export function getHashLen(hash: VitePublicTypescriptOptions['hash']) {
  return typeof hash === 'number' ? hash : HASH_LEN
}

export function extractHashFromFileName(filename: string, hash: VitePublicTypescriptOptions['hash']) {
  const hashLen = getHashLen(hash)
  const regex = new RegExp(`\\.([\\w\\d]{${hashLen}})\\.?`)
  const match = filename.match(regex)
  if (match) {
    return match[1]
  }
  return ''
}

export function getContentHash(chunk: string | Uint8Array | undefined, hash?: VitePublicTypescriptOptions['hash']) {
  if (!chunk) {
    return ''
  }
  const hashLen = getHashLen(hash)
  return createHash('md5').update(chunk).digest('hex').slice(0, Math.max(0, hashLen))
}

// remove slash at the start and end of path
export function normalizeAssetsDirPath(dir: string) {
  return dir.replaceAll(/^\/|\/$/g, '')
}

export function getInputDir(resolvedRoot: string, originInputDir: string, suffix = '') {
  return normalizePath(path.join(resolvedRoot, `${originInputDir}${suffix}`))
}

export async function findAllOldJsFile(args: { originFiles: string[]; outputDir: string }) {
  const { outputDir, originFiles } = args
  const oldFiles: string[] = []
  if (fs.existsSync(outputDir)) {
    for (const originFile of originFiles) {
      const old = await glob(normalizePath(`${outputDir}/${originFile}.?(*.)js`))
      if (old.length > 0) {
        oldFiles.push(...old)
      }
    }
  }
  return oldFiles
}

export function removeOldJsFiles(oldFiles: string[]) {
  if (oldFiles.length > 0) {
    for (const f of oldFiles) {
      if (fs.existsSync(f)) {
        fs.removeSync(f)
      }
    }
  }
}

export async function setupGlobalConfig(viteConfig: ResolvedConfig, opts: OptionsTypeWithDefault) {
  fs.ensureDirSync(opts.inputDir)

  const originFilesGlob = await glob('*.ts', {
    absolute: true,
    cwd: opts.inputDir,
  })

  const cacheProcessor = initCacheProcessor(opts, manifestCache)

  const logger = createInternalLogger(viteConfig.clearScreen)

  globalConfig.init({
    cacheProcessor,
    manifestCache,
    originFilesGlob,
    viteConfig,
    logger,
    ...(opts as Required<OptionsTypeWithDefault>),
  })

  return globalConfig
}

export async function setupManifestCache(viteConfig: ResolvedConfig, opts: OptionsTypeWithDefault) {
  const cacheDir = opts.cacheDir

  manifestCache.setManifestPath(`${cacheDir}/${opts.manifestName}.json`)

  saveManifestPathToDisk(cacheDir)

  disableManifestHmr(viteConfig, manifestCache.manifestPath)

  debug('manifestCache manifestPath:', manifestCache.manifestPath)
}
