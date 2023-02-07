import { describe, expect, it } from 'vitest'
import { getContentHash } from '../src/utils'

describe('vite-plugin-public-typescript', () => {
  it('should hash stable', () => {
    const code = `export const t = { hello: 'world' }`
    const a = getContentHash(code)
    const b = getContentHash(code)

    expect(a).toBe(b)
  })

  // it('should be public typescript file', () => {
  //   const root = process.cwd()
  //   const inputDir = 'publicTypescript'

  //   const r = isPublicTypescript(`${root}/${inputDir}/test.ts`)

  //   expect(r).toBe(true)
  // })
})
