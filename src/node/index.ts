import createDebug from 'debug'
import { type BuildOptions } from 'esbuild'
import fs from 'fs-extra'
import path from 'node:path'
import { type PluginOption, type ResolvedConfig } from 'vite'
import { buildAllOnce } from './build'
import { type ESBuildPluginBabelOptions } from './build/babel'
import { globalConfig } from './global-config'
import { DEFAULT_OPTIONS } from './helper/default-options'
import { initWatcher } from './helper/file-watcher'
import { reloadPage } from './helper/server'
import {
  _isPublicTypescript,
  findAllOldJsFile,
  isEmptyObject,
  isManifestFile,
  normalizeAssetsDirPath,
  removeOldJsFiles,
  setupGlobalConfig,
  setupManifestCache,
  validateOptions,
} from './helper/utils'
import { getManifest, manifestCache } from './manifest-cache'
import { pluginServer } from './plugins/server'
import { pluginVirtual } from './plugins/virtual'

const debug = createDebug('vite-plugin-public-typescript:index ===> ')

export interface VPPTPluginOptions {
  /**
   * @description input public typescript dir
   * @default 'public-typescript'
   */
  inputDir?: string
  /**
   * @description output public javascript dir after build
   * @note relative with `publicDir`
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
   * @description public dir
   * @default `publicDir` of vite config
   * @version v2.2.0 introduced
   */
  publicDir?: string
  /**
   * @description esbuild BuildOptions
   * @see https://esbuild.github.io/api/#general-options
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
   * @default true
   * @deprecated in v2.0.0. always treat as sideEffect now
   */
  sideEffects?: boolean
  /**
   * @description build-out destination
   * @default 'memory'
   * @note usually set to 'file' in non-vite projects
   * @version v1.5.0 introduced
   */
  destination?: 'memory' | 'file'
  /**
   * @description manifest cache dir
   * @default `node_modules/.vite-plugin-public-typescript`
   * @version v2.0.0 introduced
   */
  cacheDir?: string
  /**
   * @description base path for all files
   * @default `base` of vite config
   * @version v2.0.0 introduced
   */
  base?: string
  /**
   * @description use babel to transform
   * @default false
   * @version v2.1.0 introduced
   */
  babel?: boolean | ESBuildPluginBabelOptions
}

export default function publicTypescript(options: VPPTPluginOptions = {}) {
  const opts = {
    ...DEFAULT_OPTIONS,
    ...options,
  }

  validateOptions(opts)

  debug('options:', opts)

  let viteConfig: ResolvedConfig

  const plugins: PluginOption[] = [
    {
      name: 'vite:public-typescript',
      enforce: 'post',
      async configResolved(c) {
        viteConfig = c

        await setupGlobalConfig(viteConfig, opts)

        await setupManifestCache(viteConfig, opts)
      },
      async configureServer(server) {
        const { ws } = server

        globalConfig.set('viteDevServer', server)

        await initWatcher((file) => reloadPage(ws, file))
      },
      async buildStart() {
        const manifestPath = manifestCache.manifestPath

        fs.ensureFileSync(manifestPath)

        const parsedCacheJson = getManifest()

        debug('buildStart - parsedCacheJson:', parsedCacheJson)

        if (isEmptyObject(parsedCacheJson)) {
          // write empty json object to manifest.json
          manifestCache.writeManifestJSON()
        }

        const originFilesGlob = globalConfig.get('originFilesGlob')

        const originFiles = originFilesGlob.map((file) => path.parse(file).name)

        debug('buildStart - originFilesGlob:', originFilesGlob)
        debug('buildStart - originFiles:', originFiles)

        switch (opts.destination) {
          case 'memory':
            {
              const oldFiles = await findAllOldJsFile({
                originFiles,
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
            break
          case 'file':
            {
              const previousManifestKeys = Object.keys(parsedCacheJson)
              if (previousManifestKeys.length !== originFiles.length) {
                // if manifest.json is not match with originFilesName, delete the difference
                const difference = previousManifestKeys.filter((x) => !originFiles.includes(x))
                const oldFiles = await findAllOldJsFile({
                  originFiles: difference,
                  outputDir: opts.outputDir,
                  publicDir: viteConfig.publicDir,
                })

                removeOldJsFiles(oldFiles)
              }
            }
            break
          default:
            break
        }

        await buildAllOnce(originFilesGlob)
      },
      generateBundle() {
        if (opts.destination === 'memory') {
          const c = manifestCache.all
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
        const { file } = ctx

        if (_isPublicTypescript(file) || isManifestFile(file)) {
          debug('hmr disabled:', file)

          return []
        }
      },
    },
    pluginServer(),
    pluginVirtual(),
  ]

  // Return as `any` to avoid Plugin type mismatches when there are multiple Vite versions installed
  return plugins as any
}

export { getManifest } from './manifest-cache'
export { type ScriptDescriptor, injectScripts, injectScriptsToHtml } from './plugins/inject-script'
export { publicTypescript }
export { DEFAULT_OPTIONS as options }
