import { createHash } from 'node:crypto'
import path from 'node:path'
import type { WebSocketServer } from 'vite'
import { normalizePath, transformWithEsbuild } from 'vite'

import fg from 'fast-glob'
import fs from 'fs-extra'
import type { VitePluginOptions } from '..'
import type { ManifestCache } from './manifestCache'

export function getContentHash(chunk: string | Uint8Array) {
  return createHash('sha256').update(chunk).digest('hex').substring(0, 8)
}

type BuildOptions = {
  filePath: string
  publicDir: string
  cache: ManifestCache
  code?: string
  buildLength: number
} & Required<VitePluginOptions>

export async function build(options: BuildOptions) {
  const { filePath, publicDir, transformOptions, outputDir } = options
  const code = options.code || fs.readFileSync(filePath, 'utf-8')
  const fileName = path.basename(filePath, path.extname(filePath))
  await transformWithEsbuild(code, fileName, {
    loader: 'ts',
    format: 'esm',
    minify: true,
    platform: 'browser',
    sourcemap: false,
    ...transformOptions,
  }).then(async (res) => {
    await deleteOldFiles({
      ...options,
      publicDir,
      fileName,
      outputDir,
    })

    await addJsFile({ ...options, code: res.code, fileName })
  })
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
        cache.writeCache(`${inputDir}/${manifestName}.json`)
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
  await fs.writeFile(fp, code)
  cache.setCache({ key: fileName, value: outPath })
  // write cache
  currentBuildTimes++
  if (currentBuildTimes >= buildLength) {
    cache.writeCache(`${inputDir}/${manifestName}.json`)
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
