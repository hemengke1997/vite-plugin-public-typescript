import createDebug from 'debug'
import { type BuildResult, type CommonOptions } from 'esbuild'
import path from 'node:path'
import colors from 'picocolors'
import { isDevelopment } from 'std-env'
import { globalConfig } from '../global-config'
import { type GlobalConfig } from '../global-config/global-config-builder'
import { getContentHash, isBoolean, isInTest, pkgName } from '../helper/utils'
import { type BaseCacheProcessor } from '../processor/base-cache-processor'
import { detectBabelPluginMissing, ensureBabelPluginInstalled, esbuildPluginBabel } from './babel'
import { transformEnvToDefine } from './define'

const debug = createDebug('vite-plugin-public-typescript:build ===> ')

type IBuildOptions = {
  filePath: string
  /**
   * @description
   * remix 环境打包时会出现临时文件找不到的情况，所以在探测babel plugin的过程中，把错误忽略掉
   */
  ignoreError?: boolean
} & GlobalConfig

/**
 * Target   Chrome  Safari  Firefox   Edge
 * es2015   49+     10.1+   45+       14+
 * es2016   52+     10.1+   52+       14+
 * es2017   55+     10.1+   52+       15+
 * es2018   60+     11.1+   55+       79+
 * es2019   66+     11.1+   58+       79+
 * es2020   80+     13.1+   72+       80+
 */
const DEFAULT_ESBUILD_TARGET = 'es2015'

export async function esbuildTypescript(buildOptions: IBuildOptions) {
  const { filePath, esbuildOptions, viteConfig, babel, logger, ignoreError = false } = buildOptions

  const { plugins = [], target = DEFAULT_ESBUILD_TARGET, ...rest } = esbuildOptions

  const enableBabel = !!babel

  const define = transformEnvToDefine(viteConfig)

  const filename = path.basename(filePath)

  let babelTarget: string[] = []
  let esbuildTarget: string[] = []
  if (enableBabel) {
    const { default: browserslist } = await import('browserslist')
    babelTarget = browserslist.loadConfig({ path: viteConfig.root }) || []
    if (!babelTarget.length) {
      esbuildTarget = [DEFAULT_ESBUILD_TARGET]
    } else {
      const { default: browserslistToEsbuild } = await import('browserslist-to-esbuild')
      esbuildTarget = browserslistToEsbuild(babelTarget)
    }
  }

  const esbuildPlugins = enableBabel
    ? [
        esbuildPluginBabel(
          isBoolean(babel)
            ? { targets: babelTarget, filename }
            : {
                ...babel,
                targets: babelTarget,
                filename,
              },
        ),
        ...plugins,
      ]
    : plugins

  let res: BuildResult

  try {
    const { build } = await import('esbuild')

    res = await build({
      bundle: true,
      define,
      entryPoints: [filePath],
      platform: 'browser',
      format: 'iife',
      logLevel: 'silent',
      minify: !!viteConfig.build.minify,
      sourcemap: (isDevelopment ? !!viteConfig.build.sourcemap && 'inline' : false) as CommonOptions['sourcemap'],
      splitting: false,
      treeShaking: true,
      write: false,
      plugins: esbuildPlugins,
      target: enableBabel ? esbuildTarget : target,
      ...rest,
    })

    debug('esbuild success:', filename)
  } catch (error) {
    if (error instanceof Error) {
      const babelPluginNotFound = /ERROR: \[plugin: babel\] Cannot find package '(.*)'/
      if (error?.message.match(babelPluginNotFound)) {
        const pluginName = error.message.match(babelPluginNotFound)?.[1]
        const install = await ensureBabelPluginInstalled(pluginName!, viteConfig.root)
        if (!install) {
          logger.error(
            `\n${colors.red(`[${pkgName}]`)} babel plugin '${colors.bold(pluginName)}' not found, please install it\n`,
          )
        }
        !isInTest() && process.exit(1)
      }
    }
    if (!ignoreError) {
      logger.error(colors.red(`[${pkgName}] `) + error)
      !isInTest() && process.exit(1)
    }
  }

  const code = res!.outputFiles?.[0].text

  return code
}

export async function build(options: { filePath: string }, onBuildEnd?: BaseCacheProcessor['onTsBuildEnd']) {
  const { filePath } = options
  const _globalConfig = globalConfig.all

  const originFile = path.basename(filePath, path.extname(filePath))

  let contentHash = ''
  let compiledFileName = originFile

  const code = (await esbuildTypescript({ filePath, ..._globalConfig })) || ''

  if (_globalConfig.hash) {
    contentHash = getContentHash(code, _globalConfig.hash)
    compiledFileName = `${originFile}.${contentHash}`
  }

  debug('before onBuildEnd manifest-cache:', _globalConfig.manifestCache.all)

  await onBuildEnd?.(
    {
      compiledFileName,
      originFile,
      silent: true,
    },
    { code, contentHash, originFile, silent: false },
  )

  debug('after onBuildEnd manifest-cache:', _globalConfig.manifestCache.all)
}

export async function buildAllOnce(tsFilesGlob: string[]) {
  const cacheProcessor = globalConfig.get('cacheProcessor')

  const toBuildList: (() => Promise<void>)[] = []

  for (const file of tsFilesGlob) {
    toBuildList.push(() =>
      build({ filePath: file }, (deleteArgs, addArgs) =>
        cacheProcessor.onTsBuildEnd({ ...deleteArgs, silent: true }, { ...addArgs, silent: true }),
      ),
    )
  }

  await detectBabelPluginMissing()

  await Promise.all(toBuildList.map((fn) => fn()) || [])

  cacheProcessor.manifestCache.writeManifestJSON()
}
