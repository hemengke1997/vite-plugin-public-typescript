import path from 'node:path'
import type { PluginOption, ResolvedConfig } from 'vite'
import { normalizePath } from 'vite'
import fg from 'fast-glob'
import type { BuildOptions } from 'esbuild'
import Watcher from 'watcher'
import fs from 'fs-extra'
import { eq, isEmptyObject, isPublicTypescript, reloadPage, ts } from './utils'
import { build, deleteOldJsFile, esbuildTypescript } from './utils/build'
import { ManifestCache } from './utils/manifestCache'
import { getGlobalConfig, setGlobalConfig } from './utils/globalConfig'
import { assert } from './utils/assert'

export interface VPPTPluginOptions {
  /**
   * @description vite ssrBuild
   * @see https://vitejs.dev/config/#conditional-config
   * @default false
   */
  ssrBuild?: boolean | undefined
  /**
   * @description input public typescript dir
   * @default 'publicTypescript'
   */
  inputDir?: string
  /**
   * @description output public javascript dir, relative to `publicDir`
   * @default '/'
   */
  outputDir?: string
  /**
   * @description esbuild BuildOptions
   * @see https://esbuild.github.io/api/#build-api
   * @default {}
   */
  esbuildOptions?: BuildOptions | undefined
  /**
   * @description manifest fileName
   * @default 'manifest'
   */
  manifestName?: string
  /**
   * @description
   * whether generate js with hash,
   * if number, set hash length
   * @type boolean | number
   * @default true
   */
  hash?: boolean | number
  /**
   * @description treat `input` as sideEffect or not
   * @see https://esbuild.github.io/api/#tree-shaking-and-side-effects
   * @default false
   */
  sideEffects?: boolean
}

export const defaultOptions: Required<VPPTPluginOptions> = {
  inputDir: 'publicTypescript',
  outputDir: '/',
  manifestName: 'manifest',
  hash: true,
  ssrBuild: false,
  esbuildOptions: {},
  sideEffects: false,
}

const cache = new ManifestCache({ watchMode: true })

let previousOpts: VPPTPluginOptions

export function publicTypescript(options: VPPTPluginOptions = {}) {
  const opts = {
    ...defaultOptions,
    ...options,
  }

  let config: ResolvedConfig

  function _isPublicTypescript(filePath: string) {
    const globalConfig = getGlobalConfig()
    assert(!!globalConfig)
    return isPublicTypescript({ filePath, inputDir: globalConfig.inputDir, root: globalConfig.config.root })
  }

  const plugins: PluginOption = [
    {
      name: 'vite:public-typescript',
      configResolved(c) {
        config = c

        function getInputDir(suffix = '') {
          return normalizePath(path.resolve(config.root, `${opts.inputDir}${suffix}`))
        }

        fs.ensureDirSync(getInputDir())

        const filesGlob = fg.sync(getInputDir(`/*${ts}`), {
          cwd: config.root,
          absolute: true,
        })

        setGlobalConfig({
          cache,
          filesGlob,
          config,
          ...opts,
        })

        cache.setManifestPath(normalizePath(`${getGlobalConfig().absInputDir}/${opts.manifestName}.json`))

        assert(cache.getManifestPath().includes('.json'))
      },
      configureServer(server) {
        const { ws } = server

        if (process.env.VITEST) {
          return
        }

        try {
          const watcher = new Watcher(getGlobalConfig().absInputDir, {
            ignoreInitial: true,
            recursive: true,
            renameDetection: true,
            debounce: 0,
            renameTimeout: 0,
          })

          async function handleUnlink(filePath: string) {
            if (_isPublicTypescript(filePath)) {
              const fileName = path.parse(filePath).name
              await deleteOldJsFile({ fileName })
              reloadPage(ws)
            }
          }

          async function handleFileAdded(filePath: string) {
            if (_isPublicTypescript(filePath)) {
              await build({ filePath })
              reloadPage(ws)
            }
          }

          async function handleFileRenamed(filePath: string, filePathNext: string) {
            await handleUnlink(filePath)
            await handleFileAdded(filePathNext)
          }

          watcher.on('unlink', async (f) => {
            handleUnlink(f)
          })

          watcher.on('add', async (f) => {
            await handleFileAdded(f)
          })

          watcher.on('rename', async (f, fNext) => {
            await handleFileRenamed(f, fNext)
          })
        } catch (e) {
          console.error(e)
        }
      },
      async buildStart() {
        if (opts.ssrBuild || config.build.ssr) {
          return
        }

        if (eq(previousOpts, opts)) {
          return
        }

        previousOpts = opts

        const manifestPath = cache.getManifestPath()

        fs.ensureFileSync(manifestPath)

        const parsedCacheJson = cache.readCacheFromFile()

        if (isEmptyObject(parsedCacheJson)) {
          await cache.writeManifestJSON()
        }

        const { filesGlob } = getGlobalConfig()

        const fileNames = filesGlob.map((file) => path.parse(file).name)

        if (!isEmptyObject(parsedCacheJson)) {
          const keys = Object.keys(parsedCacheJson)
          keys.forEach((key) => {
            if (fileNames.includes(key)) {
              cache.setCache(
                {
                  key,
                  value: parsedCacheJson[key],
                },
                { disableWatch: true },
              )
            } else {
              cache.setCache({
                key,
                value: parsedCacheJson[key],
              })
              deleteOldJsFile({ fileName: key, force: true })
            }
          })
        }

        filesGlob.forEach(async (f) => {
          await build({
            filePath: f,
          })
        })
      },
      async handleHotUpdate(ctx) {
        if (_isPublicTypescript(ctx.file)) {
          await build({
            filePath: ctx.file,
          })
          reloadPage(ctx.server.ws)
          return []
        }
      },
    },
  ]

  // Return as `any` to avoid Plugin type mismatches when there are multiple Vite versions installed
  return plugins as any
}

export { esbuildTypescript }
