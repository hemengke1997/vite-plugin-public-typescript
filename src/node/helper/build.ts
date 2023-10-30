import createDebug from 'debug'
import { type BuildResult, type Plugin, build as esbuild } from 'esbuild'
import path from 'node:path'
import colors from 'picocolors'
import { type ResolvedConfig } from 'vite'
import { globalConfig } from '../global-config'
import { type BaseCacheProcessor } from '../processor/BaseCacheProcessor'
import { type OptionsTypeWithDefault, getContentHash, pkgName } from './utils'

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

  Object.keys(env).forEach((key) => {
    importMetaKeys[`import.meta.env.${key}`] = JSON.stringify(env[key])
  })

  Object.keys(viteConfig.define || []).forEach((key) => {
    const c = viteConfig.define?.[key]
    defineKeys[key] = typeof c === 'string' ? c : JSON.stringify(viteConfig.define?.[key])
  })

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
} & OptionsTypeWithDefault

export async function esbuildTypescript(buildOptions: IBuildOptions) {
  const { filePath, esbuildOptions, sideEffects, viteConfig } = buildOptions

  const { plugins = [], ...rest } = esbuildOptions

  const esbuildPlugins = sideEffects ? plugins : [noSideEffectsPlugin, ...plugins]

  const define = transformEnvToDefine(viteConfig)

  debug('tsFile:', filePath, 'esbuild define:', define)

  let res: BuildResult
  try {
    res = await esbuild({
      bundle: true,
      define,
      entryPoints: [filePath],
      format: 'iife',
      logLevel: sideEffects ? undefined : 'error',
      minify: true,
      platform: 'browser',
      plugins: esbuildPlugins,
      sourcemap: false,
      splitting: false,
      treeShaking: true,
      write: false,
      ...rest,
    })

    debug('esbuild success:', filePath)
  } catch (error) {
    console.error(colors.red(`[${pkgName}] `), error)
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
    { code, contentHash, originFileName, silent: false },
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
