import { listFiles, readFile } from '~utils'
import fs from 'fs-extra'
import path from 'node:path'
import glob from 'tiny-glob'
import { beforeAll, describe, expect, test } from 'vitest'

const manifestPath = 'node_modules/.vite-plugin-public-typescript/manifest.json'

const out = path.resolve(__dirname, '../public/out')

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
    expect(jsFiles).toHaveLength(fs.readdirSync(out).length)

    const values = Object.values(JSON.parse(manifest)).map((v: string) => path.basename(v))

    expect(jsFiles).toEqual(values)
  })

  test('should babel transform', async () => {
    const babel = (await glob(`${out}/babel.?(*.)js`, { absolute: true }))[0]

    expect(fs.readFileSync(babel, 'utf8')).toContain('@babel/helpers - typeof')
  })
})
