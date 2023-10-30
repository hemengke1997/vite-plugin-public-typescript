import path from 'node:path'
import { describe, expect, test } from 'vitest'
import { globalConfig } from '../src/node/global-config'
import { setEol } from '../src/node/helper/io'
import {
  eq,
  extractHashFromFileName,
  getContentHash,
  isPublicTypescript,
  linebreak,
  validateOptions,
} from '../src/node/helper/utils'

describe('unit test', () => {
  test('should return true when filePath is a public typescript file', () => {
    const filePath = 'src/foo/bar.ts'
    const root = 'src'
    const inputDir = 'foo'
    expect(isPublicTypescript({ filePath, inputDir, root })).toBe(true)
  })

  test('should return false when filePath is not a public typescript file', () => {
    const filePath = 'src/foo/bar.js'
    const root = 'src'
    const inputDir = 'foo'
    expect(isPublicTypescript({ filePath, inputDir, root })).toBe(false)
  })

  test('should be typescript file', () => {
    const root = process.cwd()
    const tsFile = 'hello.ts'
    const otherFile = 'hello.js'
    const res1 = isPublicTypescript({
      filePath: path.resolve(root, `public-typescript/${tsFile}`),
      inputDir: 'public-typescript',
      root,
    })

    const res2 = isPublicTypescript({
      filePath: path.resolve(root, `public-typescript/${otherFile}`),
      inputDir: 'public-typescript',
      root,
    })

    expect(res1).toBe(true)
    expect(res2).toBe(false)
  })

  test('should add eol', () => {
    const json = JSON.stringify({ a: 'b' }, null, 2)
    const eolJson = setEol(json)
    expect(eolJson).toEqual(`{${linebreak}  "a": "b"${linebreak}}${linebreak}`)
  })

  test('should obj eq', () => {
    expect(eq({}, {})).toBe(true)
    expect(eq({ a: 1 }, { a: 1 })).toBe(true)
  })

  test('should obj not eq', () => {
    expect(eq([], {})).toBe(false)
    expect(eq({ a: 1 }, { a: 2 })).toBe(false)
  })

  test('should hash stable', () => {
    const code = 'export const t = { hello: "world" }'
    const a = getContentHash(code)
    const b = getContentHash(code)

    expect(a).toBe(b)
  })

  test('should get globalConfig', () => {
    expect(() => globalConfig.get()).not.toThrowError()
  })

  test('should extract hash', () => {
    const hash1 = extractHashFromFileName('dir/hello.1234.js', 4)
    const hash2 = extractHashFromFileName('hello.1234', 4)
    expect(hash1).toBe('1234')
    expect(hash2).toBe('1234')
  })

  test('should validate options success', () => {
    const opts = {
      destination: 'file',
      esbuildOptions: {},
      hash: true,
      inputDir: 'public-typescript',
      manifestName: 'manifest',
      outputDir: '/',
      sideEffects: false,
      ssrBuild: false,
      cacheDir: 'node_modules/.vite-plugin-public-typescript',
    } as const

    expect(() => validateOptions(opts)).not.toThrowError()
  })
})

describe('globalConfig related', () => {
  test('global config ctx', ({ _globalConfig }) => {
    expect(_globalConfig).toBeTruthy()
  })

  test('global config should be same', ({ _globalConfig }) => {
    expect(_globalConfig).toBe(globalConfig.get())
  })
})
