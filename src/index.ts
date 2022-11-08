import path from 'node:path'
import type { PluginOption, ResolvedConfig, TransformOptions } from 'vite'
import { normalizePath, transformWithEsbuild } from 'vite'
import fg from 'fast-glob'
import fs from 'fs-extra'
import { getContentHash } from './utils'
import { ManifestCache } from './utils/manifestCache'

let buildLength = 0
let current = 0

type BuildOptions = {
  filePath: string
  publicDir: string
  cache: ManifestCache
  code?: string
} & VitePluginOptions

function build(options: BuildOptions) {
  const { filePath, publicDir, cache, transformOptions, outputDir, inputDir, manifestName } = options
  const code = options.code || fs.readFileSync(filePath, 'utf-8')
  const fileName = path.basename(filePath, path.extname(filePath))
  transformWithEsbuild(code, fileName, {
    loader: 'ts',
    format: 'esm',
    minify: true,
    platform: 'browser',
    sourcemap: false,
    ...transformOptions,
  }).then(async (res) => {
    let outPath = ''
    if (options.hash) {
      const hash = getContentHash(res.code)
      outPath = normalizePath(`${outputDir}/${fileName}.${hash}.js`)
    } else {
      outPath = normalizePath(`${outputDir}/${fileName}.js`)
    }

    const fp = normalizePath(path.join(publicDir, outPath))
    const oldFiles = fg.sync(normalizePath(path.join(publicDir, `${outputDir}/${fileName}.?(*.)js`)))
    // if exits old files
    if (oldFiles.length) {
      const oldFile = oldFiles.filter((t) => t !== fp)
      // delete old files
      oldFile.forEach(async (f) => {
        if (fs.existsSync(f)) {
          await fs.remove(f)
        }
      })
    }
    await fs.ensureDir(path.dirname(fp))
    await fs.writeFile(fp, res.code)
    cache.setCache({ key: fileName, value: outPath })
    // write cache
    current++
    if (current === buildLength) {
      cache.writeCache(`${inputDir}/${manifestName}.json`)
    }
  })
}

interface VitePluginOptions {
  /**
   * @description vite ssrBuild
   * @see https://vitejs.dev/config/#conditional-config
   */
  ssrBuild?: boolean | undefined
  /**
   * @description input public typescript dir
   * @default publicTypescript
   */
  inputDir?: string
  /**
   * @description output public javascript dir, relative to `publicDir`
   * @default /
   */
  outputDir?: string
  /**
   * @description transformWithEsbuild options
   */
  transformOptions?: TransformOptions | undefined
  /**
   * @description manifest fileName
   * @default manifest
   */
  manifestName?: string
  /**
   * @description whether generate js with hash
   * @default true
   */
  hash?: boolean
}

export function publicTypescript(options: VitePluginOptions): PluginOption {
  const {
    ssrBuild = false,
    inputDir = 'publicTypescript',
    outputDir = '/',
    manifestName = 'manifest',
    hash = true,
  } = options

  let config: ResolvedConfig

  const cache = new ManifestCache()

  return {
    name: 'vite:public-typescript',
    configResolved(c) {
      config = c
    },
    buildStart() {
      if (ssrBuild || config.build.ssr) return
      const outDir = config.publicDir
      const root = config.root
      const files = fg.sync(normalizePath(path.resolve(root, `${inputDir}/*.ts`)), {
        cwd: root,
        absolute: true,
      })

      buildLength = files.length
      files.forEach((f) => {
        build({
          ...options,
          filePath: f,
          publicDir: outDir,
          cache,
          inputDir,
          outputDir,
          hash,
          manifestName,
        })
      })
    },

    async handleHotUpdate(ctx) {
      if (path.extname(ctx.file) === 'ts' && ctx.file.includes(normalizePath(path.resolve(config.root, inputDir)))) {
        const code = await ctx.read()
        build({
          ...options,
          filePath: ctx.file,
          publicDir: config.publicDir,
          cache,
          code,
          inputDir,
          outputDir,
          hash,
          manifestName,
        })
        ctx.server.ws.send({
          type: 'full-reload',
        })
        return []
      }
    },
  }
}
