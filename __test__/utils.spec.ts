import path from 'node:path'
import { beforeAll, describe, expect, test } from 'vitest'
import { crlf, eq, isPublicTypescript } from '../src/utils'
import { getContentHash } from '../src/utils/build'
import { getGlobalConfig, setGlobalConfig } from '../src/utils/globalConfig'

beforeAll(() => {})

describe('vite-plugin-public-typescript', () => {
  test('should hash stable', () => {
    const code = `export const t = { hello: 'world' }`
    const a = getContentHash(code)
    const b = getContentHash(code)

    expect(a).toBe(b)
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

  test('should crlf', () => {
    const json = JSON.stringify({ a: 'b' }, null, 2)
    const crlfJson = crlf(json)
    expect(json).not.eq(crlfJson)
    expect(crlfJson).toEqual(`{\r\n  "a": "b"\r\n}`)
  })

  test('should obj eq', () => {
    expect(eq({}, {})).toBe(true)
    expect(eq({ a: 1 }, { a: 1 })).toBe(true)
  })

  test('should obj not eq', () => {
    expect(eq([], {})).toBe(false)
    expect(eq({ a: 1 }, { a: 2 })).toBe(false)
  })

  test('should getGlobalConfig throw error', () => {
    expect(() => getGlobalConfig()).toThrowError('init')
  })

  test('should get globalConfig', () => {
    // @ts-expect-error
    setGlobalConfig({ config: { publicDir: 'public' }, inputDir: 'publicTypescript' })
    expect(() => getGlobalConfig()).not.toThrowError()
  })
})
