import path from 'path'
import type { PluginOption, ResolvedConfig } from 'vite'
import { normalizePath, send } from 'vite'
import glob from 'tiny-glob'
import type { BuildOptions } from 'esbuild'
import Watcher from 'watcher'
import fs from 'fs-extra'
import createDebug from 'debug'
import MagicString from 'magic-string'
import {
  TS_EXT,
  _isPublicTypescript,
  addCodeHeader,
  eq,
  getInputDir,
  isEmptyObject,
  normalizeDirPath,
  validateOptions,
} from './helper/utils'
import { build, buildAll, esbuildTypescript } from './helper/build'
import { assert } from './helper/assert'
import { globalConfigBuilder } from './helper/GlobalConfigBuilder'
import { initCacheProcessor } from './helper/processor'
import { ManifestCache } from './helper/ManifestCache'
import { getScriptInfo, nodeIsElement, traverseHtml } from './helper/html'
import { injectScripts } from './plugins/inject-script'

const debug = createDebug('vite-plugin-public-typescript:index ===> ')

export interface VPPTPluginOptions {
  /**
   * @description input public typescript dir
   * @default 'public-typescript'
   */
  inputDir?: string
  /**
   * @description output public javascript dir after build
   * @note relative with vite.config.ts `publicDir`
   * @example
   * ```ts
   * // vite.config.ts
   * export default defineConfig({
   *  publicDir: 'some-public-dir', // outputDir will be '/some-public-dir'
   * })
   * ```
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
   * @description vite ssrBuild
   * @see https://vitejs.dev/config/#conditional-config
   * @default false
   */
  ssrBuild?: boolean | undefined
  /**
   * @description build-out destination
   * @default 'memory'
   */
  destination?: 'memory' | 'file'
}

export const DEFAULT_OPTIONS: Required<VPPTPluginOptions> = {
  inputDir: 'public-typescript',
  outputDir: '/',
  manifestName: 'manifest',
  hash: true,
  ssrBuild: false,
  esbuildOptions: {},
  sideEffects: false,
  destination: 'memory',
}

let previousOpts: VPPTPluginOptions

const cache = new ManifestCache()

export default function publicTypescript(options: VPPTPluginOptions = {}) {
  const opts = {
    ...DEFAULT_OPTIONS,
    ...options,
  }

  validateOptions(opts)

  debug('options:', opts)

  let viteConfig: ResolvedConfig

  const plugins: PluginOption = [
    {
      name: 'vite:public-typescript',
      enforce: 'post',
      async configResolved(c) {
        viteConfig = c

        const resolvedRoot = normalizePath(viteConfig.root ? path.resolve(viteConfig.root) : process.cwd())

        fs.ensureDirSync(getInputDir(resolvedRoot, opts.inputDir))

        const tsFilesGlob = await glob(getInputDir(resolvedRoot, opts.inputDir, `/*${TS_EXT}`), {
          cwd: resolvedRoot,
          absolute: true,
        })

        const cacheProcessor = initCacheProcessor(opts, cache)

        globalConfigBuilder.init({
          cache,
          tsFilesGlob,
          viteConfig,
          cacheProcessor,
          ...opts,
        })

        cache.setManifestPath(normalizePath(`${globalConfigBuilder.get().absInputDir}/${opts.manifestName}.json`))

        cache.initCacheFromFile()

        debug('cache manifestPath:', cache.getManifestPath())

        debug('cache:', cache.get())

        assert(cache.getManifestPath().includes('.json'))
      },
      configureServer() {
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
              await globalConfigBuilder.get().cacheProcessor.deleteOldJs({ tsFileName: fileName })
              // TODO: fix hmr
              // reloadPage(ws)
              // server.restart()
            }
          }

          async function handleFileAdded(filePath: string) {
            if (_isPublicTypescript(filePath)) {
              debug('file added:', filePath)
              await build({ filePath }, (args) => globalConfigBuilder.get().cacheProcessor.onTsBuildEnd(args))
              // TODO: fix hmr
              // reloadPage(ws)
              // server.restart()
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
        if (opts.ssrBuild || viteConfig.build.ssr) {
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
          cache.writeManifestJSON()
        }

        const { tsFilesGlob } = globalConfigBuilder.get()

        const fileNames = tsFilesGlob.map((file) => path.parse(file).name)

        debug('buildStart - tsFilesGlob:', tsFilesGlob)
        debug('buildStart - fileNames:', fileNames)

        if (opts.destination === 'memory') {
          // delete output dir
          const dir = path.join(viteConfig.publicDir, opts.outputDir)
          if (fs.existsSync(dir)) {
            fs.removeSync(dir)
          }
        }

        await buildAll(tsFilesGlob)
      },
      generateBundle() {
        if (opts.ssrBuild || viteConfig.build.ssr) {
          return
        }

        if (opts.destination === 'memory') {
          const c = cache.get()
          Object.keys(c).forEach((key) => {
            this.emitFile({
              type: 'asset',
              fileName: normalizeDirPath(`${c[key].path}`),
              source: c[key]._code,
            })
          })
        }
      },
      transformIndexHtml: {
        order: 'post',
        async handler(html, { filename }) {
          const s = new MagicString(html)

          await traverseHtml(html, filename, (node) => {
            if (!nodeIsElement(node)) {
              return
            }
            // script tags
            if (node.nodeName === 'script') {
              const { src, vppt } = getScriptInfo(node)

              if (vppt?.value && src?.value) {
                const c = cache.get()
                let cacheItem = cache.findCacheItemByPath(src.value)

                if (!cacheItem) {
                  const fileName = path.basename(src.value).split('.')[0]
                  cacheItem = c[fileName]
                }
                if (cacheItem) {
                  s.update(
                    node.sourceCodeLocation!.startOffset,
                    node.sourceCodeLocation!.endOffset,
                    `<script src="${cacheItem?.path}"></script>`,
                  )
                } else {
                  s.remove(node.sourceCodeLocation!.startOffset, node.sourceCodeLocation!.endOffset)
                }
              }
            }
          })
          return s.toString()
        },
      },
      async handleHotUpdate(ctx) {
        const { file } = ctx

        if (_isPublicTypescript(file)) {
          debug('hmr:', file)
          await build({ filePath: file }, (args) => globalConfigBuilder.get().cacheProcessor.onTsBuildEnd(args))
          // TODO: fix hmr
          // ctx.server.restart()
          return []
        }
      },
    },
    {
      name: 'vite:public-typescript:server',
      apply: 'serve',
      enforce: 'post',
      load(id) {
        const cacheItem = cache.findCacheItemByPath(id)
        if (cacheItem) {
          return {
            code: '',
            map: null,
          }
        }
      },
      async configureServer(server) {
        server.middlewares.use((req, res, next) => {
          try {
            if (req?.url?.endsWith('.js') && req.url.startsWith('/')) {
              const cacheItem = cache.findCacheItemByPath(req.url)
              if (cacheItem) {
                return send(req, res, addCodeHeader(cacheItem._code || ''), 'js', {
                  cacheControl: 'no-cache',
                  headers: server.config.server.headers,
                  map: null,
                })
              }
            }
          } catch (e) {
            return next(e)
          }
          next()
        })
      },
    },
  ]

  // Return as `any` to avoid Plugin type mismatches when there are multiple Vite versions installed
  return plugins as any
}

export { publicTypescript, injectScripts, esbuildTypescript }
