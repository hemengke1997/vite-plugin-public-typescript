import { listFiles, readFile } from '~utils'
import path from 'node:path'
import { beforeAll, describe, expect, test } from 'vitest'

const manifestPath = 'node_modules/.vite-plugin-public-typescript/manifest.json'

describe('file-mode', () => {
  let jsFiles: string[]
  let manifest: string

  beforeAll(() => {
    try {
      manifest = readFile(manifestPath)
      jsFiles = listFiles('public/out')
    } catch {}
  })
  test('should output js file to publicDir', () => {
    expect(jsFiles).toHaveLength(3)

    const values = Object.values(JSON.parse(manifest)).map((v: string) => path.basename(v))

    expect(jsFiles).toEqual(values)
  })
})
