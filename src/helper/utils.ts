import path from 'path'
import { createHash } from 'crypto'
import type { ResolvedConfig, WebSocketServer } from 'vite'
import { normalizePath } from 'vite'
import fs from 'fs-extra'
import createDebug from 'debug'
import glob from 'tiny-glob'
import type { VPPTPluginOptions } from '..'
import { globalConfigBuilder } from './GlobalConfigBuilder'
import { assert } from './assert'

const debug = createDebug('vite-plugin-public-typescript:util ===> ')

export function reloadPage(ws: WebSocketServer) {
  ws.send({
    path: '*',
    type: 'full-reload',
  })
}

export function isPublicTypescript(args: { filePath: string; inputDir: string; root: string }) {
  const { filePath, root, inputDir } = args

  return (
    path.extname(filePath) === '.ts' &&
    normalizePath(path.resolve(root, inputDir)).endsWith(normalizePath(path.dirname(filePath)))
  )
}

export function _isPublicTypescript(filePath: string) {
  const globalConfig = globalConfigBuilder.get()
  assert(!!globalConfig)
  return isPublicTypescript({ filePath, inputDir: globalConfig.inputDir, root: globalConfig.viteConfig.root })
}

export function isWindows() {
  return typeof process != 'undefined' && process.platform === 'win32'
}

export const linebreak = isWindows() ? '\r\n' : '\n'

export function detectLastLine(string: string) {
  const last = string[string.length - 1]

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
    const { hash } = globalConfigBuilder.get()
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
  return createHash('md5').update(chunk).digest('hex').substring(0, hashLen)
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

export function validateOptions(options: Required<VPPTPluginOptions>) {
  let { outputDir } = options
  // ensure outputDir is Dir
  if (!outputDir.startsWith('/')) {
    outputDir = `/${outputDir}`
  } else {
    if (outputDir.length > 1 && outputDir.endsWith('/')) {
      // remove last slash
      options.outputDir = outputDir.replace(/\/$/, '')
    }
  }
  options.outputDir = outputDir

  // ensure inputDir is Dir
  const { inputDir } = options
  if (inputDir.endsWith('/')) {
    // remove last slash
    options.inputDir = inputDir.replace(/\/$/, '')
  }
}

// remove slash at the start and end of path
export function normalizeAssetsDirPath(dir: string) {
  return dir.replace(/^\/|\/$/g, '')
}

export function addCodeHeader(code: string) {
  return `// gen via vite-plugin-public-typescript (show in serve mode only)\n${code}`
}

export function getInputDir(resolvedRoot: string, originInputDir: string, suffix = '') {
  return normalizePath(path.resolve(resolvedRoot, `${originInputDir}${suffix}`))
}

export async function findAllOldJsFile(args: { publicDir: string; outputDir: string; tsFileNames: string[] }) {
  const { publicDir, outputDir, tsFileNames } = args
  const dir = path.join(publicDir, outputDir)
  const oldFiles: string[] = []
  if (fs.existsSync(dir)) {
    for (const tsFileName of tsFileNames) {
      const old = await glob(normalizePath(path.join(publicDir, `${outputDir}/${tsFileName}.?(*.)js`)))
      if (old.length) {
        oldFiles.push(...old)
      }
    }
  }
  return oldFiles
}

export function removeOldJsFiles(oldFiles: string[]) {
  if (oldFiles.length) {
    for (const f of oldFiles) {
      if (fs.existsSync(f)) {
        fs.removeSync(f)
      }
    }
  }
}

export function disableManifestHmr(config: ResolvedConfig, manifestPath: string) {
  if (config.command === 'serve') {
    const index = config.configFileDependencies.indexOf(manifestPath)
    if (index !== -1) {
      config.configFileDependencies.splice(index, 1)
    }
  }
}

// NOTE: remmember call this before write compiled js file to disk
export function removeBase(filePath: string, base: string): string {
  const devBase = base[base.length - 1] === '/' ? base : `${base}/`
  return filePath.startsWith(devBase) ? filePath.slice(devBase.length - 1) : filePath
}
