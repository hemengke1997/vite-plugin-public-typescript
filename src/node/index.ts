import createDebug from 'debug'
import fs from 'fs-extra'
import path from 'node:path'
import { type PluginOption, type ResolvedConfig } from 'vite'
import { buildAllOnce } from './build'
import { globalConfig } from './global-config'
import { resolveOptions } from './helper/default-options'
import { initWatcher } from './helper/file-watcher'
import { reloadPage } from './helper/server'
import {
  _isPublicTypescript,
  type OptionsTypeWithDefault,
  findAllOldJsFile,
  isEmptyObject,
  isManifestFile,
  normalizeAssetsDirPath,
  removeOldJsFiles,
  setupGlobalConfig,
  setupManifestCache,
} from './helper/utils'
import { type VitePublicTypescriptOptions } from './interface'
import { getManifest, manifestCache } from './manifest-cache'
import { pluginServer } from './plugins/server'
import { pluginVirtual } from './plugins/virtual'

const debug = createDebug('vite-plugin-public-typescript:index ===> ')

export default function publicTypescript(options: VitePublicTypescriptOptions = {}) {
  debug('user options:', options)

  let viteConfig: ResolvedConfig

  let opts = {
    ...options,
  } as OptionsTypeWithDefault

  const plugins: PluginOption[] = [
    {
      name: 'vite:public-typescript',
      enforce: 'post',
      async configResolved(c) {
        viteConfig = c

        opts = resolveOptions(viteConfig, opts)

        debug('resolved options:', opts)

        await setupGlobalConfig(viteConfig, opts)
        await setupManifestCache(viteConfig, opts)
      },
      async configureServer(server) {
        const { ws } = server

        globalConfig.set('viteDevServer', server)

        const wathcer = await initWatcher((file) => reloadPage(ws, file))
        server.httpServer?.addListener('close', () => {
          wathcer?.close()
        })
      },
      async buildStart() {
        if (viteConfig.build.ssr) return

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
              })

              removeOldJsFiles(oldFiles)

              // if dir is empty, delete it
              const dir = opts.outputDir
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
        if (viteConfig.build.ssr) return
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
export { type Scripts, injectScripts, injectScriptsToHtml } from './plugins/inject-script'
export { publicTypescript }
export { type VitePublicTypescriptOptions }
