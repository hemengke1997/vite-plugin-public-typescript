import path from 'node:path'
import type { PluginOption, ResolvedConfig } from 'vite'
import { normalizePath } from 'vite'
import fg from 'fast-glob'
import type { BuildOptions } from 'esbuild'
import Watcher from 'watcher'
import fs from 'fs-extra'
import { build, deleteOldFiles, esbuildTypescript, isPublicTypescript, reloadPage, ts } from './utils'
import { ManifestCache } from './utils/manifestCache'

export interface VitePluginOptions {
  /**
   * @description vite ssrBuild
   * @see https://vitejs.dev/config/#conditional-config
   */
  ssrBuild?: boolean | undefined
  /**
   * @description input public typescript dir
   * @default 'publicTypescript'
   */
  inputDir?: string
  /**
   * @description output public javascript dir, relative to `publicDir`
   * @default /
   */
  outputDir?: string
  /**
   * @description esbuild BuildOptions
   * @see https://esbuild.github.io/api/#build-api
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
   * @default false
   * @see https://esbuild.github.io/api/#tree-shaking-and-side-effects
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

let startedFlag = false

export function publicTypescript(options: VitePluginOptions = {}) {
  const opts = {
    ...defaultOptions,
    ...options,
  }

  let config: ResolvedConfig
  let files: string[]
  let buildLength = 0

  const plugins: PluginOption = [
    {
      name: 'vite:public-typescript',
      configResolved(c) {
        config = c
        const getInputDir = (suffix = '') => normalizePath(path.resolve(config.root, `${opts.inputDir}${suffix}`))
        fs.ensureDirSync(getInputDir())

        files = fg.sync(getInputDir(`/*${ts}`), {
          cwd: config.root,
          absolute: true,
        })

        buildLength = files.length
      },
      configureServer(server) {
        const { ws } = server

        const watcher = new Watcher(path.resolve(config.root, 'publicTypescript'), {
          ignoreInitial: true,
          recursive: true,
          renameDetection: true,
          debounce: 0,
          renameTimeout: 0,
        })

        function _isPublicTypescript(filePath: string) {
          return isPublicTypescript({ filePath, root: config.root, inputDir: opts.inputDir })
        }

        async function handleUnlink(filePath: string) {
          if (_isPublicTypescript(filePath)) {
            const fileName = path.parse(filePath).name
            await deleteOldFiles({ ...opts, publicDir: config.publicDir, fileName, cache })
            reloadPage(ws)
          }
        }

        async function handleFileAdded(filePath: string) {
          if (_isPublicTypescript(filePath)) {
            await build({ ...opts, filePath, publicDir: config.publicDir, cache, buildLength, config })
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
        startedFlag = true

        const manifestPath = `${opts.inputDir}/${opts.manifestName}.json`
        fs.ensureFileSync(manifestPath)
        if (!fs.readFileSync(manifestPath, 'utf-8').length) {
          await cache.writeManifestJSON(manifestPath)
        }

        const outDir = config.publicDir
        files.forEach((f) => {
          build({
            ...opts,
            filePath: f,
            publicDir: outDir,
            cache,
            buildLength,
            config,
          })
        })
      },
      async handleHotUpdate(ctx) {
        if (
          isPublicTypescript({
            filePath: ctx.file,
            inputDir: opts.inputDir,
            root: config.root,
          })
        ) {
          await build({
            ...opts,
            filePath: ctx.file,
            publicDir: config.publicDir,
            cache,
            buildLength,
            config,
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
