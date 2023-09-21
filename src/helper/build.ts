import path from 'path'
import type { ResolvedConfig } from 'vite'
import type { BuildResult, Plugin } from 'esbuild'
import { build as esbuild } from 'esbuild'
import createDebug from 'debug'
import type { VPPTPluginOptions } from '..'
import { name } from '../../package.json'
import type { BaseCacheProcessor } from '../processor/BaseCacheProcessor'
import { globalConfig } from '../global-config'
import { getContentHash } from './utils'

const debug = createDebug('vite-plugin-public-typescript:build ===> ')

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

function transformEnvToDefine(viteConfig: ResolvedConfig) {
  const importMetaKeys: Record<string, string> = {}
  const defineKeys: Record<string, string> = {}
  const env: Record<string, any> = {
    ...viteConfig.env,
    SSR: !!viteConfig.build.ssr,
  }

  for (const key in env) {
    importMetaKeys[`import.meta.env.${key}`] = JSON.stringify(env[key])
  }

  for (const key in viteConfig.define) {
    const c = viteConfig.define[key]

    defineKeys[key] = typeof c === 'string' ? c : JSON.stringify(viteConfig.define[key])
  }

  return {
    'import.meta.env': JSON.stringify(viteConfig.env),
    'import.meta.hot': 'false',
    ...importMetaKeys,
    ...defineKeys,
  }
}

type IBuildOptions = {
  filePath: string
  viteConfig: ResolvedConfig
} & Required<VPPTPluginOptions>

export async function esbuildTypescript(buildOptions: IBuildOptions) {
  const { filePath, esbuildOptions, sideEffects, viteConfig } = buildOptions

  const { plugins = [], ...rest } = esbuildOptions

  const esbuildPlugins = sideEffects ? plugins : [noSideEffectsPlugin, ...plugins]

  const define = transformEnvToDefine(viteConfig)

  debug('tsFile:', filePath, 'esbuild define:', define)

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

export async function build(options: { filePath: string }, onBuildEnd?: BaseCacheProcessor['onTsBuildEnd']) {
  const { filePath } = options
  const getGlobalConfig = globalConfig.get()

  const originFileName = path.basename(filePath, path.extname(filePath))

  let contentHash = ''
  let compiledFileName = originFileName

  const code = (await esbuildTypescript({ filePath, ...getGlobalConfig })) || ''

  if (getGlobalConfig.hash) {
    contentHash = getContentHash(code, getGlobalConfig.hash)
    compiledFileName = `${originFileName}.${contentHash}`
  }

  debug('before onBuildEnd manifest-cache:', getGlobalConfig.manifestCache.get())

  await onBuildEnd?.(
    {
      compiledFileName,
      originFileName,
      silent: true,
    },
    { contentHash, code, silent: false, originFileName },
  )

  debug('after onBuildEnd manifest-cache:', getGlobalConfig.manifestCache.get())
}

export async function buildAllOnce(tsFilesGlob: string[]) {
  const { cacheProcessor } = globalConfig.get()

  const toBuildList: (() => Promise<void>)[] = []

  for (const file of tsFilesGlob) {
    toBuildList.push(() =>
      build({ filePath: file }, (deleteArgs, addArgs) =>
        cacheProcessor.onTsBuildEnd({ ...deleteArgs, silent: true }, { ...addArgs, silent: true }),
      ),
    )
  }

  await Promise.all(toBuildList.map((fn) => fn()))
  cacheProcessor.manifestCache.writeManifestJSON()
}
