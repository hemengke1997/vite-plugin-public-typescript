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
  _isPublicTypescript,
  addCodeHeader,
  disableManifestHmr,
  eq,
  findAllOldJsFile,
  getInputDir,
  isEmptyObject,
  normalizeAssetsDirPath,
  reloadPage,
  removeBase,
  removeOldJsFiles,
  validateOptions,
} from './helper/utils'
import { build, buildAll, esbuildTypescript } from './helper/build'
import { assert } from './helper/assert'
import { globalConfigBuilder } from './helper/GlobalConfigBuilder'
import { initCacheProcessor } from './helper/processor'
import { ManifestCache } from './helper/ManifestCache'
import { getScriptInfo, nodeIsElement, traverseHtml } from './helper/html'

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
  esbuildOptions: {},
  sideEffects: false,
  destination: 'memory',
}

let previousOpts: VPPTPluginOptions

type CacheItemType = {
  path: string
  _code?: string
  _hash?: string
  _pathToDisk?: string
}

const cache = new ManifestCache<CacheItemType>()

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

        const tsFilesGlob = await glob(getInputDir(resolvedRoot, opts.inputDir, `/*.ts`), {
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

        cache.beforeChange = (value) => {
          if (value?.path) {
            value._pathToDisk = removeBase(value.path, viteConfig.base)
          }
        }

        disableManifestHmr(c, cache.getManifestPath())

        debug('cache manifestPath:', cache.getManifestPath())

        debug('cache:', cache.get())

        assert(cache.getManifestPath().includes('.json'))
      },

      configureServer(server) {
        if (process.env.VITEST || process.env.CI) {
          return
        }

        const { ws } = server

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
              reloadPage(ws)
            }
          }

          async function handleFileAdded(filePath: string) {
            if (_isPublicTypescript(filePath)) {
              debug('file added:', filePath)
              await build({ filePath }, (args) => globalConfigBuilder.get().cacheProcessor.onTsBuildEnd(args))
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
        // skip server restart when options not changed
        if (eq(previousOpts, opts)) {
          return
        }

        previousOpts = opts

        const manifestPath = cache.getManifestPath()

        fs.ensureFileSync(manifestPath)

        const parsedCacheJson = cache.readManifestFile()

        debug('buildStart - parsedCacheJson:', parsedCacheJson)

        if (isEmptyObject(parsedCacheJson)) {
          // write empty json object to manifest.json
          cache.writeManifestJSON()
        }

        const { tsFilesGlob } = globalConfigBuilder.get()

        const tsFileNames = tsFilesGlob.map((file) => path.parse(file).name)

        debug('buildStart - tsFilesGlob:', tsFilesGlob)
        debug('buildStart - tsFileNames:', tsFileNames)

        if (opts.destination === 'memory') {
          const oldFiles = await findAllOldJsFile({
            outputDir: opts.outputDir,
            publicDir: viteConfig.publicDir,
            tsFileNames,
          })
          removeOldJsFiles(oldFiles)
        }

        await buildAll(tsFilesGlob)
      },
      generateBundle() {
        if (opts.destination === 'memory') {
          const c = cache.get()
          Object.keys(c).forEach((key) => {
            this.emitFile({
              type: 'asset',
              fileName: normalizeAssetsDirPath(`${c[key]._pathToDisk}`),
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

              if (vppt?.name && src?.value) {
                const c = cache.get()
                let cacheItem = cache.findCacheItemByPath(src.value)

                if (!cacheItem) {
                  const fileName = path.basename(src.value).split('.')[0]
                  cacheItem = c[fileName]
                }

                if (cacheItem) {
                  const attrs = node.attrs
                    .reduce((acc, attr) => {
                      if (attr.name === src.name) {
                        acc += ` ${attr.name}="${cacheItem!.path}"`
                        return acc
                      }
                      acc += attr.value ? ` ${attr.name}="${attr.value}"` : ` ${attr.name}`
                      return acc
                    }, '')
                    .trim()

                  s.update(
                    node.sourceCodeLocation!.startOffset,
                    node.sourceCodeLocation!.endOffset,
                    `<script ${attrs}></script>`,
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
        const { file, server } = ctx

        if (_isPublicTypescript(file)) {
          debug('hmr:', file)

          await build({ filePath: file }, (args) => globalConfigBuilder.get().cacheProcessor.onTsBuildEnd(args))

          reloadPage(server.ws)

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
            if (req?.url?.startsWith('/') && req?.url?.endsWith('.js')) {
              const cacheItem = cache.findCacheItemByPath(req.url)
              if (cacheItem) {
                return send(req, res, addCodeHeader(cacheItem._code || ''), 'js', {
                  cacheControl: 'max-age=31536000,immutable',
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

export { injectTagsToHtml } from './helper/html'
export * from './plugins/inject-script'
export { publicTypescript, esbuildTypescript }
