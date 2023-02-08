import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import mock from 'mock-fs'
import fs from 'fs-extra'
import type { ResolvedConfig } from 'vite'
import { createServer } from 'vite'
import { ManifestCache } from '../src/utils/manifestCache'
import { eq, isEmptyObject } from '../src/utils'
import { publicTypescript } from '../src'

declare module 'vitest' {
  export interface TestContext {
    cache: ManifestCache
    vite: ResolvedConfig
  }
}

const manifestPath = 'manifest.json'

vi.mock('fs-extra', async () => {
  const actual: any = await vi.importActual('fs-extra')
  return {
    readFileSync: vi.fn(),
    ...actual,
  }
})

function initCache() {
  const cache = new ManifestCache()
  cache.setCache({ key: 'name', value: 'value' })
  cache.setCache({ key: 'typescript', value: 'powerful' })
  return cache
}

async function createDevServer() {
  const server = await createServer({
    define: { hahahaha: JSON.stringify('this is haha') },
    plugins: [publicTypescript()],
  })
  return server.config
}

// beforeAll(() => {
//   vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
//     return '{ "a": "/a.chunk.js" }'
//   })
// })

beforeEach((ctx) => {
  ctx.cache = initCache()
  mock({
    'manifest.json': '{}',
  })
})

beforeEach(async (ctx) => {
  ctx.vite = await createDevServer()
})

afterEach(() => {
  mock.restore()
})

describe('manifestCache', () => {
  test('should set cache and get cache right', ({ cache }) => {
    expect(cache.getCache('name')).toBe('value')
  })

  test('should remove cache', ({ cache }) => {
    cache.removeCache('name')

    expect(cache.getCache('name')).toBeFalsy()
  })

  test('should get all', ({ cache }) => {
    const v = cache.getAll()
    expect(Object.keys(v).length === 2).toBe(true)
  })

  test('should set manifestPath', ({ cache }) => {
    cache.setManifestPath(manifestPath)
    expect(cache.getManifestPath()).toBe(manifestPath)
  })

  test('should write manifest', async ({ cache }) => {
    cache.setManifestPath(manifestPath)

    {
      const content = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
      expect(isEmptyObject(content)).toBe(true)
    }

    await cache.writeManifestJSON()

    {
      const content = fs.readFileSync(manifestPath, 'utf-8')
      const c = initCache()
      expect(eq(JSON.parse(content), c.getAll())).toBe(true)
    }
  })
})
