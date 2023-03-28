import path from 'path'
import type { ResolvedConfig } from 'vite'
import { normalizePath } from 'vite'
import glob from 'tiny-glob'
import fs from 'fs-extra'
import type { BuildResult, Plugin } from 'esbuild'
import { build as esbuild } from 'esbuild'
import type { VPPTPluginOptions } from '..'
import { name } from '../../package.json'
import { getGlobalConfig } from './globalConfig'
import { assert } from './assert'
import { debug, getContentHash, writeFile } from '.'

const noSideEffectsPlugin: Plugin = {
  name: 'no-side-effects',
  setup(build) {
    // https://github.com/evanw/esbuild/issues/1895#issuecomment-1003404929
    build.onResolve({ filter: /.*/ }, async (args) => {
      if (args.pluginData) {
        return
      }

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
    'import.meta.hot': 'false',
    ...importMetaKeys,
    ...defineKeys,
  }
}

type IBuildOptions = {
  filePath: string
  config: ResolvedConfig
} & Required<VPPTPluginOptions>

export async function esbuildTypescript(buildOptions: IBuildOptions) {
  const { filePath, esbuildOptions, sideEffects, config } = buildOptions

  const { plugins = [], ...rest } = esbuildOptions

  const esbuildPlugins = sideEffects ? plugins : [noSideEffectsPlugin, ...plugins]

  const define = transformEnvToDefine(config)

  debug('esbuild define:', define)

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

    debug('esbuild success:', filePath)
  } catch (e) {
    console.error(`[${name}]`, e)
    return
  }

  const code = res!.outputFiles?.[0].text

  return code
}

export async function build(options: { filePath: string }) {
  const { filePath } = options
  const globalConfig = getGlobalConfig()

  const fileName = path.basename(filePath, path.extname(filePath))

  let contentHash = ''
  let fileNameWithHash = fileName

  const code = await esbuildTypescript({ filePath, ...globalConfig })

  if (globalConfig.hash) {
    contentHash = getContentHash(code, globalConfig.hash)
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

export async function deleteOldJsFile(args: IDeleteFile) {
  const { fileName, jsFileName = '', force = false } = args

  const {
    outputDir,
    cache,
    config: { publicDir },
  } = getGlobalConfig()

  const oldFiles = await glob(normalizePath(path.join(publicDir, `${outputDir}/${fileName}.?(*.)js`)))

  debug('deleteOldJsFile - oldFiles:', oldFiles)

  assert(Array.isArray(oldFiles))

  if (oldFiles.length) {
    for (const f of oldFiles) {
      if (path.parse(f).name === jsFileName) {
        debug('deleteOldJsFile - skip file:', jsFileName)
        continue
      } // skip repeat js file
      if (fs.existsSync(f)) {
        if (cache.getCache(fileName) || force) {
          cache.removeCache(fileName)
          debug('deleteOldJsFile - cache removed:', fileName)
          fs.remove(f)
          debug('deleteOldJsFile -file removed:', f)
        }
      }
    }
  } else if (force) {
    cache.removeCache(fileName)
    debug('cache force removed:', fileName)
  }
}

interface IAddFile {
  code?: string
  fileName: string
  contentHash: string
}

export async function addJsFile(args: IAddFile) {
  const { contentHash, code = '', fileName } = args
  const {
    cache,
    outputDir,
    config: { publicDir },
  } = getGlobalConfig()

  let outPath = normalizePath(`${outputDir}/${fileName}.js`)
  if (contentHash) {
    outPath = normalizePath(`${outputDir}/${fileName}.${contentHash}.js`)
  }

  const fp = normalizePath(path.join(publicDir, outPath))
  await fs.ensureDir(path.dirname(fp))
  writeFile(fp, code)
  cache.setCache({ key: fileName, value: outPath })

  debug('addJsFile cache seted:', fileName, outPath)
}
