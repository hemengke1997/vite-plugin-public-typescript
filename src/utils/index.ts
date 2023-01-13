import { createHash } from 'node:crypto'
import path from 'node:path'
import type { WebSocketServer } from 'vite'
import { normalizePath } from 'vite'
import fg from 'fast-glob'
import fs from 'fs-extra'
import type { BuildResult, Plugin } from 'esbuild'
import { build as esbuild } from 'esbuild'
import type { VitePluginOptions } from '..'
import { name } from '../../package.json'
import type { ManifestCache } from './manifestCache'

export function getContentHash(chunk: string | Uint8Array) {
  return createHash('sha256').update(chunk).digest('hex').substring(0, 8)
}

type BuildOptions = {
  filePath: string
  publicDir: string
  cache: ManifestCache
  buildLength: number
} & Required<VitePluginOptions>

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

export async function esbuildTypescript(options: BuildOptions) {
  const { filePath, esbuildOptions, sideEffects } = options

  const { plugins = [], ...rest } = esbuildOptions

  const esbuildPlugins = sideEffects ? plugins : [noSideEffectsPlugin, ...plugins]

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
      ...rest,
    })
  } catch (e) {
    console.error(`${name} esbuild error:`, e)
    return
  }

  const code = res!.outputFiles?.[0].text

  return code
}

export async function build(options: BuildOptions) {
  const { filePath, publicDir, outputDir } = options

  const fileName = path.basename(filePath, path.extname(filePath))

  const code = await esbuildTypescript(options)

  await deleteOldFiles({
    ...options,
    publicDir,
    fileName,
    outputDir,
  })

  await addJsFile({ ...options, code, fileName })
}

type TDeleteFile = {
  publicDir: string
  outputDir: string
  fileName: string
  cache: ManifestCache
} & Required<VitePluginOptions>

export const ts = '.ts'

export async function deleteOldFiles(args: TDeleteFile) {
  const { publicDir, outputDir, fileName, cache, inputDir, manifestName } = args
  const oldFiles = fg.sync(normalizePath(path.join(publicDir, `${outputDir}/${fileName}.?(*.)js`)))
  // if exits old files
  if (oldFiles.length) {
    // delete old files
    for (const f of oldFiles) {
      if (fs.existsSync(f)) {
        // and modify manifest
        cache.removeCache(fileName)
        cache.writeManifestJSON(`${inputDir}/${manifestName}.json`)
        await fs.remove(f)
      }
    }
  }
}

type TAddFile = {
  code?: string
  fileName: string
  publicDir: string
  cache: ManifestCache
  buildLength: number
} & Required<VitePluginOptions>

let currentBuildTimes = 0
export async function addJsFile(args: TAddFile) {
  const { hash, code = '', outputDir, fileName, publicDir, cache, buildLength, manifestName, inputDir } = args
  let outPath = ''
  if (hash) {
    const hash = getContentHash(code)
    outPath = normalizePath(`${outputDir}/${fileName}.${hash}.js`)
  } else {
    outPath = normalizePath(`${outputDir}/${fileName}.js`)
  }

  const fp = normalizePath(path.join(publicDir, outPath))
  await fs.ensureDir(path.dirname(fp))
  await fs.writeFile(fp, crlf(code))
  cache.setCache({ key: fileName, value: outPath })
  // write cache
  currentBuildTimes++
  if (currentBuildTimes >= buildLength) {
    cache.writeManifestJSON(`${inputDir}/${manifestName}.json`)
  }
}

export function reloadPage(ws: WebSocketServer) {
  ws.send({
    type: 'full-reload',
  })
}

export function isPublicTypescript({ filePath, root, inputDir }: { filePath: string; root: string; inputDir: string }) {
  return path.extname(filePath) === ts && normalizePath(filePath).includes(normalizePath(path.resolve(root, inputDir)))
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
