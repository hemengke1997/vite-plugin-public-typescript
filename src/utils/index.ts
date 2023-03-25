import path from 'path'
import type { WebSocketServer } from 'vite'
import { normalizePath } from 'vite'
import fs from 'fs-extra'
import createDebug from 'debug'
import { name as PKGNAME } from '../../package.json'

export const debug = createDebug(PKGNAME)

export const TS_EXT = '.ts'

export function reloadPage(ws: WebSocketServer) {
  ws.send({
    path: '*',
    type: 'full-reload',
  })
}

export function isPublicTypescript(args: { filePath: string; inputDir: string; root: string }) {
  const { filePath, root, inputDir } = args

  return (
    path.extname(filePath) === TS_EXT &&
    normalizePath(path.resolve(root, inputDir)).endsWith(normalizePath(path.dirname(filePath)))
  )
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

export function writeFile(filename: string, content: string): void {
  const dir = path.dirname(filename)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  const newContent = setEol(content)

  if (fs.existsSync(filename)) {
    // Read content first
    // if content is same, skip write file
    const oldContent = fs.readFileSync(filename, 'utf-8')
    if (oldContent && newContent === oldContent) {
      debug('skip writeFile, content is same with old content')
      return
    }
  }

  fs.writeFileSync(filename, newContent)

  debug('writeFile success:', filename)
}
