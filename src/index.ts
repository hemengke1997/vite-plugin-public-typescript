import path from 'node:path'
import type { PluginOption, ResolvedConfig } from 'vite'
import { normalizePath } from 'vite'
import fg from 'fast-glob'
import type { BuildOptions } from 'esbuild'
import Watcher from 'watcher'
import fs from 'fs-extra'
import { build, deleteOldJsFile, esbuildTypescript, isEmptyObject, isPublicTypescript, reloadPage, ts } from './utils'
import { ManifestCache } from './utils/manifestCache'
import { getGlobalConfig, setGlobalConfig } from './utils/globalConfig'

export interface VitePluginOptions {
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
   * @description whether generate js with hash
   * @default true
   */
  hash?: boolean
  /**
   * @description treat `input` as sideEffect or not
   * @see https://esbuild.github.io/api/#tree-shaking-and-side-effects
   * @default false
   */
  sideEffects?: boolean
}

const defaultOptions: Required<VitePluginOptions> = {
  inputDir: 'publicTypescript',
  outputDir: '/',
  manifestName: 'manifest',
  hash: true,
  ssrBuild: false,
  esbuildOptions: {},
  sideEffects: false,
}

const cache = new ManifestCache()

let startedFlag = 0

export function publicTypescript(options: VitePluginOptions = {}) {
  const opts = {
    ...defaultOptions,
    ...options,
  }

  let config: ResolvedConfig

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

        cache.setManifestPath(`${opts.inputDir}/${opts.manifestName}.json`)

        setGlobalConfig({
          publicDir: config.publicDir,
          cache,
          filesGlob,
          config,
          ...opts,
        })
      },
      configureServer(server) {
        const { ws } = server

        const watcher = new Watcher(path.resolve(config.root, opts.inputDir), {
          ignoreInitial: true,
          recursive: true,
          renameDetection: true,
          debounce: 0,
          renameTimeout: 0,
        })

        async function handleUnlink(filePath: string) {
          if (isPublicTypescript(filePath)) {
            const fileName = path.parse(filePath).name
            await deleteOldJsFile({ fileName })
            reloadPage(ws)
          }
        }

        async function handleFileAdded(filePath: string) {
          if (isPublicTypescript(filePath)) {
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
      },
      async buildStart() {
        if (opts.ssrBuild || config.build.ssr) return

        if (startedFlag) return
        startedFlag++

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
              cache.setCache({
                key,
                value: parsedCacheJson[key],
              })
            } else {
              deleteOldJsFile({ fileName: key, force: true })
            }
          })
        }

        filesGlob.forEach((f) => {
          build({
            filePath: f,
          })
        })
      },
      async handleHotUpdate(ctx) {
        if (isPublicTypescript(ctx.file)) {
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
