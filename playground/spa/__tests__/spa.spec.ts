import path from 'node:path'
import { beforeAll, describe, expect, test } from 'vitest'
import { browserLogs, editFileAndWaitForHmrComplete, isBuild, isServe, listFiles, readFile } from '~utils'

describe('console', async () => {
  test('should not 404', () => {
    browserLogs.forEach((msg) => {
      expect(msg).not.toMatch('404')
    })
  })

  function expectBrowserLogsToContain(str: string) {
    expect(browserLogs).toEqual(expect.arrayContaining([expect.stringContaining(str)]))
  }

  test('should console `custom define!`', async () => {
    expectBrowserLogsToContain('custom define!')
  })

  test.runIf(isServe)('should console vite env - serve', () => {
    expectBrowserLogsToContain('development')
  })

  test.runIf(isBuild)('should console vite env - build', () => {
    expectBrowserLogsToContain('production')
  })

  test('should console constant string', () => {
    expectBrowserLogsToContain('test')
  })
})

describe('hmr', () => {
  test.runIf(isServe)('should hmr', async () => {
    const u = 'hmr-updated'
    await editFileAndWaitForHmrComplete(
      'public-typescript/hmr.ts',
      (content) => content.replace('hmr', u),
      (text) => {
        if (text === u) {
          return true
        }
      },
    )
  })
})

describe('manifest', () => {
  let manifest: string
  beforeAll(() => {
    try {
      manifest = readFile('public-typescript/manifest.json')
    } catch {}
  })

  test('should generate manifest', () => {
    expect(JSON.parse(manifest)).toEqual({
      haha: expect.any(String),
      hmr: expect.any(String),
      index: expect.any(String),
      test: expect.any(String),
    })
  })

  // vitest prints a warning about obsolete snapshots during build tests, ignore it, they are used in dev tests.
  // always regenerate snapshots with `pnpm test:serve -u` and check the diffs if they are correct
  test.runIf(isServe)('should manifest stable on server', () => {
    expect(manifest).toMatchInlineSnapshot(`
      "{
        \\"haha\\": \\"/vite-plugin-public-typescript/out/haha.5ff2aef3.js\\",
        \\"hmr\\": \\"/vite-plugin-public-typescript/out/hmr.c45897e4.js\\",
        \\"index\\": \\"/vite-plugin-public-typescript/out/index.b43643d0.js\\",
        \\"test\\": \\"/vite-plugin-public-typescript/out/test.09b479d0.js\\"
      }
      "
    `)
  })
})

describe.skipIf(isServe)('build', () => {
  let jsFiles: string[]
  let manifest: string
  beforeAll(() => {
    try {
      manifest = readFile('public-typescript/manifest.json')
      jsFiles = listFiles('dist/out')
    } catch {}
  })

  test('should generate js assetes after build', () => {
    expect(jsFiles).toHaveLength(4)

    const values = Object.values(JSON.parse(manifest)).map((v: string) => path.basename(v))
    expect(jsFiles).toEqual(values)
  })

  test('should manifest stable on build', () => {
    expect(manifest).toMatchInlineSnapshot(`
      "{
        \\"haha\\": \\"/vite-plugin-public-typescript/out/haha.5ff2aef3.js\\",
        \\"hmr\\": \\"/vite-plugin-public-typescript/out/hmr.846035fe.js\\",
        \\"index\\": \\"/vite-plugin-public-typescript/out/index.3aef6e36.js\\",
        \\"test\\": \\"/vite-plugin-public-typescript/out/test.09b479d0.js\\"
      }
      "
    `)
  })
})
