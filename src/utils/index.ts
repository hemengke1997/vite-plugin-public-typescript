import path from 'node:path'
import type { WebSocketServer } from 'vite'
import { normalizePath } from 'vite'
import fs from 'fs-extra'

export const ts = '.ts'

export function reloadPage(ws: WebSocketServer) {
  ws.send({
    type: 'full-reload',
  })
}

export function isPublicTypescript(args: { filePath: string; inputDir: string; root: string }) {
  const { filePath, root, inputDir } = args
  return path.extname(filePath) === ts && normalizePath(filePath).includes(normalizePath(path.resolve(root, inputDir)))
}

export function isWindows() {
  return typeof process != 'undefined' && process.platform === 'win32'
}

export const linebreak = isWindows() ? '\r\n' : '\n'

export function detectNewline(string: string) {
  const newlines = string.match(/(?:\r?\n)/g) || []

  if (newlines.length === 0) {
    return
  }

  const crlf = newlines.filter((newline) => newline === '\r\n').length
  const lf = newlines.length - crlf

  return crlf > lf ? '\r\n' : '\n'
}

export function eol(text: string) {
  const newline = /\r\n|\r|\n/g
  if (!detectNewline(text)) {
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

  fs.writeFileSync(filename, eol(content))
}
