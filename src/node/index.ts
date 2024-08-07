import type Watcher from 'watcher'
import createDebug from 'debug'
import fs from 'fs-extra'
import path from 'node:path'
import { type ConfigEnv, type PluginOption, type ResolvedConfig, type ViteDevServer } from 'vite'
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
import { resolvedVirtualModuleId } from './helper/virtual'
import { type VitePublicTypescriptOptions } from './interface'
import { getManifestInNode, manifestCache } from './manifest-cache'
import { pluginServer } from './plugins/server'
import { pluginVirtual } from './plugins/virtual'

const debug = createDebug('vite-plugin-public-typescript:index ===> ')

let wathcer: Watcher | undefined

export default function publicTypescript(options: VitePublicTypescriptOptions = {}) {
  debug('user options:', options)

  let viteConfig: ResolvedConfig
  let viteConfigEnv: ConfigEnv

  let server: ViteDevServer

  let opts = {
    ...options,
  } as OptionsTypeWithDefault

  const plugins: PluginOption[] = [
    {
      name: 'vite:public-typescript',
      enforce: 'post',
      config(_, _viteConfigEnv) {
        viteConfigEnv = _viteConfigEnv
      },
      async configResolved(_viteConfig) {
        viteConfig = _viteConfig

        opts = resolveOptions(viteConfig, opts)

        debug('resolved options:', opts)

        await setupGlobalConfig(viteConfig, opts)
        await setupManifestCache(viteConfig, opts)
      },
      async configureServer(_server) {
        if (viteConfigEnv.command === 'build') return
        server = _server
        const { ws } = server
        globalConfig.set('viteDevServer', server)
        if (wathcer) {
          wathcer.close()
        }
        wathcer = await initWatcher((file) => reloadPage(ws, file))
        server.httpServer?.addListener('close', () => {
          wathcer?.close()
        })
      },
      async buildStart() {
        if (viteConfig.build.ssr) return

        const manifestPath = manifestCache.manifestPath

        fs.ensureFileSync(manifestPath)

        const parsedCacheJson = getManifestInNode()

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
      closeBundle() {
        server?.httpServer?.close()
      },
      async handleHotUpdate(ctx) {
        const { file } = ctx
        const { moduleGraph } = server
        const module = moduleGraph.getModuleById(resolvedVirtualModuleId)
        // virtual module hmr
        if (module) {
          moduleGraph.invalidateModule(module)
        }
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

export { getManifestInNode } from './manifest-cache'
export {
  type ManifestScriptsFn,
  type ScriptDescriptor,
  injectScripts,
  injectScriptsToHtml,
} from './plugins/inject-script'
export { publicTypescript }
export { type VitePublicTypescriptOptions }
