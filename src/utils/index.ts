import { createHash } from 'node:crypto'
import path from 'node:path'
import type { ResolvedConfig, WebSocketServer } from 'vite'
import { normalizePath } from 'vite'
import fg from 'fast-glob'
import fs from 'fs-extra'
import type { BuildResult, Plugin } from 'esbuild'
import { build as esbuild } from 'esbuild'
import { name } from '../../package.json'
import { getGlobalConfig } from './globalConfig'

export function getContentHash(chunk: string | Uint8Array | undefined) {
  if (!chunk) return ''
  return createHash('sha256').update(chunk).digest('hex').substring(0, 8)
}

interface IBuildOptions {
  filePath: string
}

const noSideEffectsPlugin: Plugin = {
  name: 'no-side-effects',
  setup(build) {
    // https://github.com/evanw/esbuild/issues/1895#issuecomment-1003404929
    build.onResolve({ filter: /.*/ }, async (args) => {
      if (args.pluginData) return

      const { path, ...rest } = args
      rest.pluginData = true
      const result = await build.resolve(path, rest)

      result.sideEffects = false
      return result
    })
  },
}

function transformEnvToDefine(config: ResolvedConfig) {
  const importMetaKeys: Record<string, string> = {}
  const defineKeys: Record<string, string> = {}
  const env: Record<string, any> = {
    ...config.env,
    SSR: !!config.build.ssr,
  }

  for (const key in env) {
    importMetaKeys[`import.meta.env.${key}`] = JSON.stringify(env[key])
  }

  for (const key in config.define) {
    const c = config.define[key]

    defineKeys[key] = typeof c === 'string' ? c : JSON.stringify(config.define[key])
  }

  return {
    'import.meta.env': JSON.stringify(config.env),
    'import.meta.hot': `false`,
    ...importMetaKeys,
    ...defineKeys,
  }
}

export async function esbuildTypescript(buildOptions: IBuildOptions) {
  const { filePath } = buildOptions
  const { esbuildOptions, sideEffects, config: viteResolvedConfig } = getGlobalConfig()

  const { plugins = [], ...rest } = esbuildOptions

  const esbuildPlugins = sideEffects ? plugins : [noSideEffectsPlugin, ...plugins]

  const define = transformEnvToDefine(viteResolvedConfig)

  let res: BuildResult
  try {
    res = await esbuild({
      entryPoints: [filePath],
      write: false,
      platform: 'browser',
      bundle: true,
      format: 'iife',
      sourcemap: false,
      treeShaking: true,
      splitting: false,
      minify: true,
      plugins: esbuildPlugins,
      logLevel: sideEffects ? undefined : 'error',
      define,
      ...rest,
    })
  } catch (e) {
    console.error(`${name} esbuild error:`, e)
    return
  }

  const code = res!.outputFiles?.[0].text

  return code
}

export async function build(options: IBuildOptions) {
  const { filePath } = options
  const { hash } = getGlobalConfig()

  const fileName = path.basename(filePath, path.extname(filePath))
  let contentHash = ''
  let fileNameWithHash = fileName
  const code = await esbuildTypescript(options)

  if (hash) {
    contentHash = getContentHash(code)
    fileNameWithHash = `${fileName}.${contentHash}`
  }

  await deleteOldJsFile({
    fileName,
    jsFileName: fileNameWithHash,
  })

  await addJsFile({ code, fileName, contentHash })
}

interface IDeleteFile {
  fileName: string
  jsFileName?: string
  force?: boolean
}

export const ts = '.ts'

export async function deleteOldJsFile(args: IDeleteFile) {
  const { fileName, jsFileName = '', force = false } = args

  const { publicDir, outputDir, cache } = getGlobalConfig()

  const oldFiles = fg.sync(normalizePath(path.join(publicDir, `${outputDir}/${fileName}.?(*.)js`)))

  if (oldFiles.length) {
    for (const f of oldFiles) {
      if (path.parse(f).name === jsFileName) continue // skip repeat js file
      if (fs.existsSync(f)) {
        if (cache.getCache(fileName) || force) {
          cache.removeCache(fileName)
          await cache.writeManifestJSON()
          fs.removeSync(f)
        }
      }
    }
  }
}

interface IAddFile {
  code?: string
  fileName: string
  contentHash: string
}

let currentBuildTimes = 0
export async function addJsFile(args: IAddFile) {
  const { contentHash, code = '', fileName } = args
  const { publicDir, cache, filesGlob, outputDir } = getGlobalConfig()

  let outPath = normalizePath(`${outputDir}/${fileName}.js`)
  if (contentHash) {
    outPath = normalizePath(`${outputDir}/${fileName}.${contentHash}.js`)
  }

  const fp = normalizePath(path.join(publicDir, outPath))
  await fs.ensureDir(path.dirname(fp))
  await fs.writeFile(fp, crlf(code))
  cache.setCache({ key: fileName, value: outPath })
  currentBuildTimes++
  if (currentBuildTimes >= filesGlob.length) {
    await cache.writeManifestJSON()
  }
}

export function reloadPage(ws: WebSocketServer) {
  ws.send({
    type: 'full-reload',
  })
}

export function isPublicTypescript(filePath: string) {
  const { config, inputDir } = getGlobalConfig()
  return (
    path.extname(filePath) === ts &&
    normalizePath(filePath).includes(normalizePath(path.resolve(config.root, inputDir)))
  )
}

export function crlf(text: string) {
  const CRLF = '\r\n'
  const R_CRLF = /\r\n|\r(?!\n)|\n/g
  return text.replace(R_CRLF, CRLF)
}

export function eq<T extends Record<string, string>>(obj1: T, obj2: T): boolean {
  if (!obj1 || !obj2) return false

  const keys = Object.keys(obj1)
  if (keys.length !== Object.keys(obj2).length) return false

  return keys.every((k) => obj1[k] === obj2[k])
}

export function isEmptyObject(o: unknown) {
  return typeof o === 'object' && o !== null && Object.keys(o).length === 0
}
