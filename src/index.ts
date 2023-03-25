import path from 'path'
import type { PluginOption, ResolvedConfig } from 'vite'
import { normalizePath } from 'vite'
import glob from 'tiny-glob'
import type { BuildOptions } from 'esbuild'
import Watcher from 'watcher'
import fs from 'fs-extra'
import { TS_EXT, debug, eq, isEmptyObject, isPublicTypescript, reloadPage } from './utils'
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

  debug('options:', opts)

  let config: ResolvedConfig

  function _isPublicTypescript(filePath: string) {
    const globalConfig = getGlobalConfig()
    assert(!!globalConfig)
    return isPublicTypescript({ filePath, inputDir: globalConfig.inputDir, root: globalConfig.config.root })
  }

  const plugins: PluginOption = [
    {
      name: 'vite:public-typescript',
      async configResolved(c) {
        config = c

        function getInputDir(suffix = '') {
          return normalizePath(path.resolve(config.root, `${opts.inputDir}${suffix}`))
        }

        fs.ensureDirSync(getInputDir())

        const filesGlob = await glob(getInputDir(`/*${TS_EXT}`), {
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

        debug('cache manifestPath:', cache.getManifestPath())

        assert(cache.getManifestPath().includes('.json'))
      },
      configureServer(server) {
        const { ws } = server

        if (process.env.VITEST || process.env.CI) {
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
              debug('unlink:', fileName)
              await deleteOldJsFile({ fileName })
              reloadPage(ws)
            }
          }

          async function handleFileAdded(filePath: string) {
            if (_isPublicTypescript(filePath)) {
              debug('file added:', filePath)
              await build({ filePath })
              reloadPage(ws)
            }
          }

          async function handleFileRenamed(filePath: string, filePathNext: string) {
            if (_isPublicTypescript(filePath)) {
              debug('file renamed:', filePath, '==>', filePathNext)
              await handleUnlink(filePath)
              await handleFileAdded(filePathNext)
            }
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

        debug('buildStart - parsedCacheJson:', parsedCacheJson)

        if (isEmptyObject(parsedCacheJson)) {
          await cache.writeManifestJSON()
        }

        const { filesGlob } = getGlobalConfig()

        const fileNames = filesGlob.map((file) => path.parse(file).name)

        debug('buildStart - filesGlob:', filesGlob)
        debug('buildStart - fileNames:', fileNames)

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

        debug('buildStart - cache:', cache.getAll())

        filesGlob.forEach((f) => {
          build({
            filePath: f,
          })
        })
      },
      async handleHotUpdate(ctx) {
        if (_isPublicTypescript(ctx.file)) {
          debug('hmr:', ctx.file)
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
