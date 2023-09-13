import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import mock from 'mock-fs'
import fs from 'fs-extra'
import type { ResolvedConfig, ViteDevServer } from 'vite'
import { createServer } from 'vite'
import { ManifestCache } from '../src/helper/ManifestCache'
import { eq, isEmptyObject } from '../src/helper/utils'
import { publicTypescript } from '../src'

declare module 'vitest' {
  export interface TestContext {
    cache: ManifestCache
    vite: ResolvedConfig
    viteDevServer: ViteDevServer
  }
}

const manifestPath = 'manifest.json'

vi.mock('fs-extra', async () => {
  const actual: any = await vi.importActual('fs-extra')
  return {
    readFileSync: vi.fn(),
    writeFile: vi.fn(),
    ...actual,
  }
})

function initCache() {
  const cache = new ManifestCache()
  cache.set({
    x: {
      path: 'x.js',
      _code: 'console.log("x")',
    },
    y: {
      path: 'y.js',
      _code: 'console.log("y")',
    },
  })
  return cache
}

async function createDevServer() {
  const server = await createServer({
    define: { hahahaha: JSON.stringify('this is haha') },
    plugins: [publicTypescript()],
    server: {
      middlewareMode: true,
    },
  })
  return server
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
  const server = await createDevServer()
  ctx.vite = server.config
  ctx.viteDevServer = server
})

afterEach((ctx) => {
  mock.restore()
  ctx.viteDevServer.close()
})

describe('manifestCache', () => {
  test('should set cache and get cache right', ({ cache }) => {
    expect(cache.getByKey('x')).toStrictEqual({ path: 'x.js', _code: 'console.log("x")' })
  })

  test('should remove cache', ({ cache }) => {
    cache.remove('x')

    expect(cache.getByKey('x')).toBeFalsy()
  })

  test('should get all', ({ cache }) => {
    const v = cache.get()
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
      expect(eq(JSON.parse(content), c.extractPath(c.get()))).toBe(true)
    }
  })
})
