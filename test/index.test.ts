import { describe, expect, it } from 'vitest'
import { getContentHash, isPublicTypescript } from '../src/utils'

describe('vite-plugin-public-typescript', () => {
  it('should hash stable', () => {
    const code = `export const t = { hello: 'world' }`
    const a = getContentHash(code)
    const b = getContentHash(code)

    expect(a).toBe(b)
  })

  it('should be public typescript file', () => {
    const root = process.cwd()
    const inputDir = 'publicTypescript'
    const r = isPublicTypescript({
      filePath: `${root}/${inputDir}/test.ts`,
      root,
      inputDir,
    })

    expect(r).toBe(true)
  })
})
