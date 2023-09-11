import path from 'path'
import type { PluginOption, ResolvedConfig } from 'vite'
import { normalizePath } from 'vite'
import glob from 'tiny-glob'
import type { BuildOptions } from 'esbuild'
import Watcher from 'watcher'
import fs from 'fs-extra'
import createDebug from 'debug'
import { TS_EXT, _isPublicTypescript, eq, isEmptyObject, reloadPage, validateOptions } from './helper/utils'
import { build, esbuildTypescript } from './helper/build'
import { assert } from './helper/assert'
import { globalConfigBuilder } from './helper/GlobalConfigBuilder'
import { initCacheProcessor } from './helper/processor'
import { ManifestCache } from './helper/ManifestCache'

const debug = createDebug('index ===> ')

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
   * @note outputDir should start with '/'
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

  /**
   * @description build output type
   * @default 'file'
   */
  buildDestination?: 'file' | 'memory'
}

export const DEFAULT_OPTIONS: Required<VPPTPluginOptions> = {
  inputDir: 'publicTypescript',
  outputDir: '/',
  manifestName: 'manifest',
  hash: true,
  ssrBuild: false,
  esbuildOptions: {},
  sideEffects: false,
  buildDestination: 'file',
}

let previousOpts: VPPTPluginOptions

export function publicTypescript(options: VPPTPluginOptions = {}) {
  const opts = {
    ...DEFAULT_OPTIONS,
    ...options,
  }

  validateOptions(opts)

  const cache = new ManifestCache({ watchMode: true })

  debug('options:', opts)

  let config: ResolvedConfig

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

        const cacheProcessor = initCacheProcessor(opts.buildDestination)

        globalConfigBuilder.init({
          cache,
          filesGlob,
          config,
          cacheProcessor,
          ...opts,
        })

        cache.setManifestPath(normalizePath(`${globalConfigBuilder.get().absInputDir}/${opts.manifestName}.json`))

        debug('cache manifestPath:', cache.getManifestPath())

        assert(cache.getManifestPath().includes('.json'))
      },
      configureServer(server) {
        const { ws } = server

        if (process.env.VITEST || process.env.CI) {
          return
        }

        try {
          const watcher = new Watcher(globalConfigBuilder.get().absInputDir, {
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
              await globalConfigBuilder.get().cacheProcessor.deleteOldJs({ fileName })
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

          watcher.on('unlink', handleUnlink)

          watcher.on('add', handleFileAdded)

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

        const parsedCacheJson = cache.readManifestFromFile()

        debug('buildStart - parsedCacheJson:', parsedCacheJson)

        if (isEmptyObject(parsedCacheJson)) {
          // write empty json object to manifest.json
          await cache.writeManifestJSON()
        }

        const { filesGlob } = globalConfigBuilder.get()

        const fileNames = filesGlob.map((file) => path.parse(file).name)

        debug('buildStart - filesGlob:', filesGlob)
        debug('buildStart - fileNames:', fileNames)

        if (!isEmptyObject(parsedCacheJson)) {
          const keys = Object.keys(parsedCacheJson)
          keys.forEach((key) => {
            if (fileNames.includes(key)) {
              cache.setCache({ [key]: parsedCacheJson[key] }, { disableWatch: true })
            } else {
              cache.setCache({ [key]: parsedCacheJson[key] })
              globalConfigBuilder.get().cacheProcessor.deleteOldJs({ fileName: key, force: true })
            }
          })
        }

        debug('buildStart - cache:', cache.getAll())

        filesGlob.forEach((f) => {
          build({ filePath: f })
        })
      },
      async handleHotUpdate(ctx) {
        if (_isPublicTypescript(ctx.file)) {
          debug('hmr:', ctx.file)
          await build({ filePath: ctx.file })
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
