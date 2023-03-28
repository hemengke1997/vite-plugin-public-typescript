import path from 'path'
import { describe, expect, it, test } from 'vitest'
import { eq, extractHashFromFileName, getContentHash, isPublicTypescript, linebreak, setEol } from '../src/utils'
import { getGlobalConfig, setGlobalConfig } from '../src/utils/globalConfig'

describe('vite-plugin-public-typescript', () => {
  it('should return true when filePath is a public typescript file', () => {
    const filePath = 'src/foo/bar.ts'
    const root = 'src'
    const inputDir = 'foo'
    expect(isPublicTypescript({ filePath, root, inputDir })).toBe(true)
  })

  it('should return false when filePath is not a public typescript file', () => {
    const filePath = 'src/foo/bar.js'
    const root = 'src'
    const inputDir = 'foo'
    expect(isPublicTypescript({ filePath, root, inputDir })).toBe(false)
  })

  test('should be typescript file', () => {
    const root = process.cwd()
    const tsFile = 'hello.ts'
    const otherFile = 'hello.js'
    const res1 = isPublicTypescript({
      filePath: path.resolve(root, `publicTypescript/${tsFile}`),
      root,
      inputDir: 'publicTypescript',
    })

    const res2 = isPublicTypescript({
      filePath: path.resolve(root, `publicTypescript/${otherFile}`),
      root,
      inputDir: 'publicTypescript',
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

  test('should getGlobalConfig throw error', () => {
    expect(() => getGlobalConfig()).toThrowError('init')
  })

  test('should get globalConfig', () => {
    // @ts-expect-error
    setGlobalConfig({ config: { publicDir: 'public' }, inputDir: 'publicTypescript' })
    expect(() => getGlobalConfig()).not.toThrowError()
  })

  test('should extract hash', () => {
    const hash1 = extractHashFromFileName('dir/hello.1234.js', 4)
    const hash2 = extractHashFromFileName('hello.1234', 4)
    expect(hash1).toBe('1234')
    expect(hash2).toBe('1234')
  })
})
