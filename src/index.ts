import path from 'node:path'
import type { PluginOption, ResolvedConfig } from 'vite'
import { normalizePath } from 'vite'
import fg from 'fast-glob'
import type { BuildOptions } from 'esbuild'
import { ensureDirSync } from 'fs-extra'
import { addJsFile, build, deleteOldFiles, esbuildTypescript, isPublicTypescript, reloadPage, ts } from './utils'
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
      enforce: 'post',

      configResolved(c) {
        config = c

        ensureDirSync(normalizePath(path.resolve(config.root, `${opts.inputDir}`)))

        files = fg.sync(normalizePath(path.resolve(config.root, `${opts.inputDir}/*.ts`)), {
          cwd: config.root,
          absolute: true,
        })

        buildLength = files.length
      },
      configureServer(server) {
        const { watcher, ws } = server

        async function handleUnlink({ filePath }: { filePath: string }) {
          // ts file deleted
          if (isPublicTypescript({ filePath, root: config.root, inputDir: opts.inputDir })) {
            debugger
            const fileName = path.basename(filePath, ts)
            // need to delete js
            await deleteOldFiles({ ...opts, publicDir: config.publicDir, fileName, cache })
            reloadPage(ws)
          }
        }

        watcher.on('unlink', async (f) => {
          handleUnlink({ filePath: f })
        })

        watcher.on('add', async (f) => {
          // ts file added
          if (isPublicTypescript({ filePath: f, root: config.root, inputDir: opts.inputDir! })) {
            handleUnlink({ filePath: f })
            debugger
            const fileName = path.basename(f, ts)
            // need to add js
            await addJsFile({ ...opts, cache, fileName, buildLength, publicDir: config.publicDir })
            reloadPage(ws)
          }
        })
      },
      buildStart() {
        if (opts.ssrBuild || config.build.ssr) return

        if (startedFlag) return
        startedFlag = true

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
