import createDebug from 'debug'
import fs from 'fs-extra'
import { createHash } from 'node:crypto'
import path from 'node:path'
import colors from 'picocolors'
import glob from 'tiny-glob'
import { type ResolvedConfig, createLogger, normalizePath } from 'vite'
import { type VPPTPluginOptions } from '..'
import { name as pkgName } from '../../../package.json'
import { globalConfig } from '../global-config'
import { manifestCache } from '../manifest-cache'
import { initCacheProcessor } from '../processor/processor'
import { disableManifestHmr } from './server'

const debug = createDebug('vite-plugin-public-typescript:util ===> ')

type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type OptionsTypeWithDefault = PartialBy<Required<VPPTPluginOptions>, 'base' | 'sideEffects'>

export { pkgName }

export function createInternalLogger(allowClearScreen?: boolean) {
  return createLogger('info', {
    allowClearScreen: !!allowClearScreen,
    prefix: `[${pkgName}]`,
  })
}

export function fileRelativeRootPath(filePath: string) {
  return normalizePath(`/${path.relative(globalConfig.get().viteConfig.root, filePath)}`)
}

export function isInTest() {
  return process.env.VITEST || process.env.CI
}

export function isPublicTypescript(args: { filePath: string; inputDir: string; root: string }) {
  const { filePath, root, inputDir } = args

  return (
    path.extname(filePath) === '.ts' &&
    normalizePath(path.resolve(root, inputDir)).endsWith(normalizePath(path.dirname(filePath)))
  )
}

export function _isPublicTypescript(filePath: string) {
  return isPublicTypescript({
    filePath,
    inputDir: globalConfig.get().inputDir,
    root: globalConfig.get().viteConfig.root,
  })
}

export function isManifestFile(filePath: string) {
  return filePath === manifestCache.manifestPath
}

export function isWindows() {
  return typeof process != 'undefined' && process.platform === 'win32'
}

export const linebreak = isWindows() ? '\r\n' : '\n'

export function detectLastLine(string: string) {
  const last = string.at(-1) || ''

  return /(?:\r?\n)/g.test(last)
}

const newline = /\r\n|\r|\n/g
export function setEol(text: string) {
  if (!detectLastLine(text)) {
    text += linebreak
  }

  return text.replaceAll(newline, linebreak)
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

export function converEmptyObjectToNull(obj: unknown) {
  if (isEmptyObject(obj)) {
    return null
  }
  return obj
}

export function writeFile(filename: string, content: string): void {
  const dir = path.dirname(filename)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  const newContent = setEol(content)

  if (fs.existsSync(filename)) {
    const { hash } = globalConfig.get()
    if (extractHashFromFileName(filename, hash)) {
      // if filename has hash, skip write file
      debug('skip writeFile, filename has hash')
      return
    }
    // Read content first
    // if content is same, skip write file
    const oldContent = fs.readFileSync(filename, 'utf-8')
    debug('oldContent:', oldContent, 'newContent:', newContent)
    if (oldContent && newContent === oldContent) {
      debug('skip writeFile, content is same with old content:', oldContent)
      return
    }
  }

  fs.writeFileSync(filename, newContent)

  debug('writeFile success:', filename)
}

function getHashLen(hash: VPPTPluginOptions['hash']) {
  return typeof hash === 'number' ? hash : HASH_LEN
}

const HASH_LEN = 8
export function getContentHash(chunk: string | Uint8Array | undefined, hash?: VPPTPluginOptions['hash']) {
  if (!chunk) {
    return ''
  }
  const hashLen = getHashLen(hash)
  return createHash('md5').update(chunk).digest('hex').slice(0, Math.max(0, hashLen))
}

export function extractHashFromFileName(filename: string, hash: VPPTPluginOptions['hash']) {
  const hashLen = getHashLen(hash)
  const regex = new RegExp(`\\.([\\w\\d]{${hashLen}})\\.?`)
  const match = filename.match(regex)
  if (match) {
    return match[1]
  }
  return ''
}

export function validateOptions(options: OptionsTypeWithDefault) {
  let { outputDir } = options
  // ensure outputDir is Dir
  if (!outputDir.startsWith('/')) {
    outputDir = `/${outputDir}`
  } else if (outputDir.length > 1 && outputDir.endsWith('/')) {
    // remove last slash
    options.outputDir = outputDir.replace(/\/$/, '')
  }
  options.outputDir = outputDir

  // ensure inputDir is Dir
  const { inputDir } = options
  if (inputDir.endsWith('/')) {
    // remove last slash
    options.inputDir = inputDir.replace(/\/$/, '')
  }

  if (options.sideEffects !== undefined) {
    console.warn(
      colors.yellow(
        `${colors.bold('(warning!)')} [${pkgName}]: sideEffects option is ${colors.bold(
          'deprecated',
        )}, please remove it`,
      ),
    )
  }
}

// remove slash at the start and end of path
export function normalizeAssetsDirPath(dir: string) {
  return dir.replaceAll(/^\/|\/$/g, '')
}

export function getInputDir(resolvedRoot: string, originInputDir: string, suffix = '') {
  return normalizePath(path.resolve(resolvedRoot, `${originInputDir}${suffix}`))
}

export async function findAllOldJsFile(args: { publicDir: string; outputDir: string; originFilesName: string[] }) {
  const { publicDir, outputDir, originFilesName } = args
  const dir = path.join(publicDir, outputDir)
  const oldFiles: string[] = []
  if (fs.existsSync(dir)) {
    for (const originFileName of originFilesName) {
      const old = await glob(normalizePath(path.join(publicDir, `${outputDir}/${originFileName}.?(*.)js`)))
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

// NOTE: remmember call this before write compiled js file to disk
export function removeBase(filePath: string, base: string): string {
  const devBase = base.at(-1) === '/' ? base : `${base}/`
  return filePath.startsWith(devBase) ? filePath.slice(devBase.length - 1) : filePath
}

export async function setupGlobalConfig(viteConfig: ResolvedConfig, opts: OptionsTypeWithDefault) {
  const resolvedRoot = normalizePath(viteConfig.root ? path.resolve(viteConfig.root) : process.cwd())

  opts.base = opts.base ?? viteConfig.base

  fs.ensureDirSync(getInputDir(resolvedRoot, opts.inputDir))

  const originFilesGlob = await glob(getInputDir(resolvedRoot, opts.inputDir, `/*.ts`), {
    absolute: true,
    cwd: resolvedRoot,
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

  return globalConfig.get()
}

export async function setupManifestCache(viteConfig: ResolvedConfig, opts: OptionsTypeWithDefault) {
  const cacheDir = path.resolve(viteConfig.root, opts.cacheDir)
  manifestCache.setManifestPath(normalizePath(`${cacheDir}/${opts.manifestName}.json`))

  // no need to set `_pathToDisk` manually anymore
  manifestCache.beforeSet = (value) => {
    if (value?.path) {
      value._pathToDisk = removeBase(value.path, opts.base!)
    }
    return value
  }

  disableManifestHmr(viteConfig, manifestCache.manifestPath)

  debug('manifestCache manifestPath:', manifestCache.manifestPath)
}
