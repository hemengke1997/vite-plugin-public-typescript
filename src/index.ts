import path from 'node:path'
import glob from 'tiny-glob'
import fs from 'fs-extra'
import createDebug from 'debug'
import MagicString from 'magic-string'
import { type PluginOption, type ResolvedConfig, normalizePath, send } from 'vite'
import { type BuildOptions } from 'esbuild'
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
import { build, buildAllOnce, esbuildTypescript } from './helper/build'
import { assert } from './helper/assert'
import { getScriptInfo, nodeIsElement, traverseHtml } from './helper/html'
import { initCacheProcessor } from './processor/processor'
import { globalConfig } from './global-config'
import { manifestCache } from './manifest-cache'
import { initWatcher } from './helper/file-watcher'

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
  destination: 'memory',
  esbuildOptions: {},
  hash: true,
  inputDir: 'public-typescript',
  manifestName: 'manifest',
  outputDir: '/',
  sideEffects: false,
}

let previousOpts: VPPTPluginOptions

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

        const originFilesGlob = await glob(getInputDir(resolvedRoot, opts.inputDir, `/*.ts`), {
          absolute: true,
          cwd: resolvedRoot,
        })

        const cacheProcessor = initCacheProcessor(opts, manifestCache)

        globalConfig.init({
          cacheProcessor,
          manifestCache,
          originFilesGlob,
          viteConfig,
          ...opts,
        })

        manifestCache.setManifestPath(normalizePath(`${globalConfig.get().absInputDir}/${opts.manifestName}.json`))

        // no need to set `_pathToDisk` manually anymore
        manifestCache.beforeSet = (value) => {
          if (value?.path) {
            value._pathToDisk = removeBase(value.path, viteConfig.base)
          }
          return value
        }

        disableManifestHmr(c, manifestCache.manifestPath)

        debug('manifestCache manifestPath:', manifestCache.manifestPath)

        assert(manifestCache.manifestPath.includes('.json'))
      },
      configureServer(server) {
        if (process.env.VITEST || process.env.CI) {
          return
        }

        const { ws } = server

        initWatcher(() => reloadPage(ws))
      },
      async buildStart() {
        // skip server restart when options not changed
        if (eq(previousOpts, opts)) {
          return
        }

        previousOpts = opts

        const manifestPath = manifestCache.manifestPath

        fs.ensureFileSync(manifestPath)

        const parsedCacheJson = manifestCache.readManifestFile()

        debug('buildStart - parsedCacheJson:', parsedCacheJson)

        if (isEmptyObject(parsedCacheJson)) {
          // write empty json object to manifest.json
          manifestCache.writeManifestJSON()
        }

        const { originFilesGlob } = globalConfig.get()

        const originFilesName = originFilesGlob.map((file) => path.parse(file).name)

        debug('buildStart - originFilesGlob:', originFilesGlob)
        debug('buildStart - originFilesName:', originFilesName)

        if (opts.destination === 'memory') {
          const oldFiles = await findAllOldJsFile({
            originFilesName,
            outputDir: opts.outputDir,
            publicDir: viteConfig.publicDir,
          })
          removeOldJsFiles(oldFiles)

          // if dir is empty, delete it
          const dir = path.join(viteConfig.publicDir, opts.outputDir)
          if (fs.existsSync(dir) && opts.outputDir !== '/') {
            const files = fs.readdirSync(dir)
            if (files.length === 0) {
              fs.removeSync(dir)
            }
          }
        }

        buildAllOnce(originFilesGlob)
      },
      generateBundle() {
        if (opts.destination === 'memory') {
          const c = manifestCache.get()
          Object.keys(c).forEach((key) => {
            this.emitFile({
              fileName: normalizeAssetsDirPath(`${c[key]._pathToDisk}`),
              source: c[key]._code,
              type: 'asset',
            })
          })
        }
      },
      async handleHotUpdate(ctx) {
        const { file, server } = ctx

        if (_isPublicTypescript(file)) {
          debug('hmr:', file)

          await build({ filePath: file }, (...args) => globalConfig.get().cacheProcessor.onTsBuildEnd(...args))

          reloadPage(server.ws)

          return []
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
                const c = manifestCache.get()
                let cacheItem = manifestCache.findCacheItemByPath(src.value)

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
    },
    {
      name: 'vite:public-typescript:server',
      apply: 'serve',
      enforce: 'post',
      load(id) {
        const cacheItem = manifestCache.findCacheItemByPath(id)
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
              const cacheItem = manifestCache.findCacheItemByPath(req.url)
              if (cacheItem) {
                return send(req, res, addCodeHeader(cacheItem._code || ''), 'js', {
                  cacheControl: 'max-age=31536000,immutable',
                  headers: server.config.server.headers,
                  map: null,
                })
              }
            }
          } catch (error) {
            return next(error)
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
