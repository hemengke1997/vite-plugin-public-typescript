import {
  editFile,
  isBuild,
  isServe,
  listFiles,
  page,
  readFile,
  serverLogs,
  untilBrowserLogAfter,
  untilUpdated,
  viteTestUrl,
  withRetry,
} from '~utils'
import path from 'node:path'
import { beforeAll, describe, expect, test } from 'vitest'

const hmrOriginText = 'hmr original text'

describe('console', async () => {
  test('should console hmr string', async () => {
    await untilBrowserLogAfter(() => page.goto(viteTestUrl), 'hmr')
    await untilUpdated(() => page.textContent('#hmr'), hmrOriginText)
  })
})

describe.skipIf(isBuild)('hmr', () => {
  test('should trigger hmr', async () => {
    const u = 'hmr-updated'
    await untilBrowserLogAfter(() => page.goto(viteTestUrl), 'hmr')
    await untilUpdated(() => page.textContent('#hmr'), hmrOriginText)
    editFile('public-typescript/hmr.ts', (code) => code.replace(hmrOriginText, u))
    await untilUpdated(() => page.textContent('#hmr'), u)
    editFile('public-typescript/hmr.ts', (code) => code.replace(u, hmrOriginText))
    await untilUpdated(() => page.textContent('#hmr'), hmrOriginText)
  })
})

function manifestLike() {
  return expect.objectContaining({
    define: expect.any(String),
    hmr: expect.any(String),
    env: expect.any(String),
  })
}

describe('manifest', () => {
  let manifest: string
  beforeAll(() => {
    try {
      manifest = readFile('public-typescript/manifest.json')
    } catch {}
  })

  test('should generate manifest', () => {
    expect(JSON.parse(manifest)).toEqual(manifestLike())
  })

  // vitest prints a warning about obsolete snapshots during build tests, ignore it, they are used in dev tests.
  // always regenerate snapshots with `pnpm test:serve -u` and check the diffs if they are correct
  test.runIf(isServe)('should manifest stable on server', () => {
    expect(JSON.parse(manifest)).toEqual(manifestLike())
  })

  test.runIf(isServe)('should not trigger vite server restart when manifest file changed', async () => {
    editFile('public-typescript/manifest.json', (content) => content)
    await withRetry(async () => {
      expect(serverLogs).not.toEqual(expect.arrayContaining([expect.stringMatching('server restarted')]))
      expect(serverLogs).not.toEqual(expect.arrayContaining([expect.stringMatching('error')]))
    })
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
    expect(jsFiles).toHaveLength(3)

    const values = Object.values(JSON.parse(manifest)).map((v: string) => path.basename(v))
    expect(jsFiles).toEqual(values)
  })

  test('should manifest stable on build', () => {
    expect(JSON.parse(manifest)).toEqual(manifestLike())
  })
})

describe('custom define env', () => {
  test('should inject custom env', async () => {
    await untilUpdated(() => page.textContent('#custom-define'), 'custom define!')
    await untilUpdated(() => page.textContent('#hello-world'), '{"hello":"world"}')
  })
})

describe('import.meta.env', () => {
  test('should inject import.meta.env', async () => {
    expect(await page.textContent('#env')).toContain('imfromdotenv')
  })
})
