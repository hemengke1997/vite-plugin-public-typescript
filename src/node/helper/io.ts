import createDebug from 'debug'
import fs from 'fs-extra'
import path from 'node:path'
import { globalConfig } from '../global-config'
import { extractHashFromFileName, linebreak } from './utils'

const debug = createDebug('vite-plugin-public-typescript:io ===> ')

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

export function readJsonFile(file: string): Record<string, string> {
  if (!fs.existsSync(file)) {
    return {}
  }

  const cacheJson = fs.readFileSync(file, 'utf-8')
  if (cacheJson) {
    return JSON.parse(cacheJson)
  }

  return {}
}

export function writeFile(filename: string, content: string, hash = true): void {
  const dir = path.dirname(filename)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  const newContent = setEol(content)

  if (fs.existsSync(filename)) {
    if (hash) {
      const _hash = globalConfig.get('hash')
      if (extractHashFromFileName(filename, _hash)) {
        // if filename has hash, skip write file
        debug('skip writeFile, filename has hash')
        return
      }
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

export function writeJsonFile(filename: string, content: Record<string, string>) {
  const formattedContent = JSON.stringify(content || {}, null, 2)
  writeFile(filename, formattedContent, false)
  return true
}
